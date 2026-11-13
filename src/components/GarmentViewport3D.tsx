import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import type {
  BackdropTheme,
  GarmentItem,
  GarmentSilhouette,
  Language,
} from '../types/garment';
import { TRANSLATIONS } from '../i18n/translations';
import {
  buildGarmentAssembly,
  createGarmentShellMaterial,
  getSilhouetteMetrics,
  type BuiltGarmentAssembly,
  type GarmentUniforms,
} from '../three/garmentGeometry';
import {
  createContactShadowTexture,
  createCottonNormalTexture,
  createEmptyPlaceholderTexture,
  createRibbedNormalTexture,
} from '../three/proceduralTextures';
import { processGarmentImage } from '../utils/garmentImageProcessor';

export interface GarmentViewportHandle {
  captureFrontAndBackSnapshots: () => Promise<{
    frontDataUrl: string | null;
    backDataUrl: string | null;
  }>;
  captureCurrentSnapshot: () => string | null;
}

interface GarmentViewport3DProps {
  garment: GarmentItem;
  backdrop: BackdropTheme;
  onBackdropChange: (b: BackdropTheme) => void;
  onSilhouetteChange: (s: GarmentSilhouette) => void;
  onDetectedBaseColor?: (hex: string) => void;
  language: Language;
}

const BACKDROP_CONFIG: Record<
  BackdropTheme,
  { hex: number; css: string; label: string; isDark: boolean }
> = {
  concrete: { hex: 0x92959a, css: '#92959a', label: 'Concrete', isDark: false },
  chalk: { hex: 0xededeb, css: '#ededeb', label: 'Chalk', isDark: false },
  obsidian: { hex: 0x16171a, css: '#16171a', label: 'Obsidian', isDark: true },
  sand: { hex: 0xe6dfd5, css: '#e6dfd5', label: 'Sand', isDark: false },
};

// Pre-allocated math helpers outside render loop (zero GC)
const _offsetVec = new THREE.Vector3();
const _spherical = new THREE.Spherical();

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export const GarmentViewport3D = React.forwardRef<
  GarmentViewportHandle,
  GarmentViewport3DProps
