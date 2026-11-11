import {
  CameraControls,
  ContactShadows,
  Environment,
  Lightformer,
  useGLTF,
  useProgress,
} from '@react-three/drei';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { getSection, getSize, TENT } from '../data/tent.ts';
import { designCanvas, useSurfaceVersion } from '../lib/designSurface.ts';
import { pointInPolygon } from '../lib/geometry.ts';
import { previewBridge, type ViewName } from '../lib/previewBridge.ts';
import { useDesignStore } from '../store/designStore.ts';
import { useUiStore, type ViewMode } from '../store/uiStore.ts';
import type { Side } from '../types.ts';
import { CubeIcon } from './icons.tsx';

/** Camera directions (x, y, z) for the view buttons; "front" is +Z. */
const VIEW_DIRECTIONS: Record<ViewName, [number, number, number]> = {
  home: [0.75, 0.42, 1],
  front: [0, 0.18, 1],
  back: [0, 0.18, -1],
  left: [-1, 0.18, 0],
  right: [1, 0.18, 0],
  top: [0, 1, 0.02],
};

/** Directions checked for the closest zoom: side-on and corner-on, low and high. */
const LIMIT_DIRECTIONS: [number, number, number][] = [
  [0, 0.18, 1],
  [1, 0.18, 1],
  [0, 0.7, 1],
  [1, 0.7, 1],
];

const SIDE_DIRECTIONS: Record<Side, [number, number]> = {
  front: [0, 1],
  back: [0, -1],
  left: [-1, 0],
  right: [1, 0],
};

/** How much of the frame the tent fills: the starting view, and the closest the camera may get. */
const HOME_FILL = 0.8;
const CLOSEST_FILL = 0.94;
/** Trackpad pinch speed (pinches arrive as ctrl + wheel with small steps). */
const PINCH_SPEED = 0.02;

const scratchCamera = new THREE.PerspectiveCamera();

/**
 * Smallest camera distance at which the whole box is inside the frame, looking at
 * `target` from `direction`. `fill` is how much of the frame it may use (1 = edge to edge).
 */
function fitDistance(
  box: THREE.Box3,
  direction: [number, number, number],
  target: THREE.Vector3,
  fov: number,
  aspect: number,
  fill: number,
): number {
  scratchCamera.fov = fov;
  scratchCamera.aspect = aspect;
  scratchCamera.near = 0.01;
  scratchCamera.far = 1000;
  scratchCamera.updateProjectionMatrix();
  const dir = new THREE.Vector3(...direction).normalize();
  const corners = [0, 1, 2, 3, 4, 5, 6, 7].map(
    (i) =>
      new THREE.Vector3(
        i & 1 ? box.max.x : box.min.x,
        i & 2 ? box.max.y : box.min.y,
        i & 4 ? box.max.z : box.min.z,
      ),
  );
  const p = new THREE.Vector3();
  const fits = (d: number) => {
    scratchCamera.position.copy(dir).multiplyScalar(d).add(target);
    scratchCamera.lookAt(target);
    scratchCamera.updateMatrixWorld();
    return corners.every((c) => {
      p.copy(c).project(scratchCamera);
      return p.z < 1 && Math.abs(p.x) <= fill && Math.abs(p.y) <= fill;
    });
  };
  let lo = 0.1;
  let hi = 200;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

// The shared design canvas as a texture. One texture for the whole app.
const designTexture = new THREE.CanvasTexture(designCanvas);
designTexture.flipY = false; // glTF UVs start at the top-left
designTexture.colorSpace = THREE.SRGBColorSpace;

/** Re-upload the texture whenever the design is redrawn. */
function useDesignTexture(): THREE.CanvasTexture {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    designTexture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    const refresh = () => {
      designTexture.needsUpdate = true;
      invalidate();
    };
    refresh();
    return useSurfaceVersion.subscribe(refresh);
  }, [gl, invalidate]);

  return designTexture;
}

interface TentSceneProps {
  /** The dock changes size between the small preview and the full 3D view. */
  mode: ViewMode;
  /** The camera left the last preset (the user orbited, or it turned to a panel). */
  onFreeView: () => void;
}

