import * as THREE from 'three';
import type { FabricPreset, GarmentSilhouette } from '../types/garment';

export interface GarmentUniforms {
  uFrontMap: { value: THREE.Texture };
  uBackMap: { value: THREE.Texture };
  uHasFront: { value: number };
  uHasBack: { value: number };
  uGarmentBounds: { value: THREE.Vector4 }; // minX, maxX, minY, maxY
  uDecalBounds: { value: THREE.Vector4 }; // minX, maxX, minY, maxY
  uFabricColor: { value: THREE.Color };
  uProjectionMode: { value: number }; // 0 = full photo, 1 = decal
  uIsInterior: { value: number }; // 0 = shell, 1 = dark inner neck
}

export interface SilhouetteMetrics {
  torsoHalfWidth: number;
  waistFactor: number;
  torsoDepth: number;
  hemY: number;
  shoulderY: number;
  neckTopY: number;
  neckRadius: number;
  sleeveLength: number;
  sleeveAngle: number; // radians downward from horizontal
  sleeveStartRadius: number;
  sleeveEndRadius: number;
  hasHood: boolean;
  hasPocket: boolean;
  bounds: THREE.Vector4; // minX, maxX, minY, maxY for full photo projection
  decalBounds: THREE.Vector4;
}

export function getSilhouetteMetrics(silhouette: GarmentSilhouette): SilhouetteMetrics {
  switch (silhouette) {
    case 'classic':
      return {
        torsoHalfWidth: 0.47,
        waistFactor: 0.93,
        torsoDepth: 0.175,
        hemY: -0.84,
        shoulderY: 0.72,
        neckTopY: 0.85,
        neckRadius: 0.19,
        sleeveLength: 0.37,
        sleeveAngle: 0.56,
        sleeveStartRadius: 0.145,
        sleeveEndRadius: 0.115,
        hasHood: false,
        hasPocket: false,
        bounds: new THREE.Vector4(-0.80, 0.80, -0.85, 0.86),
        decalBounds: new THREE.Vector4(-0.42, 0.42, -0.62, 0.64),
      };
    case 'longsleeve':
      return {
        torsoHalfWidth: 0.52,
        waistFactor: 0.97,
        torsoDepth: 0.19,
        hemY: -0.86,
        shoulderY: 0.71,
        neckTopY: 0.86,
        neckRadius: 0.195,
        sleeveLength: 0.86,
        sleeveAngle: 0.94,
        sleeveStartRadius: 0.165,
        sleeveEndRadius: 0.088,
        hasHood: false,
        hasPocket: false,
        bounds: new THREE.Vector4(-0.98, 0.98, -0.87, 0.87),
        decalBounds: new THREE.Vector4(-0.46, 0.46, -0.64, 0.64),
      };
    case 'hoodie':
      return {
        torsoHalfWidth: 0.57,
        waistFactor: 0.96,
        torsoDepth: 0.22,
        hemY: -0.88,
        shoulderY: 0.71,
        neckTopY: 0.84,
        neckRadius: 0.22,
        sleeveLength: 0.84,
        sleeveAngle: 0.92,
        sleeveStartRadius: 0.185,
        sleeveEndRadius: 0.095,
        hasHood: true,
        hasPocket: true,
        bounds: new THREE.Vector4(-1.02, 1.02, -0.89, 1.04),
        decalBounds: new THREE.Vector4(-0.46, 0.46, -0.56, 0.62),
      };
    case 'oversized':
    default:
      return {
        torsoHalfWidth: 0.55,
        waistFactor: 1.0,
        torsoDepth: 0.195,
        hemY: -0.88,
        shoulderY: 0.71,
        neckTopY: 0.86,
        neckRadius: 0.20,
        sleeveLength: 0.44,
        sleeveAngle: 0.66,
        sleeveStartRadius: 0.17,
        sleeveEndRadius: 0.14,
        hasHood: false,
        hasPocket: false,
        bounds: new THREE.Vector4(-0.93, 0.93, -0.89, 0.87),
        decalBounds: new THREE.Vector4(-0.46, 0.46, -0.64, 0.62),
      };
  }
}

