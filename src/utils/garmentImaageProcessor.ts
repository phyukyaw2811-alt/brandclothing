import type { ImageCalibration, ProjectionMode } from '../types/garment';

export interface ProcessedGarmentTexture {
  canvas: HTMLCanvasElement;
  detectedBaseColor: string;
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  if (imageCache.has(src)) {
    return imageCache.get(src)!;
  }
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => {
      imageCache.delete(src);
      reject(err);
    };
    img.src = src;
  });
  imageCache.set(src, promise);
  return promise;
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Processes an uploaded or sample garment image onto a normalized 1024x1024 RGBA canvas.
 * - Supports optional cropBox (for splitting a combined front+back sheet).
 * - Performs edge-connected flood-fill background removal when `removeBg` is enabled,
 *   preserving interior colors (e.g. white shirt on grey studio backdrop, or interior graphics).
 * - Computes tight bounding box of the garment in Full Photo mode so front & back align
 *   accurately onto the 3D garment silhouette.
 * - Auto-samples dominant interior fabric color for seamless side seams.
 */
export async function processGarmentImage(
  src: string,
  calibration: ImageCalibration,
  mode: ProjectionMode,
  fallbackColor: string
): Promise<ProcessedGarmentTexture> {
  const img = await loadImageElement(src);
  const SIZE = 1024;

  const crop = calibration.cropBox ?? { x: 0, y: 0, w: 1, h: 1 };
  const sx = Math.max(0, Math.floor(crop.x * img.naturalWidth));
  const sy = Math.max(0, Math.floor(crop.y * img.naturalHeight));
  const sw = Math.max(1, Math.floor(crop.w * img.naturalWidth));
  const sh = Math.max(1, Math.floor(crop.h * img.naturalHeight));

  // Working canvas at moderate resolution for fast flood-fill
  const workMax = 512;
  const aspect = sw / sh;
  const workW = aspect >= 1 ? workMax : Math.max(64, Math.round(workMax * aspect));
  const workH = aspect >= 1 ? Math.max(64, Math.round(workMax / aspect)) : workMax;

  const workCanvas = document.createElement('canvas');
  workCanvas.width = workW;
  workCanvas.height = workH;
  const wCtx = workCanvas.getContext('2d', { willReadFrequently: true })!;
  wCtx.drawImage(img, sx, sy, sw, sh, 0, 0, workW, workH);

  const imgData = wCtx.getImageData(0, 0, workW, workH);
  const data = imgData.data;

  // Check if image already has significant transparency
  let transparentCount = 0;
  for (let i = 0; i < data.length; i += 16) {
    if (data[i + 3] < 200) transparentCount++;
  }
  const hasNativeAlpha = transparentCount > (workW * workH) / 64;

  let minX = workW;
  let minY = workH;
  let maxX = 0;
  let maxY = 0;

  if (calibration.removeBg && !hasNativeAlpha) {
    // Sample edge pixels to find studio backdrop color
    const cornerSamples: [number, number, number][] = [];
    const samplePts = [
      [2, 2],
      [workW - 3, 2],
      [2, workH - 3],
      [workW - 3, workH - 3],
      [Math.floor(workW * 0.5), 2],
      [Math.floor(workW * 0.5), workH - 3],
    ];
    for (const [px, py] of samplePts) {
      const idx = (py * workW + px) * 4;
      if (data[idx + 3] > 200) {
        cornerSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
      }
    }

    if (cornerSamples.length > 0) {
      // Median-like average of corner samples
      const bgR = cornerSamples.reduce((s, c) => s + c[0], 0) / cornerSamples.length;
      const bgG = cornerSamples.reduce((s, c) => s + c[1], 0) / cornerSamples.length;
      const bgB = cornerSamples.reduce((s, c) => s + c[2], 0) / cornerSamples.length;

      const tol = calibration.bgTolerance;
      const tolSq = tol * tol * 3;
      const softTolSq = (tol + 16) * (tol + 16) * 3;

      const visited = new Uint8Array(workW * workH);
      const isBg = new Uint8Array(workW * workH);
      const queue = new Int32Array(workW * workH);
      let head = 0;
      let tail = 0;

      const tryPush = (x: number, y: number) => {
        if (x < 0 || x >= workW || y < 0 || y >= workH) return;
        const p = y * workW + x;
        if (visited[p]) return;
        visited[p] = 1;
        const idx = p * 4;
        const dr = data[idx] - bgR;
        const dg = data[idx + 1] - bgG;
        const db = data[idx + 2] - bgB;
        const distSq = dr * dr + dg * dg + db * db;
        if (distSq <= tolSq) {
          isBg[p] = 1;
          queue[tail++] = p;
        }
      };

      // Seed flood-fill from all 4 outer edges
      for (let x = 0; x < workW; x++) {
        tryPush(x, 0);
        tryPush(x, workH - 1);
      }
      for (let y = 0; y < workH; y++) {
        tryPush(0, y);
        tryPush(workW - 1, y);
      }

      while (head < tail) {
        const p = queue[head++];
        const x = p % workW;
        const y = (p - x) / workW;
        tryPush(x + 1, y);
        tryPush(x - 1, y);
        tryPush(x, y + 1);
        tryPush(x, y - 1);
      }

      // Apply transparency & gentle edge feathering on boundary pixels
      for (let y = 0; y < workH; y++) {
        for (let x = 0; x < workW; x++) {
          const p = y * workW + x;
          const idx = p * 4;
          if (isBg[p]) {
            data[idx + 3] = 0;
          } else {
            // Check 4-neighbors for soft anti-aliased transition
            const nearBg =
              (x > 0 && isBg[p - 1]) ||
              (x < workW - 1 && isBg[p + 1]) ||
              (y > 0 && isBg[p - workW]) ||
              (y < workH - 1 && isBg[p + workW]);
            if (nearBg) {
              const dr = data[idx] - bgR;
              const dg = data[idx + 1] - bgG;
              const db = data[idx + 2] - bgB;
              const distSq = dr * dr + dg * dg + db * db;
              if (distSq < softTolSq) {
                const factor = Math.max(0, (distSq - tolSq * 0.4) / (softTolSq - tolSq * 0.4));
                data[idx + 3] = Math.round(data[idx + 3] * Math.min(1, factor));
              }
            }
            if (data[idx + 3] > 60) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
      }
    }
  } else {
    // Compute bounding box from non-transparent pixels
    for (let y = 0; y < workH; y++) {
      for (let x = 0; x < workW; x++) {
        const idx = (y * workW + x) * 4;
        if (data[idx + 3] > 30) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
  }

  // Fallback if bounding box failed
  if (maxX <= minX || maxY <= minY) {
    minX = 0;
    minY = 0;
    maxX = workW - 1;
    maxY = workH - 1;
  }

  // Sample median/dominant fabric color near chest/shoulder/hem interior
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let sampleCount = 0;
  const boxW = maxX - minX;
  const boxH = maxY - minY;
  const probeZones = [
    [0.24, 0.45],
    [0.76, 0.45],
    [0.28, 0.72],
    [0.72, 0.72],
    [0.5, 0.85],
  ];
  for (const [zx, zy] of probeZones) {
    const px = Math.min(workW - 1, Math.max(0, Math.round(minX + boxW * zx)));
    const py = Math.min(workH - 1, Math.max(0, Math.round(minY + boxH * zy)));
    const idx = (py * workW + px) * 4;
    if (data[idx + 3] > 200) {
      rSum += data[idx];
      gSum += data[idx + 1];
      bSum += data[idx + 2];
      sampleCount++;
    }
  }
  const detectedBaseColor =
    sampleCount > 0 ? rgbToHex(rSum / sampleCount, gSum / sampleCount, bSum / sampleCount) : fallbackColor;

  wCtx.putImageData(imgData, 0, 0);

  // Now render high-res cropped region onto final 1024x1024 RGBA texture canvas
  const outCanvas = document.createElement('canvas');
  outCanvas.width = SIZE;
  outCanvas.height = SIZE;
  const oCtx = outCanvas.getContext('2d')!;
  oCtx.clearRect(0, 0, SIZE, SIZE);

  if (mode === 'full-photo') {
    // Map tight garment bounding box from original high-res image, masked by workCanvas alpha!
    const normMinX = minX / workW;
    const normMinY = minY / workH;
    const normW = Math.max(0.05, (maxX - minX + 1) / workW);
    const normH = Math.max(0.05, (maxY - minY + 1) / workH);

    const hiSx = sx + normMinX * sw;
    const hiSy = sy + normMinY * sh;
    const hiSw = normW * sw;
    const hiSh = normH * sh;

    // Create high-res alpha-masked garment cutout
    const cutCanvas = document.createElement('canvas');
    cutCanvas.width = SIZE;
    cutCanvas.height = SIZE;
    const cutCtx = cutCanvas.getContext('2d')!;

    // Draw original full-resolution cropped shirt first
    cutCtx.drawImage(img, hiSx, hiSy, hiSw, hiSh, 0, 0, SIZE, SIZE);

    if (calibration.removeBg && !hasNativeAlpha) {
      // Mask using our flood-filled workCanvas alpha channel
      const alphaCanvas = document.createElement('canvas');
      alphaCanvas.width = SIZE;
      alphaCanvas.height = SIZE;
      const aCtx = alphaCanvas.getContext('2d')!;
      aCtx.drawImage(
        workCanvas,
        minX,
        minY,
        maxX - minX + 1,
        maxY - minY + 1,
        0,
        0,
        SIZE,
        SIZE
      );
      cutCtx.globalCompositeOperation = 'destination-in';
      cutCtx.drawImage(alphaCanvas, 0, 0);
      cutCtx.globalCompositeOperation = 'source-over';
    }

    // Apply user framing calibration (scale, offsetX, offsetY)
    oCtx.save();
    oCtx.translate(
      SIZE * 0.5 + calibration.offsetX * SIZE,
      SIZE * 0.5 - calibration.offsetY * SIZE
    );
    oCtx.scale(calibration.scale, calibration.scale);
    oCtx.drawImage(cutCanvas, -SIZE * 0.5, -SIZE * 0.5, SIZE, SIZE);
    oCtx.restore();
  } else {
    // Graphic Decal Mode: place uploaded graphic nicely on the chest/back area
    const decalScale = calibration.scale * 0.44;
    const imgAspect = sw / sh;
    const drawW = imgAspect >= 1 ? SIZE * decalScale : SIZE * decalScale * imgAspect;
    const drawH = imgAspect >= 1 ? (SIZE * decalScale) / imgAspect : SIZE * decalScale;

    oCtx.save();
    oCtx.translate(
      SIZE * 0.5 + calibration.offsetX * SIZE,
      SIZE * 0.42 - calibration.offsetY * SIZE
    );
    if (calibration.removeBg && !hasNativeAlpha) {
      oCtx.drawImage(
        workCanvas,
        minX,
        minY,
        maxX - minX + 1,
        maxY - minY + 1,
        -drawW * 0.5,
        -drawH * 0.5,
        drawW,
        drawH
      );
    } else {
      oCtx.drawImage(img, sx, sy, sw, sh, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
    }
    oCtx.restore();
  }

  return {
    canvas: outCanvas,
    detectedBaseColor,
  };
}

/**
 * Compresses an uploaded File to a crisp max-1600px DataURL for fast processing & storage.
 */
export function fileToDataUrl(file: File, maxDim = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const rawUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        if (img.naturalWidth <= maxDim && img.naturalHeight <= maxDim && file.size < 1_500_000) {
          resolve(rawUrl);
          return;
        }
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        // Preserve PNG transparency if PNG, else crisp WebP/JPEG
        const isPng = file.type === 'image/png';
        resolve(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.92));
      };
      img.src = rawUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Generates procedural transparent graphic artwork DataURLs for curated starter templates
 * (ensures zero external URLs and zero 404s).
 */
export function generateSampleArtworkDataUrl(
  variant: 'monolith-front' | 'monolith-back' | 'kintsugi-front' | 'kintsugi-back'
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 768;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 768, 768);

  if (variant === 'monolith-front') {
    // Minimal architectural chest mark on dark charcoal tee
    ctx.strokeStyle = '#E4E4E7';
    ctx.lineWidth = 4;
    ctx.strokeRect(210, 220, 348, 348);
    ctx.fillStyle = '#E4E4E7';
    ctx.fillRect(250, 260, 72, 268);
    ctx.fillStyle = '#A1A1AA';
    ctx.font = '600 32px Outfit, sans-serif';
    ctx.fillText('MONOLITH', 345, 340);
    ctx.font = '400 20px "JetBrains Mono", monospace';
    ctx.fillText('ATELIER · 04', 345, 382);
    ctx.fillText('310 GSM', 345, 416);
  } else if (variant === 'monolith-back') {
    // Bold geometric architectural back print
    ctx.fillStyle = '#F4F4F5';
    ctx.font = '700 62px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FORM FOLLOWS', 384, 150);
    ctx.fillText('SILENCE', 384, 215);

    // Brutalist steps graphic
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `rgba(244, 244, 245, ${0.95 - i * 0.12})`;
      const w = 420 - i * 52;
      ctx.fillRect(384 - w / 2, 270 + i * 54, w, 38);
    }

    ctx.fillStyle = '#A1A1AA';
    ctx.font = '500 22px "JetBrains Mono", monospace';
    ctx.fillText('ARCHITECTURAL ARCHIVE EDITION · TOKYO / YANGON', 384, 650);
  } else if (variant === 'kintsugi-front') {
    ctx.strokeStyle = '#FDE68A';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(384, 360, 140, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(280, 310);
    ctx.lineTo(360, 365);
    ctx.lineTo(410, 330);
    ctx.lineTo(485, 420);
    ctx.stroke();

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '600 28px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KINTSUGI STUDIO', 384, 560);
  } else {
    ctx.strokeStyle = '#FBBF24';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(384, 340, 210, 0, Math.PI * 2);
    ctx.stroke();

    // Gold seam fracture lines
    ctx.beginPath();
    ctx.moveTo(210, 250);
    ctx.lineTo(330, 320);
    ctx.lineTo(370, 280);
    ctx.lineTo(460, 390);
    ctx.lineTo(560, 440);
    ctx.stroke();

    ctx.fillStyle = '#F8FAFC';
    ctx.font = '700 54px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('REPAIRED IN GOLD', 384, 635);
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '400 22px "JetBrains Mono", monospace';
    ctx.fillText('HEAVYWEIGHT FRENCH TERRY · 440 GSM', 384, 680);
  }

  return canvas.toDataURL('image/png');
}