function TentScene({ mode, onFreeView }: TentSceneProps) {
  const sizeId = useDesignStore((s) => s.config.sizeId);
  const frame = useDesignStore((s) => s.config.frame);
  const selectedSectionId = useDesignStore((s) => s.selectedSectionId);
  const size = getSize(sizeId);
  const { scene: model } = useGLTF(size.modelUrl);
  const texture = useDesignTexture();
  const controls = useRef<CameraControls>(null);
  const { gl, scene, camera, invalidate, get } = useThree();
  const canvasWidth = useThree((s) => s.size.width);
  const canvasHeight = useThree((s) => s.size.height);

  // Put our texture on the printable fabric and hide the frame for "canopy only".
  useLayoutEffect(() => {
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const material = object.material as THREE.MeshStandardMaterial;
      if (material.name === TENT.printMaterial) {
        material.map = texture;
        material.color.set('#ffffff');
        material.needsUpdate = true;
      }
      if (material.name === TENT.frameMaterial) object.visible = frame === 'frame';
    });
    invalidate();
  }, [model, texture, frame, invalidate]);

  // Fetch the other sizes once the browser is idle, so switching size is instant
  // without competing with the first tent for the network and the CPU.
  useEffect(() => {
    const preload = () => TENT.sizes.forEach((s) => useGLTF.preload(s.modelUrl));
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(preload, { timeout: 4000 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(preload, 1500);
    return () => clearTimeout(id);
  }, []);

  // Size of the model in metres (after the size's scale correction).
  const bounds = useMemo(() => {
    model.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(model).applyMatrix4(model.matrixWorld.clone().invert());
    const scale = new THREE.Vector3(...size.modelScale);
    box.min.multiply(scale);
    box.max.multiply(scale);
    const dims = box.getSize(new THREE.Vector3());
    // The camera orbits around the middle of the tent, so the whole tent sits centred.
    return { box, top: box.max.y, middle: (box.min.y + box.max.y) / 2, radius: dims.length() / 2 };
  }, [model, size]);

  /**
   * Camera position looking at the tent from a direction, far enough back that
   * the whole tent fits whatever the shape of the canvas.
   */
  const poseFor = useCallback(
    (direction: [number, number, number], targetY: number, aspect?: number, fill = HOME_FILL) => {
      const { width, height } = get().size;
      const ratio = aspect ?? width / Math.max(1, height);
      const fov = (get().camera as THREE.PerspectiveCamera).fov;
      const target = new THREE.Vector3(0, targetY, 0);
      const distance = fitDistance(bounds.box, direction, target, fov, ratio, fill);
      const position = new THREE.Vector3(...direction).normalize().multiplyScalar(distance).add(target);
      return { position, target };
    },
    [bounds, get],
  );

  const pose = useCallback(
    (view: ViewName) => poseFor(VIEW_DIRECTIONS[view], bounds.middle),
    [poseFor, bounds],
  );

  // Start (and restart after a size change) from the three-quarter view.
  useEffect(() => {
    const { position, target } = pose('home');
    controls.current?.setLookAt(position.x, position.y, position.z, target.x, target.y, target.z, false);
  }, [pose]);

  // Switching between the small preview and the full view changes the canvas size,
  // so fit the tent again once the new size has arrived.
  const modeChangedAt = useRef(0);
  useEffect(() => {
    modeChangedAt.current = performance.now();
  }, [mode]);
  useEffect(() => {
    if (performance.now() - modeChangedAt.current > 800) return;
    const { position, target } = pose('home');
    controls.current?.setLookAt(position.x, position.y, position.z, target.x, target.y, target.z, false);
  }, [mode, canvasWidth, canvasHeight, pose]);

  // Keep the point the camera orbits around on the tent, so panning cannot lose it.
  useEffect(() => {
    const r = bounds.radius * 0.45;
    controls.current?.setBoundary(
      new THREE.Box3(new THREE.Vector3(-r, 0, -r), new THREE.Vector3(r, bounds.top, r)),
    );
  }, [bounds]);

  // Zoom limits. Closest: the whole tent still fits from any angle, with a little floor
  // showing below it. Furthest: about twice the starting view, so the tent never becomes a dot.
  const aspect = canvasWidth / Math.max(1, canvasHeight);
  const { minDistance, maxDistance } = useMemo(() => {
    const distance = (direction: [number, number, number], fill?: number) =>
      poseFor(direction, bounds.middle, aspect, fill).position.distanceTo(new THREE.Vector3(0, bounds.middle, 0));
    const closest = Math.max(...LIMIT_DIRECTIONS.map((d) => distance(d, CLOSEST_FILL)));
    return { minDistance: closest, maxDistance: Math.max(distance(VIEW_DIRECTIONS.home), closest) * 2.2 };
  }, [poseFor, bounds, aspect]);

  // A trackpad pinch arrives as a wheel event with ctrl held and tiny steps. The camera
  // library would treat it as a slow lens zoom that ignores the limits above, so pinches
  // move the camera here instead, faster, and within the same limits.
  useEffect(() => {
    const element = gl.domElement.closest('.preview3d');
    if (!element) return;
    const onWheel = (event: Event) => {
      const e = event as WheelEvent;
      const c = controls.current;
      if (!e.ctrlKey || !c) return;
      e.preventDefault();
      e.stopPropagation();
      const step = THREE.MathUtils.clamp(e.deltaY * PINCH_SPEED, -0.3, 0.3);
      c.dollyTo(c.distance * Math.exp(step), false);
      invalidate(); // the canvas only redraws on demand
    };
    element.addEventListener('wheel', onWheel, { capture: true, passive: false });
    return () => element.removeEventListener('wheel', onWheel, { capture: true });
  }, [gl, invalidate]);

  // Turn the camera to whichever panel is selected, from any part of the UI.
  const focusedSection = useRef(selectedSectionId);
  useEffect(() => {
    if (focusedSection.current === selectedSectionId) return;
    focusedSection.current = selectedSectionId;
    const section = getSection(size, selectedSectionId);
    const [dx, dz] = SIDE_DIRECTIONS[section.side];
    const isPeak = section.kind === 'peak';
    const { position, target } = poseFor([dx, isPeak ? 0.55 : 0.12, dz], bounds.middle);
    controls.current?.setLookAt(position.x, position.y, position.z, target.x, target.y, target.z, true);
    onFreeView();
  }, [selectedSectionId, size, bounds, poseFor, onFreeView]);

  // Let the view buttons and the PDF use this scene.
  useEffect(
    () =>
      previewBridge.register({
        goTo: (view) => {
          const { position, target } = pose(view);
          controls.current?.setLookAt(position.x, position.y, position.z, target.x, target.y, target.z, true);
        },
        capture: (views) => {
          // Render each view at a fixed 4:3 size, whatever the shape of the pane,
          // then put everything back before the browser paints.
          const W = 1200;
          const H = 900;
          const cam = camera as THREE.PerspectiveCamera;
          const saved = {
            position: cam.position.clone(),
            quaternion: cam.quaternion.clone(),
            aspect: cam.aspect,
            size: gl.getSize(new THREE.Vector2()),
            pixelRatio: gl.getPixelRatio(),
          };
          gl.setPixelRatio(1);
          gl.setSize(W, H, false);
          cam.aspect = W / H;
          cam.updateProjectionMatrix();

          const images: Partial<Record<ViewName, string>> = {};
          for (const view of views) {
            const { position, target } = poseFor(VIEW_DIRECTIONS[view], bounds.middle, W / H);
            cam.position.copy(position);
            cam.lookAt(target);
            cam.updateMatrixWorld();
            gl.render(scene, cam);
            images[view] = gl.domElement.toDataURL('image/jpeg', 0.9);
          }

          gl.setPixelRatio(saved.pixelRatio);
          gl.setSize(saved.size.x, saved.size.y, false);
          cam.aspect = saved.aspect;
          cam.updateProjectionMatrix();
          cam.position.copy(saved.position);
          cam.quaternion.copy(saved.quaternion);
          cam.updateMatrixWorld();
          invalidate();
          return images;
        },
      }),
    [pose, poseFor, bounds, camera, gl, scene, invalidate],
  );

  function handleClick(e: ThreeEvent<MouseEvent>) {
    if (e.delta > 4 || !e.uv) return; // that was a drag to orbit, not a click
    const material = (e.object as THREE.Mesh).material as THREE.Material;
    if (material.name !== TENT.printMaterial) return;
    e.stopPropagation();
    const hit = size.sections.find((s) => pointInPolygon([e.uv!.x, e.uv!.y], s.polygon));
    if (hit) useDesignStore.getState().selectSection(hit.id);
  }

  return (
    <>
      <primitive
        object={model}
        scale={size.modelScale}
        onClick={handleClick}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          const material = (e.object as THREE.Mesh).material as THREE.Material;
          document.body.style.cursor = material.name === TENT.printMaterial ? 'pointer' : '';
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
        }}
      />
      <CameraControls
        ref={controls}
        makeDefault
        minDistance={minDistance}
        maxDistance={maxDistance}
        maxPolarAngle={Math.PI / 2 - 0.05}
        smoothTime={0.35}
        onControlStart={onFreeView}
      />
    </>
  );
}