export function createGarmentShellMaterial(
  uniforms: GarmentUniforms,
  normalMap: THREE.Texture,
  fabricPreset: FabricPreset,
  isInterior = false
): THREE.MeshPhysicalMaterial {
  const presetConfig = {
    'matte-jersey': { roughness: 0.88, sheen: 0.32, sheenRoughness: 0.75, normalScale: 0.35 },
    'heavy-terry': { roughness: 0.94, sheen: 0.42, sheenRoughness: 0.85, normalScale: 0.58 },
    'vintage-wash': { roughness: 0.92, sheen: 0.22, sheenRoughness: 0.9, normalScale: 0.46 },
    'silky-interlock': { roughness: 0.66, sheen: 0.55, sheenRoughness: 0.45, normalScale: 0.22 },
  }[fabricPreset];

  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: isInterior ? 0.95 : presetConfig.roughness,
    metalness: 0.0,
    sheen: isInterior ? 0.1 : presetConfig.sheen,
    sheenRoughness: presetConfig.sheenRoughness,
    sheenColor: new THREE.Color(0xfafafa),
    normalMap,
    normalScale: new THREE.Vector2(presetConfig.normalScale, presetConfig.normalScale),
    side: THREE.DoubleSide,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uFrontMap = uniforms.uFrontMap;
    shader.uniforms.uBackMap = uniforms.uBackMap;
    shader.uniforms.uHasFront = uniforms.uHasFront;
    shader.uniforms.uHasBack = uniforms.uHasBack;
    shader.uniforms.uGarmentBounds = uniforms.uGarmentBounds;
    shader.uniforms.uDecalBounds = uniforms.uDecalBounds;
    shader.uniforms.uFabricColor = uniforms.uFabricColor;
    shader.uniforms.uProjectionMode = uniforms.uProjectionMode;
    shader.uniforms.uIsInterior = { value: isInterior ? 1.0 : 0.0 };

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vShirtLocalPos;
        varying vec3 vShirtLocalNorm;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vShirtLocalPos = position;
        vShirtLocalNorm = normalize(normal);`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vShirtLocalPos;
        varying vec3 vShirtLocalNorm;
        uniform sampler2D uFrontMap;
        uniform sampler2D uBackMap;
        uniform float uHasFront;
        uniform float uHasBack;
        uniform vec4 uGarmentBounds;
        uniform vec4 uDecalBounds;
        uniform vec3 uFabricColor;
        uniform float uProjectionMode;
        uniform float uIsInterior;`
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        vec3 baseCol = uFabricColor;
        if (uIsInterior > 0.5) {
          // Subtle ambient occlusion inside collar cavity
          float depthShade = clamp(0.62 + (vShirtLocalPos.y - 0.55) * 0.55, 0.42, 0.78);
          diffuseColor.rgb = baseCol * depthShade;
        } else {
          vec4 b = uProjectionMode > 0.5 ? uDecalBounds : uGarmentBounds;
          float uFront = (vShirtLocalPos.x - b.x) / max(0.001, (b.y - b.x));
          float uBack  = 1.0 - uFront;
          float vTex   = (vShirtLocalPos.y - b.z) / max(0.001, (b.w - b.z));

          vec3 frontCol = baseCol;
          if (uHasFront > 0.5 && uFront >= 0.0 && uFront <= 1.0 && vTex >= 0.0 && vTex <= 1.0) {
            vec4 fSample = texture2D(uFrontMap, vec2(uFront, vTex));
            frontCol = mix(baseCol, fSample.rgb, fSample.a);
          }

          vec3 backCol = baseCol;
          if (uHasBack > 0.5 && uBack >= 0.0 && uBack <= 1.0 && vTex >= 0.0 && vTex <= 1.0) {
            vec4 bSample = texture2D(uBackMap, vec2(uBack, vTex));
            backCol = mix(baseCol, bSample.rgb, bSample.a);
          }

          // Smooth seam blending at side gussets (|normal.z| near 0)
          float nz = vShirtLocalNorm.z;
          float fWeight = smoothstep(-0.04, 0.22, nz) * step(-0.03, vShirtLocalPos.z);
          float bWeight = smoothstep(0.04, -0.22, nz) * step(vShirtLocalPos.z, 0.03);
          float seamWeight = clamp(1.0 - fWeight - bWeight, 0.0, 1.0);

          vec3 projected = frontCol * fWeight + backCol * bWeight + baseCol * seamWeight;
          diffuseColor.rgb = projected;
        }`
      );
  };

  mat.customProgramCacheKey = () =>
    `atelier360-garment-${isInterior ? 'inner' : 'outer'}`;

  return mat;
}

/**
 * Superellipse cross-section helper for realistic chest/back torso volume
 * with softly rounded side gussets.
 */
function superEllipse(theta: number, rx: number, rz: number): [number, number] {
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const exp = 0.84;
  const x = Math.sign(cosT) * Math.pow(Math.abs(cosT), exp) * rx;
  const z = Math.sign(sinT) * Math.pow(Math.abs(sinT), 0.95) * rz;
  return [x, z];
}

function buildTorsoGeometry(m: SilhouetteMetrics): THREE.BufferGeometry {
  const uSegs = 96;
  const vSegs = 56;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iv = 0; iv <= vSegs; iv++) {
    const t = iv / vSegs; // 0 = hem, 1 = shoulder/neck top
    const waistCurve =
      1 - (1 - m.waistFactor) * Math.sin(Math.min(1, t / 0.65) * Math.PI);
    const rx = m.torsoHalfWidth * waistCurve * (t > 0.85 ? 1 - (t - 0.85) * 0.25 : 1);

    // Chest swell around t=0.66, tapering gently toward shoulder line
    const chestBoost = Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.88) * 0.045;
    const topTaper = t > 0.82 ? 1 - ((t - 0.82) / 0.18) * 0.42 : 1;
    const rz = (m.torsoDepth + chestBoost) * topTaper;

    for (let iu = 0; iu <= uSegs; iu++) {
      const u = iu / uSegs;
      const theta = u * Math.PI * 2; // 0 = +X, PI/2 = +Z (front), PI = -X, 3PI/2 = -Z (back)

      let [x, z] = superEllipse(theta, rx, rz);

      // Subtle vertical fabric drape ripples along torso
      const drapeAmp = 0.0085 * (1 - t * 0.65) * (0.4 + 0.6 * Math.abs(Math.sin(theta)));
      const drape =
        Math.sin(theta * 6.0 + t * 2.2) * drapeAmp +
        Math.cos(theta * 11.0 - t * 1.4) * (drapeAmp * 0.35);
      z += Math.sign(Math.sin(theta)) * drape * 0.65;
      x += Math.cos(theta) * drape * 0.25;

      // Top contour: neck scoop in center, shoulder slope on sides
      const absX = Math.abs(x);
      let topY: number;
      if (absX < m.neckRadius) {
        const nr = absX / m.neckRadius;
        const neckCurve = Math.pow(nr, 1.75);
        const isFront = z >= 0;
        const scoopDepth = isFront ? 0.20 : 0.075;
        topY = m.neckTopY - scoopDepth * (1 - neckCurve);
      } else {
        const sr = Math.min(1, (absX - m.neckRadius) / Math.max(0.05, m.torsoHalfWidth - m.neckRadius));
        topY = m.neckTopY - (m.neckTopY - m.shoulderY) * Math.pow(sr, 1.1);
      }

      // Slight natural hem curve (front & back slightly lower than side seams)
      const hemCurve = m.hemY - 0.022 * Math.abs(Math.sin(theta));
      let y = hemCurve + (topY - hemCurve) * t;

      // Subtle raised hem rib ridge at bottom 3%
      if (t < 0.03) {
        const hemLift = Math.sin((t / 0.03) * Math.PI) * 0.006;
        z += Math.sin(theta) * hemLift;
        x += Math.cos(theta) * hemLift;
      }

      positions.push(x, y, z);
      uvs.push(u, t);
    }
  }

  for (let iv = 0; iv < vSegs; iv++) {
    for (let iu = 0; iu < uSegs; iu++) {
      const a = iv * (uSegs + 1) + iu;
      const b = a + uSegs + 1;
      const c = a + 1;
      const d = b + 1;
      indices.push(a, b, c);
      indices.push(c, b, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildSleeveGeometry(m: SilhouetteMetrics, side: 1 | -1): THREE.BufferGeometry {
  const uSegs = 44;
  const vSegs = 28;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Anchor slightly inside torso shoulder for seamless armscye overlap
  const startX = side * (m.torsoHalfWidth - 0.055);
  const startY = m.shoulderY - m.sleeveStartRadius * 0.68;

  for (let iv = 0; iv <= vSegs; iv++) {
    const s = iv / vSegs; // 0 = armscye, 1 = sleeve cuff
    const dist = s * m.sleeveLength;

    // Gentle gravity arc along sleeve length
    const curveDrop = Math.pow(s, 1.45) * 0.06;
    const cx = startX + side * Math.cos(m.sleeveAngle) * dist;
    const cy = startY - Math.sin(m.sleeveAngle) * dist - curveDrop;

    // Taper radius with subtle fabric fold & cuff ridge
    let radY = THREE.MathUtils.lerp(m.sleeveStartRadius, m.sleeveEndRadius, Math.pow(s, 0.85));
    let radZ = radY * 0.78;

    // Ribbed cuff constriction on long sleeve & hoodie
    if ((m.hasHood || m.sleeveLength > 0.7) && s > 0.88) {
      const cuffT = (s - 0.88) / 0.12;
      const pinch = Math.sin(cuffT * Math.PI) * 0.012 + cuffT * 0.016;
      radY -= pinch;
      radZ -= pinch * 0.8;
    }

    // Rotate sleeve cross-section perpendicular to sleeve axis
    const tangentX = side * Math.cos(m.sleeveAngle);
    const tangentY = -Math.sin(m.sleeveAngle);
    const perpX = -side * tangentY;
    const perpY = side * tangentX;

    for (let iu = 0; iu <= uSegs; iu++) {
      const u = iu / uSegs;
      const phi = u * Math.PI * 2;
      const localR = Math.cos(phi) * radY;
      const localZ = Math.sin(phi) * radZ;

      // Subtle underarm & bicep drape wave
      const wave = Math.sin(phi * 4 + s * 3) * 0.004 * (1 - s * 0.4);

      const x = cx + perpX * (localR + wave);
      const y = cy + perpY * (localR + wave);
      const z = localZ + Math.sin(phi) * wave;

      positions.push(x, y, z);
      uvs.push(u, s);
    }
  }

  for (let iv = 0; iv < vSegs; iv++) {
    for (let iu = 0; iu < uSegs; iu++) {
      const a = iv * (uSegs + 1) + iu;
      const b = a + uSegs + 1;
      const c = a + 1;
      const d = b + 1;
      if (side === 1) {
        indices.push(a, c, b);
        indices.push(c, d, b);
      } else {
        indices.push(a, b, c);
        indices.push(c, b, d);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildCollarRingGeometry(m: SilhouetteMetrics): THREE.BufferGeometry {
  const pathSegs = 64;
  const tubeSegs = 16;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const tubeRadius = m.hasHood ? 0.026 : 0.022;
  const rzNeck = m.torsoDepth * 0.62;

  for (let i = 0; i <= pathSegs; i++) {
    const u = i / pathSegs;
    const theta = u * Math.PI * 2;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    const cx = cosT * m.neckRadius;
    const cz = sinT * rzNeck;
    const scoop = sinT >= 0 ? 0.20 : 0.075;
    const cy = m.neckTopY - scoop * Math.pow(Math.max(0, Math.abs(sinT)), 1.4) + 0.008;

    // Outward normal in XZ plane
    const nx = cosT;
    const nz = sinT;

    for (let j = 0; j <= tubeSegs; j++) {
      const v = j / tubeSegs;
      const phi = v * Math.PI * 2;
      const radialOffset = Math.cos(phi) * tubeRadius;
      const vertOffset = Math.sin(phi) * tubeRadius * 1.15;

      positions.push(
        cx + nx * radialOffset,
        cy + vertOffset,
        cz + nz * radialOffset
      );
      uvs.push(u * 4, v);
    }
  }

  for (let i = 0; i < pathSegs; i++) {
    for (let j = 0; j < tubeSegs; j++) {
      const a = i * (tubeSegs + 1) + j;
      const b = a + tubeSegs + 1;
      const c = a + 1;
      const d = b + 1;
      indices.push(a, b, c);
      indices.push(c, b, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildNeckInteriorGeometry(m: SilhouetteMetrics): THREE.BufferGeometry {
  const uSegs = 48;
  const vSegs = 14;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const rzNeck = m.torsoDepth * 0.62;

  for (let iv = 0; iv <= vSegs; iv++) {
    const t = iv / vSegs; // 0 = collar rim, 1 = deep interior floor
    const shrink = 1 - t * 0.85;
    for (let iu = 0; iu <= uSegs; iu++) {
      const u = iu / uSegs;
      const theta = u * Math.PI * 2;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      const scoop = sinT >= 0 ? 0.20 : 0.075;
      const rimY = m.neckTopY - scoop * Math.pow(Math.max(0, Math.abs(sinT)), 1.4);
      const deepY = m.neckTopY - 0.30;

      const x = cosT * (m.neckRadius - 0.008) * shrink;
      const z = sinT * (rzNeck - 0.008) * shrink;
      const y = THREE.MathUtils.lerp(rimY, deepY, Math.pow(t, 0.85));

      positions.push(x, y, z);
      uvs.push(u, t);
    }
  }

  for (let iv = 0; iv < vSegs; iv++) {
    for (let iu = 0; iu < uSegs; iu++) {
      const a = iv * (uSegs + 1) + iu;
      const b = a + uSegs + 1;
      const c = a + 1;
      const d = b + 1;
      indices.push(a, b, c);
      indices.push(c, b, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildHoodieHoodGeometry(m: SilhouetteMetrics): THREE.BufferGeometry {
  const uSegs = 36;
  const vSegs = 24;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let iv = 0; iv <= vSegs; iv++) {
    const v = iv / vSegs; // 0 = base collar, 1 = hood crown/back fold
    const hoodY = m.neckTopY - 0.03 + Math.sin(v * Math.PI * 0.72) * 0.23;
    const hoodBackZ = -0.06 - Math.pow(v, 0.9) * 0.22;
    const halfW = m.neckRadius * (1.02 - v * 0.28);

    for (let iu = 0; iu <= uSegs; iu++) {
      const u = iu / uSegs;
      const angle = (u - 0.5) * Math.PI * 1.15;
      const x = Math.sin(angle) * halfW;
      const z = hoodBackZ + Math.cos(angle) * 0.14 * (1 - v * 0.55);
      const y = hoodY - (1 - Math.cos(angle)) * 0.04;

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  for (let iv = 0; iv < vSegs; iv++) {
    for (let iu = 0; iu < uSegs; iu++) {
      const a = iv * (uSegs + 1) + iu;
      const b = a + uSegs + 1;
      const c = a + 1;
      const d = b + 1;
      indices.push(a, b, c);
      indices.push(c, b, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildHoodiePocketGeometry(m: SilhouetteMetrics): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const topW = 0.20;
  const botW = 0.28;
  const botY = m.hemY + 0.14;
  const topY = m.hemY + 0.44;
  const midY = m.hemY + 0.27;

  shape.moveTo(-botW, botY);
  shape.lineTo(botW, botY);
  shape.lineTo(botW, midY);
  shape.lineTo(topW, topY);
  shape.lineTo(-topW, topY);
  shape.lineTo(-botW, midY);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.016,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 4,
  });

  // Curve pocket gently around front torso curvature
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const t = (y - m.hemY) / (m.shoulderY - m.hemY);
    const rz = m.torsoDepth + Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.88) * 0.045;
    const xNorm = Math.min(0.95, Math.abs(x) / m.torsoHalfWidth);
    const frontCurveZ = Math.sqrt(Math.max(0.05, 1 - Math.pow(xNorm, 1.7))) * rz;
    pos.setZ(i, frontCurveZ + z - 0.004);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

export interface BuiltGarmentAssembly {
  group: THREE.Group;
  dispose: () => void;
}

/**
 * Builds a composite 5-to-7 part 3D garment group (torso, left sleeve, right sleeve,
 * ribbed collar ring, hollow neck lining, optional hood/pocket, and hem woven label).
 */
export function buildGarmentAssembly(
  silhouette: GarmentSilhouette,
  shellMaterial: THREE.MeshPhysicalMaterial,
  collarMaterial: THREE.MeshPhysicalMaterial,
  interiorMaterial: THREE.MeshPhysicalMaterial
): BuiltGarmentAssembly {
  const m = getSilhouetteMetrics(silhouette);
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const extraMaterials: THREE.Material[] = [];

  // 1. Primary Torso Shell
  const torsoGeo = buildTorsoGeometry(m);
  geometries.push(torsoGeo);
  const torsoMesh = new THREE.Mesh(torsoGeo, shellMaterial);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  torsoMesh.name = 'torso';
  group.add(torsoMesh);

  // 2 & 3. Left & Right Contoured Sleeves
  const leftSleeveGeo = buildSleeveGeometry(m, -1);
  const rightSleeveGeo = buildSleeveGeometry(m, 1);
  geometries.push(leftSleeveGeo, rightSleeveGeo);

  const leftSleeve = new THREE.Mesh(leftSleeveGeo, shellMaterial);
  leftSleeve.castShadow = true;
  leftSleeve.receiveShadow = true;
  leftSleeve.name = 'sleeve-left';
  group.add(leftSleeve);

  const rightSleeve = new THREE.Mesh(rightSleeveGeo, shellMaterial);
  rightSleeve.castShadow = true;
  rightSleeve.receiveShadow = true;
  rightSleeve.name = 'sleeve-right';
  group.add(rightSleeve);

  // 4. Ribbed Crew Collar Ring
  const collarGeo = buildCollarRingGeometry(m);
  geometries.push(collarGeo);
  const collarMesh = new THREE.Mesh(collarGeo, collarMaterial);
  collarMesh.castShadow = true;
  collarMesh.receiveShadow = true;
  collarMesh.name = 'collar';
  group.add(collarMesh);

  // 5. Inner Neck Cavity Lining
  const innerNeckGeo = buildNeckInteriorGeometry(m);
  geometries.push(innerNeckGeo);
  const innerNeckMesh = new THREE.Mesh(innerNeckGeo, interiorMaterial);
  innerNeckMesh.receiveShadow = true;
  innerNeckMesh.name = 'neck-interior';
  group.add(innerNeckMesh);

  // 6. Double-Stitched Bottom Hem Trim Band
  const hemPoints: THREE.Vector3[] = [];
  const hemSegs = 64;
  for (let i = 0; i <= hemSegs; i++) {
    const theta = (i / hemSegs) * Math.PI * 2;
    const [hx, hz] = superEllipse(theta, m.torsoHalfWidth + 0.004, m.torsoDepth + 0.004);
    const hy = m.hemY - 0.022 * Math.abs(Math.sin(theta)) + 0.012;
    hemPoints.push(new THREE.Vector3(hx, hy, hz));
  }
  const hemCurve = new THREE.CatmullRomCurve3(hemPoints, true);
  const hemGeo = new THREE.TubeGeometry(hemCurve, 64, 0.009, 8, true);
  geometries.push(hemGeo);
  const hemMesh = new THREE.Mesh(hemGeo, shellMaterial);
  hemMesh.castShadow = true;
  hemMesh.receiveShadow = true;
  hemMesh.name = 'hem-trim';
  group.add(hemMesh);

  // 7. Hoodie Hood & Kangaroo Pocket (when hoodie silhouette active)
  if (m.hasHood) {
    const hoodGeo = buildHoodieHoodGeometry(m);
    geometries.push(hoodGeo);
    const hoodMesh = new THREE.Mesh(hoodGeo, shellMaterial);
    hoodMesh.castShadow = true;
    hoodMesh.receiveShadow = true;
    hoodMesh.name = 'hood';
    group.add(hoodMesh);
  }
  if (m.hasPocket) {
    const pocketGeo = buildHoodiePocketGeometry(m);
    geometries.push(pocketGeo);
    const pocketMesh = new THREE.Mesh(pocketGeo, shellMaterial);
    pocketMesh.castShadow = true;
    pocketMesh.receiveShadow = true;
    pocketMesh.name = 'kangaroo-pocket';
    group.add(pocketMesh);
  }

  return {
    group,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      extraMaterials.forEach((mat) => mat.dispose());
    },
  };
}
