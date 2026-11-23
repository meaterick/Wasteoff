import * as THREE from 'three';
import { getItem } from '../catalog';
import type { Destination } from '../catalog';
import { cameraClear, colliders, destinations, fixtures, room, walk, type Pose } from './layout';
import { buildWorld, type Target } from './world';

export type CameraMode = 'first' | 'third';
export type Movement = 'forward' | 'back' | 'left' | 'right';
type Keys = Record<Movement, string[]>;
const moveKeys: Keys = {
  forward: ['KeyW', 'ArrowUp'], back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
};
const navigationKeys = new Set(Object.values(moveKeys).flat().concat('KeyE', 'ShiftLeft', 'ShiftRight', 'KeyV'));
const reach = 2.60;
const interactables = Object.entries(fixtures).map(([id, fixture]) => ({
  id: id as Destination, x: fixture.x, z: fixture.z, width: fixture.width, depth: fixture.depth,
}));

type Options = {
  canvas: HTMLCanvasElement;
  viewport: HTMLElement;
  onAim: (target: Target | null) => void;
  onInspect: (target: Target) => void;
  onMode: () => void;
  onLost: () => void;
};

function targetId(target: Target | null) {
  if (!target) return '';
  return target.type === 'item' ? target.sku : target.id;
}

export function mountWorld({ canvas, viewport, onAim, onInspect, onMode, onLost }: Options) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.55));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.03;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#111c28');
  scene.fog = new THREE.Fog('#182530', 21, 41);
  scene.add(new THREE.HemisphereLight('#fffaf0', '#bcc5b9', 1.54));
  const overhead = new THREE.DirectionalLight('#fff9eb', 2.05);
  overhead.position.set(-1.8, 7, 3.6);
  overhead.castShadow = true;
  overhead.shadow.mapSize.set(1536, 1536);
  Object.assign(overhead.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: .50, far: 22 });
  overhead.shadow.normalBias = .021;
  overhead.shadow.bias = -.00030;
  overhead.shadow.radius = 2;
  scene.add(overhead);
  const fill = new THREE.DirectionalLight('#c6dce2', .48);
  fill.position.set(4, 3.3, -6);
  scene.add(fill);

  let dirty = true;
  const world = buildWorld(scene, () => { dirty = true; });
  const camera = new THREE.PerspectiveCamera(61, 1, .055, 47);
  const position: Pose = { ...destinations.entrance };
  const ray = new THREE.Raycaster();
  const cursor = new THREE.Vector2();
  const blockedSpace = colliders.map(rectangle => new THREE.Box3(
    new THREE.Vector3(rectangle.x - rectangle.width / 2, 0, rectangle.z - rectangle.depth / 2),
    new THREE.Vector3(rectangle.x + rectangle.width / 2, rectangle.height, rectangle.z + rectangle.depth / 2),
  ));
  const hitPoint = new THREE.Vector3();
  const keys = new Set<string>();
  const touch = new Set<Movement>();
  let mode: CameraMode = 'first';
  let pitch = -.052;
  let paused = false;
  let carrying = false;
  let doorOpen = 1;
  let movingLast = false;
  let phase = 0;
  let last = 0;
  let animation = 0;
  let aimed: Target | null = null;
  let disposed = false;
  let drag: { id: number; x: number; y: number; distance: number } | undefined;

  const has = (direction: Movement) => touch.has(direction) || moveKeys[direction].some(key => keys.has(key));

  function projectCamera() {
    const fx = Math.sin(position.yaw);
    const fz = -Math.cos(position.yaw);
    const pitchCos = Math.cos(pitch);
    const eye = 1.63;
    if (mode === 'first') {
      camera.position.set(position.x, eye, position.z);
      camera.lookAt(position.x + fx * pitchCos, eye + Math.sin(pitch), position.z + fz * pitchCos);
    } else {
      const camY = 2.40;
      const shoulderX = -fz * .34;
      const shoulderZ = fx * .34;
      let distance = .53;
      for (let candidate = .64; candidate <= 2.64; candidate += .14) {
        const x = position.x - fx * candidate + shoulderX;
        const z = position.z - fz * candidate + shoulderZ;
        if (!cameraClear(x, z, camY) || (position.z < room.front - .3 && z > room.front - .15)) break;
        distance = candidate;
      }
      camera.position.set(position.x - fx * distance + shoulderX, camY, position.z - fz * distance + shoulderZ);
      camera.lookAt(position.x + fx * 1.4, eye + Math.sin(pitch) * 3.8 - .16, position.z + fz * 1.4);
    }
    camera.updateMatrixWorld();
  }

  function hitAt(x: number, y: number) {
    cursor.set(x, y);
    ray.setFromCamera(cursor, camera);
    for (const hit of ray.intersectObjects(world.targets, false)) {
      if (Math.hypot(hit.point.x - position.x, hit.point.z - position.z) > reach) continue;
      const target = hit.object.userData.target as Target;
      if (blockedSpace.some(box => ray.ray.intersectBox(box, hitPoint)
        && hitPoint.distanceTo(ray.ray.origin) + 0.11 < hit.distance)) continue;
      return target;
    }
    return null;
  }

  function nearby(): Target | null {
    const register = destinations.register;
    if (Math.hypot(position.x - register.x, position.z - register.z) < 1.12) return { type: 'area', id: 'register' };
    const fx = Math.sin(position.yaw);
    const fz = -Math.cos(position.yaw);
    let candidate: Destination | undefined;
    let nearest = 1.37;
    for (const area of interactables) {
      const dx = area.x - position.x;
      const dz = area.z - position.z;
      if (dx * fx + dz * fz < .12) continue;
      const range = Math.hypot(Math.max(0, Math.abs(dx) - area.width / 2), Math.max(0, Math.abs(dz) - area.depth / 2));
      if (range < nearest) {
        nearest = range;
        candidate = area.id;
      }
    }
    return candidate ? { type: 'area', id: candidate } : null;
  }

  function choose(target = aimed) {
    if (paused || !target) return;
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    keys.clear();
    touch.clear();
    onInspect(target);
  }

  function resize() {
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    if (!width || !height) return;
    const aspect = width / height;
    camera.aspect = aspect;
    camera.fov = aspect < .92 ? 72 : 61;
    dirty = true;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(viewport);
  resize();

  function frame(time: number) {
    if (disposed) return;
    animation = requestAnimationFrame(frame);
    const dt = Math.min((time - (last || time)) / 1000, .04);
    last = time;
    if (!viewport.clientWidth || document.hidden) return;

    const forward = paused ? 0 : Number(has('forward')) - Number(has('back'));
    const side = paused ? 0 : Number(has('right')) - Number(has('left'));
    const magnitude = Math.hypot(forward, side);
    let walking = 0;
    if (magnitude) {
      const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');
      const step = (sprint ? 3.66 : 2.20) * dt / magnitude;
      const sin = Math.sin(position.yaw);
      const cos = Math.cos(position.yaw);
      const next = walk(position, (sin * forward + cos * side) * step, (-cos * forward + sin * side) * step);
      walking = Number(next.x !== position.x || next.z !== position.z);
      position.x = next.x;
      position.z = next.z;
      phase += dt * (sprint ? 12 : 8);
    }
    const openTarget = Math.abs(position.x) < 1.85 && Math.abs(position.z - room.front) < 2.05 ? 1 : 0;
    const nextDoor = Math.abs(openTarget - doorOpen) < .012 ? openTarget
      : doorOpen + (openTarget - doorOpen) * (1 - Math.exp(-8 * dt));
    const doorMoving = nextDoor !== doorOpen;
    doorOpen = nextDoor;
    if (!dirty && !walking && !movingLast && !doorMoving) return;
    movingLast = Boolean(walking);
    dirty = false;
    world.setDoor(doorOpen);
    projectCamera();
    world.player.object.visible = mode === 'third';
    world.player.object.position.set(position.x, 0, position.z);
    world.player.object.rotation.y = -position.yaw;
    world.player.pose(phase, walking, carrying);
    world.playerShadow.visible = mode === 'third';
    world.playerShadow.position.set(position.x, .008, position.z);
    const target = paused ? null : hitAt(0, 0) ?? nearby();
    if (targetId(target) !== targetId(aimed)) {
      aimed = target;
      onAim(target);
    }
    renderer.render(scene, camera);
  }
  scene.updateMatrixWorld(true);
  projectCamera();
  animation = requestAnimationFrame(frame);

  function clearControls() {
    keys.clear();
    touch.clear();
  }

  function keyDown(event: KeyboardEvent) {
    if (!navigationKeys.has(event.code) || paused) return;
    if (document.activeElement !== canvas && document.activeElement !== document.body && document.pointerLockElement !== canvas) return;
    event.preventDefault();
    if (event.code === 'KeyE') {
      if (!event.repeat) choose();
      return;
    }
    if (event.code === 'KeyV') {
      if (!event.repeat) onMode();
      return;
    }
    keys.add(event.code);
  }
  function keyUp(event: KeyboardEvent) { keys.delete(event.code); }

  function look(dx: number, dy: number, speed: number) {
    position.yaw += dx * speed;
    dirty = true;
    pitch = THREE.MathUtils.clamp(pitch - dy * speed, -.89, .67);
  }

  function pointerDown(event: PointerEvent) {
    if (paused || !event.isPrimary || event.button !== 0) return;
    canvas.focus({ preventScroll: true });
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, distance: 0 };
    canvas.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: PointerEvent) {
    if (!paused && document.pointerLockElement === canvas) {
      look(event.movementX, event.movementY, .0027);
    } else if (!paused && drag?.id === event.pointerId) {
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      drag.x = event.clientX;
      drag.y = event.clientY;
      drag.distance += Math.abs(dx) + Math.abs(dy);
      if (drag.distance > 3) look(dx, dy, event.pointerType === 'touch' ? .0052 : .0041);
    }
  }

  function pointerEnd(event: PointerEvent) {
    if (event.pointerId !== drag?.id) return;
    const distance = drag.distance;
    drag = undefined;
    if (event.type !== 'pointerup' || distance > 7) return;
    if (document.pointerLockElement === canvas) {
      choose();
      return;
    }
    const bounds = canvas.getBoundingClientRect();
    const target = hitAt((event.clientX - bounds.left) * 2 / bounds.width - 1, 1 - (event.clientY - bounds.top) * 2 / bounds.height);
    if (target) choose(target);
  }

  addEventListener('keydown', keyDown);
  addEventListener('keyup', keyUp);
  addEventListener('blur', clearControls);
  canvas.addEventListener('blur', clearControls);
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerEnd);
  canvas.addEventListener('pointercancel', pointerEnd);
  canvas.addEventListener('lostpointercapture', pointerEnd);

  return {
    go(destination: Destination) {
      Object.assign(position, destinations[destination]);
      dirty = true;
      pitch = destination === 'freezer' ? -.33 : destination === 'register' ? -.15 : -.052;
      clearControls();
      canvas.focus({ preventScroll: true });
    },
    changeCamera(next: CameraMode) { mode = next; dirty = true; },
    setPaused(next: boolean) {
      paused = next;
      dirty = true;
      if (paused) {
        clearControls();
        if (document.pointerLockElement === canvas) document.exitPointerLock();
      }
    },
    setInventory(next: Record<string, number>, basket: boolean) {
      carrying = basket;
      world.setStock(next);
      dirty = true;
    },
    move(direction: Movement, held: boolean) {
      if (held) touch.add(direction);
      else touch.delete(direction);
    },
    interact() { choose(); },
    async lock() {
      canvas.focus({ preventScroll: true });
      try { await canvas.requestPointerLock(); } catch { /* Dragging still controls the view. */ }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      cancelAnimationFrame(animation);
      observer.disconnect();
      removeEventListener('keydown', keyDown);
      removeEventListener('keyup', keyUp);
      removeEventListener('blur', clearControls);
      canvas.removeEventListener('blur', clearControls);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerEnd);
      canvas.removeEventListener('pointercancel', pointerEnd);
      canvas.removeEventListener('lostpointercapture', pointerEnd);
      world.dispose();
      overhead.shadow.dispose();
      renderer.dispose();
    },
  };
}

export function aimLabel(target: Target | null) {
  if (!target) return '';
  if (target.type === 'item') return getItem(target.sku)?.name ?? '';
  if (target.id === 'register') return '계산대';
  return '';
}