/** Plain HTML on top of the canvas (useProgress works outside the <Canvas>). */
function LoadingOverlay() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return <div className="loading-chip overlay">Loading tent… {Math.round(progress)}%</div>;
}

const VIEW_BUTTONS: { view: ViewName; label: string }[] = [
  { view: 'home', label: 'Orbit' },
  { view: 'front', label: 'Front' },
  { view: 'back', label: 'Back' },
  { view: 'left', label: 'Left' },
  { view: 'right', label: 'Right' },
  { view: 'top', label: 'Top' },
];

export default function Preview3D() {
  const mode = useUiStore((s) => s.mode);
  const setMode = useUiStore((s) => s.setMode);
  const [activeView, setActiveView] = useState<ViewName | null>('home');
  const [shownMode, setShownMode] = useState(mode);
  // A mode switch refits the camera to the overview, so that preset is active again.
  if (shownMode !== mode) {
    setShownMode(mode);
    setActiveView('home');
  }
  const handleFreeView = useCallback(() => setActiveView(null), []);

  function goTo(view: ViewName) {
    previewBridge.goTo(view);
    setActiveView(view);
  }

  return (
    <div className="preview3d" data-mode={mode}>
      <Canvas frameloop="demand" flat dpr={[1, 2]} camera={{ position: [5, 3.5, 6], fov: 35, near: 0.1, far: 100 }}>
        <color attach="background" args={['#eef2f7']} />
        <hemisphereLight args={['#ffffff', '#c7ced8', 1.4]} />
        <directionalLight position={[5, 8, 6]} intensity={1.6} />
        <directionalLight position={[-6, 4, -5]} intensity={0.6} />
        <Environment resolution={128}>
          <Lightformer intensity={2} position={[0, 5, -6]} scale={[12, 5, 1]} />
          <Lightformer intensity={1.2} position={[-6, 2, 4]} rotation-y={Math.PI / 2} scale={[12, 4, 1]} />
          <Lightformer intensity={1.2} position={[6, 2, 4]} rotation-y={-Math.PI / 2} scale={[12, 4, 1]} />
        </Environment>
        <Suspense fallback={null}>
          <TentScene mode={mode} onFreeView={handleFreeView} />
        </Suspense>
        <ContactShadows position={[0, 0.002, 0]} scale={12} blur={2.4} opacity={0.4} far={4} resolution={512} />
      </Canvas>

      <LoadingOverlay />
      {mode === '3d' ? (
        <div className="view-presets" role="group" aria-label="Camera views">
          {VIEW_BUTTONS.map((b) => (
            <button key={b.view} type="button" aria-pressed={activeView === b.view} onClick={() => goTo(b.view)}>
              {b.label}
            </button>
          ))}
        </div>
      ) : (
        <>
          <span className="dock-label">3D preview</span>
          <button type="button" className="dock-expand" title="Open the full 3D view" onClick={() => setMode('3d')}>
            <CubeIcon width={16} height={16} />
            3D
          </button>
        </>
      )}
    </div>
  );
}