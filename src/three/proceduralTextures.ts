import * as THREE from 'three';

/**
 * Generates a tileable cotton knit weave normal map procedurally on an HTML5 Canvas.
 * Kept in linear color space (NoColorSpace) as required for normal maps.
 */
export function createCottonNormalTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const imgData = ctx.createImageData(size, size);
  const d = imgData.data;

  // Interlocking jersey knit micro-pattern + organic cotton slub noise
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const u = (x / size) * Math.PI * 2 * 32;
      const v = (y / size) * Math.PI * 2 * 32;

      // V-shaped jersey knit stitch derivatives
      const chevron = Math.sin(u + Math.sin(v) * 0.45);
      const course = Math.cos(v * 0.85);
      const slub = (Math.sin(x * 0.37 + y * 0.13) + Math.cos(y * 0.41 - x * 0.19)) * 0.15;

      const nx = Math.max(-1, Math.min(1, chevron * 0.28 + slub));
      const ny = Math.max(-1, Math.min(1, course * 0.24 - slub * 0.5));
      const nz = Math.sqrt(Math.max(0.01, 1 - nx * nx - ny * ny));

      d[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      d[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      d[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      d[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(9, 9);
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates a ribbed knit normal map for collar, cuffs, and hoodie waistband.
 */
export function createRibbedNormalTexture(maxAnisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(size, size);
  const d = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const rib = Math.sin((x / size) * Math.PI * 2 * 24);
      const knit = Math.cos((y / size) * Math.PI * 2 * 18) * 0.15;
      const nx = rib * 0.52;
      const ny = knit;
      const nz = Math.sqrt(Math.max(0.01, 1 - nx * nx - ny * ny));

      d[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      d[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      d[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      d[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 1);
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates a soft radial contact shadow texture to ground the garment in studio space.
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    size * 0.04,
    size * 0.5,
    size * 0.5,
    size * 0.48
  );
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.36)');
  grad.addColorStop(0.45, 'rgba(0, 0, 0, 0.16)');
  grad.addColorStop(0.75, 'rgba(0, 0, 0, 0.04)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * 1x1 neutral fallback texture to avoid WebGL incomplete texture warnings before async image load.
 */
export function createEmptyPlaceholderTexture(): THREE.DataTexture {
  const data = new Uint8Array([255, 255, 255, 0]);
  const tex = new THREE.DataTexture(data, 1, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