>(function GarmentViewport3D(
  {
    garment,
    backdrop,
    onBackdropChange,
    onSilhouetteChange,
    language,
  },
  ref
) {
  const t = TRANSLATIONS[language];
  const mountRef = useRef<HTMLDivElement>(null);

  const [autoSpin, setAutoSpin] = useState(true);
  const [spinSpeed, setSpinSpeed] = useState(0.55);
  const [angleDeg, setAngleDeg] = useState(25);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  // Mutable refs accessed by Three.js loop without tearing down WebGL context
  const autoSpinRef = useRef(autoSpin);
  autoSpinRef.current = autoSpin;
  const spinSpeedRef = useRef(spinSpeed);
  spinSpeedRef.current = spinSpeed;

  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    uniforms: GarmentUniforms;
    cottonNormal: THREE.CanvasTexture;
    ribNormal: THREE.CanvasTexture;
    placeholderTex: THREE.DataTexture;
    frontTex: THREE.CanvasTexture | null;
    backTex: THREE.CanvasTexture | null;
    assembly: BuiltGarmentAssembly | null;
    garmentRoot: THREE.Group;
    shellMaterial: THREE.MeshPhysicalMaterial;
    collarMaterial: THREE.MeshPhysicalMaterial;
    interiorMaterial: THREE.MeshPhysicalMaterial;
    requestRender: () => void;
    snapToAngle: (azimuthRad: number, polarRad?: number) => void;
    isSoftwareGl: boolean;
  } | null>(null);

  // Initialize Three.js scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
      });
    } catch {
      setContextLost(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    const initBg = BACKDROP_CONFIG[backdrop].hex;
    scene.background = new THREE.Color(initBg);
    scene.fog = new THREE.Fog(initBg, 6.5, 16);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 40);
    camera.position.set(1.15, 0.22, 2.95);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, -0.02, 0);
    controls.enablePan = false;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 1.65;
    controls.maxDistance = 5.4;
    controls.minPolarAngle = Math.PI * 0.22;
    controls.maxPolarAngle = Math.PI * 0.72;
    controls.update();

    // 3-Point Warm/Cool Studio Lighting Rig (<= 1 shadow caster)
    const hemiLight = new THREE.HemisphereLight(0xf3f6fc, 0xcfd2d8, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ec, 1.35);
    keyLight.position.set(2.4, 3.6, 3.2);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 12;
    keyLight.shadow.camera.left = -2.2;
    keyLight.shadow.camera.right = 2.2;
    keyLight.shadow.camera.top = 2.2;
    keyLight.shadow.camera.bottom = -2.2;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe6efff, 0.55);
    fillLight.position.set(-2.8, 1.2, 2.2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.72);
    rimLight.position.set(-1.6, 2.4, -3.2);
    scene.add(rimLight);

    // Subtle grounded contact shadow + studio turntable ring
    const shadowTex = createContactShadowTexture();
    const shadowGeo = new THREE.PlaneGeometry(2.35, 2.35);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.45,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -1.03;
    scene.add(shadowPlane);

    const turntableGeo = new THREE.RingGeometry(0.62, 0.635, 72);
    const turntableMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const turntableRing = new THREE.Mesh(turntableGeo, turntableMat);
    turntableRing.rotation.x = -Math.PI / 2;
    turntableRing.position.y = -1.015;
    scene.add(turntableRing);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const cottonNormal = createCottonNormalTexture(maxAniso);
    const ribNormal = createRibbedNormalTexture(maxAniso);
    const placeholderTex = createEmptyPlaceholderTexture();

    const metrics = getSilhouetteMetrics(garment.silhouette);
    const uniforms: GarmentUniforms = {
      uFrontMap: { value: placeholderTex },
      uBackMap: { value: placeholderTex },
      uHasFront: { value: 0 },
      uHasBack: { value: 0 },
      uGarmentBounds: { value: metrics.bounds.clone() },
      uDecalBounds: { value: metrics.decalBounds.clone() },
      uFabricColor: { value: new THREE.Color(garment.baseColor) },
      uProjectionMode: { value: garment.projectionMode === 'graphic-decal' ? 1 : 0 },
      uIsInterior: { value: 0 },
    };

    const shellMaterial = createGarmentShellMaterial(
      uniforms,
      cottonNormal,
      garment.fabricPreset,
      false
    );
    const collarMaterial = createGarmentShellMaterial(
      uniforms,
      ribNormal,
      garment.fabricPreset,
      false
    );
    const interiorMaterial = createGarmentShellMaterial(
      uniforms,
      cottonNormal,
      garment.fabricPreset,
      true
    );

    const garmentRoot = new THREE.Group();
    scene.add(garmentRoot);

    const assembly = buildGarmentAssembly(
      garment.silhouette,
      shellMaterial,
      collarMaterial,
      interiorMaterial
    );
    garmentRoot.add(assembly.group);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Camera transition state & animation loop
    let frameId = 0;
    let disposed = false;
    let renderBusy = false;
    let renderDirty = false;
    let lastUiAngle = -1;

    const transition = {
      active: false,
      targetAzimuth: 0,
      targetPolar: Math.PI * 0.46,
    };

    const clock = new THREE.Clock();

    function updateAngleReadout() {
      _offsetVec.copy(camera.position).sub(controls.target);
      const az = Math.atan2(_offsetVec.x, _offsetVec.z);
      let deg = Math.round(THREE.MathUtils.radToDeg(az));
      if (deg < 0) deg += 360;
      if (deg !== lastUiAngle) {
        lastUiAngle = deg;
        setAngleDeg(deg);
      }
    }

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function stepFrame() {
      if (disposed) return;
      renderDirty = false;
      const delta = Math.min(clock.getDelta(), 0.1);

      if (transition.active) {
        _offsetVec.copy(camera.position).sub(controls.target);
        _spherical.setFromVector3(_offsetVec);

        // Shortest angular distance
        let diff = transition.targetAzimuth - _spherical.theta;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        _spherical.theta = THREE.MathUtils.damp(
          _spherical.theta,
          _spherical.theta + diff,
          8,
          delta
        );
        _spherical.phi = THREE.MathUtils.damp(
          _spherical.phi,
          transition.targetPolar,
          8,
          delta
        );

        _offsetVec.setFromSpherical(_spherical);
        camera.position.copy(controls.target).add(_offsetVec);
        camera.lookAt(controls.target);

        if (
          Math.abs(diff) < 0.004 &&
          Math.abs(_spherical.phi - transition.targetPolar) < 0.004
        ) {
          transition.active = false;
        }
      } else if (autoSpinRef.current) {
        _offsetVec.copy(camera.position).sub(controls.target);
        _spherical.setFromVector3(_offsetVec);
        _spherical.theta += delta * spinSpeedRef.current * 0.85;
        _offsetVec.setFromSpherical(_spherical);
        camera.position.copy(controls.target).add(_offsetVec);
        camera.lookAt(controls.target);
      }

      controls.update();
      updateAngleReadout();
      renderer.render(scene, camera);

      const done = () => {
        renderBusy = false;
        if (disposed) return;
        if (autoSpinRef.current || transition.active || renderDirty) {
          requestRender();
        }
      };

      if (isSoftwareGl) {
        afterDraw(done);
      } else {
        done();
      }
    }

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(stepFrame);
    }

    function snapToAngle(azimuthRad: number, polarRad = Math.PI * 0.46) {
      setAutoSpin(false);
      autoSpinRef.current = false;
      transition.targetAzimuth = azimuthRad;
      transition.targetPolar = polarRad;
      transition.active = true;
      clock.getDelta();
      requestRender();
    }

    const onControlsStart = () => {
      transition.active = false;
      setAutoSpin(false);
      autoSpinRef.current = false;
    };

    const onControlsChange = () => {
      updateAngleReadout();
      requestRender();
    };

    controls.addEventListener('start', onControlsStart);
    controls.addEventListener('change', onControlsChange);

    const resizeObserver = new ResizeObserver(() => {
      if (!container || disposed) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });
    resizeObserver.observe(container);

    sceneRef.current = {
      renderer,
      scene,
      camera,
      controls,
      uniforms,
      cottonNormal,
      ribNormal,
      placeholderTex,
      frontTex: null,
      backTex: null,
      assembly,
      garmentRoot,
      shellMaterial,
      collarMaterial,
      interiorMaterial,
      requestRender,
      snapToAngle,
      isSoftwareGl,
    };

    // Initial render kick
    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlsStart);
      controls.removeEventListener('change', onControlsChange);
      controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);

      const state = sceneRef.current;
      if (state) {
        state.assembly?.dispose();
        state.frontTex?.dispose();
        state.backTex?.dispose();
        state.shellMaterial.dispose();
        state.collarMaterial.dispose();
        state.interiorMaterial.dispose();
      }
      shadowGeo.dispose();
      shadowMat.dispose();
      shadowTex.dispose();
      turntableGeo.dispose();
      turntableMat.dispose();
      cottonNormal.dispose();
      ribNormal.dispose();
      placeholderTex.dispose();
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
    };
  }, []);

  // Kick render loop when autoSpin toggles back on
  useEffect(() => {
    if (autoSpin && sceneRef.current) {
      sceneRef.current.requestRender();
    }
  }, [autoSpin]);

  // Update Studio Backdrop & Fog dynamically
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    const cfg = BACKDROP_CONFIG[backdrop];
    s.scene.background = new THREE.Color(cfg.hex);
    if (s.scene.fog instanceof THREE.Fog) {
      s.scene.fog.color.setHex(cfg.hex);
    }
    s.requestRender();
  }, [backdrop]);

  // Rebuild geometry & material preset when silhouette or fabricPreset changes
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;

    const metrics = getSilhouetteMetrics(garment.silhouette);
    s.uniforms.uGarmentBounds.value.copy(metrics.bounds);
    s.uniforms.uDecalBounds.value.copy(metrics.decalBounds);

    const oldAssembly = s.assembly;
    if (oldAssembly) {
      s.garmentRoot.remove(oldAssembly.group);
      oldAssembly.dispose();
    }

    const oldShell = s.shellMaterial;
    const oldCollar = s.collarMaterial;
    const oldInterior = s.interiorMaterial;

    const newShell = createGarmentShellMaterial(
      s.uniforms,
      s.cottonNormal,
      garment.fabricPreset,
      false
    );
    const newCollar = createGarmentShellMaterial(
      s.uniforms,
      s.ribNormal,
      garment.fabricPreset,
      false
    );
    const newInterior = createGarmentShellMaterial(
      s.uniforms,
      s.cottonNormal,
      garment.fabricPreset,
      true
    );

    const newAssembly = buildGarmentAssembly(
      garment.silhouette,
      newShell,
      newCollar,
      newInterior
    );
    s.garmentRoot.add(newAssembly.group);
    s.assembly = newAssembly;
    s.shellMaterial = newShell;
    s.collarMaterial = newCollar;
    s.interiorMaterial = newInterior;

    oldShell.dispose();
    oldCollar.dispose();
    oldInterior.dispose();
    s.requestRender();
  }, [garment.silhouette, garment.fabricPreset]);

  // Update scalar uniforms (baseColor, projectionMode)
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.uniforms.uFabricColor.value.set(garment.baseColor);
    s.uniforms.uProjectionMode.value = garment.projectionMode === 'graphic-decal' ? 1 : 0;
    s.requestRender();
  }, [garment.baseColor, garment.projectionMode]);

  // Process & upload Front and Back textures when images or calibrations change
  useEffect(() => {
    let cancelled = false;
    const s = sceneRef.current;
    if (!s) return;

    const maxAniso = s.renderer.capabilities.getMaxAnisotropy();

    const loadSide = async (
      src: string | null,
      cal: GarmentItem['frontCalibration'],
      side: 'front' | 'back'
    ) => {
      if (!src) {
        if (side === 'front') {
          s.uniforms.uHasFront.value = 0;
          s.uniforms.uFrontMap.value = s.placeholderTex;
          s.frontTex?.dispose();
          s.frontTex = null;
        } else {
          s.uniforms.uHasBack.value = 0;
          s.uniforms.uBackMap.value = s.placeholderTex;
          s.backTex?.dispose();
          s.backTex = null;
        }
        s.requestRender();
        return;
      }

      try {
        const result = await processGarmentImage(
          src,
          cal,
          garment.projectionMode,
          garment.baseColor
        );
        if (cancelled || !sceneRef.current) return;

        const tex = new THREE.CanvasTexture(result.canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = maxAniso;
        tex.needsUpdate = true;

        if (side === 'front') {
          s.frontTex?.dispose();
          s.frontTex = tex;
          s.uniforms.uFrontMap.value = tex;
          s.uniforms.uHasFront.value = 1;
        } else {
          s.backTex?.dispose();
          s.backTex = tex;
          s.uniforms.uBackMap.value = tex;
          s.uniforms.uHasBack.value = 1;
        }
        s.requestRender();
      } catch {
        // Leave placeholder on invalid image
      }
    };

    loadSide(garment.frontImage, garment.frontCalibration, 'front');
    loadSide(garment.backImage, garment.backCalibration, 'back');

    return () => {
      cancelled = true;
    };
  }, [
    garment.frontImage,
    garment.backImage,
    garment.frontCalibration,
    garment.backCalibration,
    garment.projectionMode,
    garment.baseColor,
  ]);

  // Keyboard shortcut 'H' to toggle Cinema / Zen Mode dock
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key.toLowerCase() === 'h') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Expose synchronous render-and-capture methods for PNG snapshots & Spec Sheet
  useImperativeHandle(ref, () => ({
    captureCurrentSnapshot: () => {
      const s = sceneRef.current;
      if (!s) return null;
      s.renderer.render(s.scene, s.camera);
      return s.renderer.domElement.toDataURL('image/png');
    },
    captureFrontAndBackSnapshots: async () => {
      const s = sceneRef.current;
      if (!s) return { frontDataUrl: null, backDataUrl: null };
      const savedPos = s.camera.position.clone();
      const savedTarget = s.controls.target.clone();
      const dist = savedPos.distanceTo(savedTarget) || 3.1;

      s.controls.target.set(0, -0.02, 0);
      s.camera.position.set(0, 0.14, dist);
      s.camera.lookAt(s.controls.target);
      s.renderer.render(s.scene, s.camera);
      const frontDataUrl = s.renderer.domElement.toDataURL('image/png');

      s.camera.position.set(0, 0.14, -dist);
      s.camera.lookAt(s.controls.target);
      s.renderer.render(s.scene, s.camera);
      const backDataUrl = s.renderer.domElement.toDataURL('image/png');

      s.camera.position.copy(savedPos);
      s.controls.target.copy(savedTarget);
      s.camera.lookAt(s.controls.target);
      s.requestRender();

      return { frontDataUrl, backDataUrl };
    },
  }));

  const handleDownloadSnapshot = () => {
    const s = sceneRef.current;
    if (!s) return;
    s.renderer.render(s.scene, s.camera);
    const url = s.renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(garment.sku || garment.name || 'garment').toLowerCase().replace(/\s+/g, '-')}-360.png`;
    a.click();
  };

  const bgIsDark = BACKDROP_CONFIG[backdrop].isDark;

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none"
      style={{ backgroundColor: BACKDROP_CONFIG[backdrop].css }}
    >
      {/* Isolated WebGL mount container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* WebGL fallback if context lost */}
      {contextLost && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#18191c] text-white p-6 text-center">
          <p className="font-display text-lg font-semibold mb-2">
            3D Viewport Unavailable
          </p>
          <p className="text-sm text-zinc-400 max-w-md mb-4">
            WebGL rendering context was interrupted. Previewing uploaded front and back
            garment plates below.
          </p>
          <div className="flex gap-4">
            {garment.frontImage && (
              <img
                src={garment.frontImage}
                alt={`${garment.name} front`}
                referrerPolicy="no-referrer"
                className="w-40 h-48 object-contain bg-white/5 rounded-lg p-2"
              />
            )}
            {garment.backImage && (
              <img
                src={garment.backImage}
                alt={`${garment.name} back`}
                referrerPolicy="no-referrer"
                className="w-40 h-48 object-contain bg-white/5 rounded-lg p-2"
              />
            )}
          </div>
        </div>
      )}

      {/* Minimal Top-Left Garment Title Overlay (non-obtrusive, semantic DOM) */}
      <div className="pointer-events-none absolute top-4 left-5 z-10 max-w-[60%]">
        <div
          className={`text-xs font-medium tracking-wide ${
            bgIsDark ? 'text-zinc-400' : 'text-zinc-700'
          }`}
        >
          <span>{garment.brand || 'ATELIER'}</span>
          {garment.collection && (
            <>
              <span className="mx-1.5" aria-hidden="true">
                ·
              </span>
              <span>{garment.collection}</span>
            </>
          )}
        </div>
        <h2
          className={`font-display text-lg sm:text-xl font-semibold tracking-tight truncate ${
            bgIsDark ? 'text-white' : 'text-zinc-950'
          }`}
        >
          {garment.name}
        </h2>
      </div>

      {/* Top-Right Compact Degree & Orbit Hint */}
      <div className="pointer-events-none absolute top-4 right-5 z-10 flex items-center gap-3">
        <span
          className={`hidden sm:inline text-xs ${
            bgIsDark ? 'text-zinc-400' : 'text-zinc-700'
          }`}
        >
          {t.dragHint}
        </span>
        <span
          className={`font-mono text-xs font-medium px-2.5 py-1 rounded-md border ${
            bgIsDark
              ? 'bg-black/45 text-zinc-100 border-white/15'
              : 'bg-white/80 text-zinc-900 border-black/10'
          }`}
        >
          {String(angleDeg).padStart(3, '0')}°
        </span>
      </div>

      {/* Collapsible Bottom Control Dock (Zero Viewport Occlusion, No backdrop-blur over WebGL) */}
      <div
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center transition-transform duration-200 ease-out w-[min(780px,94%)] ${
          dockCollapsed ? 'translate-y-[calc(100%-26px)]' : 'translate-y-0'
        }`}
      >
        {/* Dock Collapse / Expand Handle */}
        <button
          type="button"
          onClick={() => setDockCollapsed((c) => !c)}
          aria-expanded={!dockCollapsed}
          className="flex items-center gap-1.5 px-3 py-1 rounded-t-lg text-[11px] font-medium bg-[#18181b]/90 text-zinc-200 border border-b-0 border-white/15 hover:bg-[#18181b] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>{t.showControls}</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>{t.hideControls}</span>
            </>
          )}
        </button>

        {/* Main Solid/Semi-Opaque Dock Bar (No backdrop-blur) */}
        <div className="w-full rounded-xl bg-[#16171a]/92 border border-white/12 shadow-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs text-zinc-100">
          {/* Play/Pause Spin + Speed */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setAutoSpin((s) => !s)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                autoSpin
                  ? 'bg-white text-zinc-950'
                  : 'bg-white/10 text-zinc-100 hover:bg-white/18'
              }`}
            >
              {autoSpin ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{t.autoSpin}</span>
            </button>
            <input
              type="range"
              min={0.15}
              max={1.6}
              step={0.05}
              value={spinSpeed}
              aria-label={t.spinSpeed}
              onChange={(e) => setSpinSpeed(parseFloat(e.target.value))}
              className="w-16 accent-white cursor-pointer hidden sm:block"
            />
          </div>

          {/* Camera Angle Presets */}
          <div className="flex items-center gap-1 bg-white/8 p-1 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => sceneRef.current?.snapToAngle(0, Math.PI * 0.47)}
              className="px-2.5 py-1 rounded-md hover:bg-white/15 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.viewFront}
            </button>
            <button
              type="button"
              onClick={() => sceneRef.current?.snapToAngle(Math.PI * 0.5, Math.PI * 0.47)}
              className="px-2.5 py-1 rounded-md hover:bg-white/15 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.viewSide}
            </button>
            <button
              type="button"
              onClick={() => sceneRef.current?.snapToAngle(Math.PI, Math.PI * 0.47)}
              className="px-2.5 py-1 rounded-md hover:bg-white/15 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {t.viewBack}
            </button>
            <button
              type="button"
              onClick={() => sceneRef.current?.snapToAngle(0.42, Math.PI * 0.44)}
              className="px-2.5 py-1 rounded-md hover:bg-white/15 transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1"
              title="Reset 3/4 Hero View"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden md:inline">{t.viewHero}</span>
            </button>
          </div>

          {/* Silhouette Quick Switch */}
          <div className="hidden lg:flex items-center gap-1 bg-white/8 p-1 rounded-lg shrink-0">
            {(['oversized', 'classic', 'longsleeve', 'hoodie'] as GarmentSilhouette[]).map(
              (sil) => (
                <button
                  key={sil}
                  type="button"
                  onClick={() => onSilhouetteChange(sil)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    garment.silhouette === sil
                      ? 'bg-white text-zinc-950'
                      : 'text-zinc-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {sil === 'oversized'
                    ? 'Boxy'
                    : sil === 'classic'
                      ? 'Classic'
                      : sil === 'longsleeve'
                        ? 'Long'
                        : 'Hoodie'}
                </button>
              )
            )}
          </div>

          {/* Studio Backdrop Swatches & Snapshot */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-1.5" role="group" aria-label={t.backdrop}>
              {(Object.keys(BACKDROP_CONFIG) as BackdropTheme[]).map((key) => {
                const cfg = BACKDROP_CONFIG[key];
                const active = backdrop === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onBackdropChange(key)}
                    title={cfg.label}
                    aria-label={cfg.label}
                    className={`w-5 h-5 rounded-full border transition-transform cursor-pointer ${
                      active
                        ? 'border-white scale-110 ring-2 ring-white/40'
                        : 'border-white/30 hover:scale-105'
                    }`}
                    style={{ backgroundColor: cfg.css }}
                  />
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleDownloadSnapshot}
              title={t.snapshot}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/12 hover:bg-white/20 text-white font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.snapshot}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
