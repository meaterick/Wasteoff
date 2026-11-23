import * as THREE from 'three';
import { departments, getItem, type Destination, type Preparation } from '../catalog';
import type { StoreCue } from '../storeSound';
import { advancePlayer, angleDifference, clearCameraFraction, damp, stickVector, type Vector } from './controls';
import { colliders, counter, destinations, fixtures, room, service, type Pose } from './layout';
import { renderRatio, type RenderMode } from './quality';
import { buildWorld, type Target } from './world';

export type CameraMode = 'first' | 'third';
export type Movement = 'forward' | 'back' | 'left' | 'right';
export type ViewPreferences = { sensitivity: number; fov: number; reduceMotion: boolean; graphics: RenderMode };
const moveKeys: Record<Movement, string[]> = {
  forward: ['KeyW', 'ArrowUp'], back: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
};
const navigationKeys = new Set(Object.values(moveKeys).flat().concat('KeyE', 'ShiftLeft', 'ShiftRight', 'KeyV', 'KeyQ'));
const reach = 2.55;
const interactables = Object.entries({ ...fixtures, register: counter, service }).map(([id, rect]) => ({ ...rect, id: id as Destination }));
const zero: Vector = { x: 0, z: 0 };

type Options = {
  canvas: HTMLCanvasElement;
  viewport: HTMLElement;
  onAim: (target: Target | null) => void;
  onInspect: (target: Target) => void;
  onMode: () => void;
  onPose: (pose: Pose) => void;
  onLock: (locked: boolean) => void;
  onCue: (cue: StoreCue) => void;
  onReady: () => void;
  onLost: () => void;
};

function targetId(target: Target | null) {
  return target?.type === 'item' ? target.sku : target?.id ?? '';
}

export function mountWorld({ canvas, viewport, onAim, onInspect, onMode, onPose, onLock, onCue, onReady, onLost }: Options) {
  const touch = window.matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !touch, powerPreference: touch ? 'default' : 'high-performance' });
  renderer.shadowMap.enabled = !touch;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#101d31');
  scene.fog = new THREE.Fog('#172435', 17, 41);
  scene.add(new THREE.HemisphereLight('#f6f8ff', '#737e73', 1.24));
  const overhead = new THREE.DirectionalLight('#fff7e5', 1.45);
  overhead.position.set(-3, 7.2, 1.4);
  overhead.castShadow = true;
  overhead.shadow.mapSize.set(1536, 1536);
  Object.assign(overhead.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: .50, far: 22 });
  overhead.shadow.normalBias = .042;
  overhead.shadow.bias = -.00026;
  scene.add(overhead);
  const fill = new THREE.DirectionalLight('#b2d1ed', .51);
  fill.position.set(4, 3.3, -6);
  scene.add(fill);
  for (const [x, z, intensity] of [[-.3, -4.65, 25], [3.7, 3.5, 21], [-3.2, .65, 18], [.5, 7.3, 26]]) {
    const source = new THREE.SpotLight(z > 5 ? '#b5dbf7' : '#fff6e4', intensity, 8, .98, .82, 2);
    source.position.set(x, z > 5 ? 3.66 : 3.18, z);
    source.target.position.set(x, 0, z + .24);
    scene.add(source, source.target);
  }

  let dirty = true;
  const world = buildWorld(scene, () => { dirty = true; });
  const camera = new THREE.PerspectiveCamera(61, 1, .045, 50);
  scene.add(camera);
  camera.add(world.heldBasket);
  const position: Pose = { ...destinations.entrance };
  const ray = new THREE.Raycaster();
  const cursor = new THREE.Vector2();
  const blockedSpace = colliders.map(rectangle => new THREE.Box3(
    new THREE.Vector3(rectangle.x - rectangle.width / 2, 0, rectangle.z - rectangle.depth / 2),
    new THREE.Vector3(rectangle.x + rectangle.width / 2, rectangle.height, rectangle.z + rectangle.depth / 2),
  ));
  const hitPoint = new THREE.Vector3();
  const keys = new Set<string>();
  const directions = new Set<Movement>();
  let preferences: ViewPreferences = { sensitivity: 1, fov: 62, reduceMotion: false, graphics: 'auto' };
  let mode: CameraMode = 'first';
  let pitch = -.075;
  let viewPitch = pitch;
  let yaw = position.yaw;
  let bodyYaw = yaw;
  let shoulder = 1;
  let shoulderOffset = .46;
  let boom = 1;
  let paused = false;
  let carrying = false;
  let turnReset = true;
  let velocity = zero;
  let joystick = zero;
  let doorOpen = 1;
  let previousOpen = true;
  let gait = 0;
  let cadence = 0;
  let stride = 0;
  let last = 0;
  let animation = 0;
  let aimed: Target | null = null;
  let disposed = false;
  let ready = false;
  let drag: { id: number; x: number; y: number; distance: number } | undefined;

  const held = (direction: Movement) => directions.has(direction) || moveKeys[direction].some(key => keys.has(key));

  function projectCamera(dt: number) {
    const fx = Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const eye = 1.64 + (preferences.reduceMotion ? 0 : Math.sin(gait * 2) * stride * .021);
    let changing = false;
    if (mode === 'first') {
      const cos = Math.cos(viewPitch);
      camera.position.set(position.x, eye, position.z);
      camera.lookAt(position.x + fx * cos, eye + Math.sin(viewPitch), position.z + fz * cos);
    } else {
      const anchor = { x: position.x, y: 1.69, z: position.z };
      shoulderOffset = preferences.reduceMotion || turnReset ? shoulder * .46 : damp(shoulderOffset, shoulder * .46, 12, dt);
      const endpoint = {
        x: position.x - fx * 2.70 - fz * shoulderOffset,
        y: 2.35 + Math.sin(viewPitch) * .12,
        z: position.z - fz * 2.70 + fx * shoulderOffset,
      };
      const limit = clearCameraFraction(anchor, endpoint);
      const next = turnReset || limit < boom || preferences.reduceMotion ? limit : damp(boom, limit, 8.2, dt);
      changing = Math.abs(next - boom) > .0002 || Math.abs(shoulderOffset - shoulder * .46) > .001;
      boom = next;
      camera.position.set(
        THREE.MathUtils.lerp(anchor.x, endpoint.x, boom),
        THREE.MathUtils.lerp(anchor.y, endpoint.y, boom),
        THREE.MathUtils.lerp(anchor.z, endpoint.z, boom),
      );
      camera.lookAt(position.x + fx * 1.85, 1.32 + Math.sin(viewPitch) * 4.2, position.z + fz * 1.85);
    }
    turnReset = false;
    camera.updateMatrixWorld();
    return changing;
  }

  function hitAt(x: number, y: number) {
    cursor.set(x, y);
    ray.setFromCamera(cursor, camera);
    for (const hit of ray.intersectObjects(world.targets, false)) {
      if (Math.hypot(hit.point.x - position.x, hit.point.z - position.z) > reach) continue;
      if (blockedSpace.some(box => ray.ray.intersectBox(box, hitPoint)
        && hitPoint.distanceTo(ray.ray.origin) + .12 < hit.distance)) continue;
      return hit.object.userData.target as Target;
    }
    return null;
  }

  function nearby(): Target | null {
    const fx = Math.sin(yaw);
    const fz = -Math.cos(yaw);
    let candidate: Destination | undefined;
    let nearest = 1.24;
    for (const area of interactables) {
      const dx = area.x - position.x;
      const dz = area.z - position.z;
      if (dx * fx + dz * fz < .16) continue;
      const range = Math.hypot(Math.max(0, Math.abs(dx) - area.width / 2), Math.max(0, Math.abs(dz) - area.depth / 2));
      if (range < nearest) {
        nearest = range;
        candidate = area.id;
      }
    }
    return candidate ? { type: 'area', id: candidate } : null;
  }

  function clearControls() {
    keys.clear();
    directions.clear();
    joystick = zero;
    velocity = zero;
    drag = undefined;
  }

  function choose(target = aimed) {
    if (paused || !target) return;
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    clearControls();
    onInspect(target);
  }

  let size = { width: 0, height: 0 };
  let resolutionScale = 1;
  let frameSamples = 0;
  let sampleTime = 0;
  let fastWindows = 0;
  function resize() {
    const { clientWidth: width, clientHeight: height } = viewport;
    const changed = width !== size.width || height !== size.height;
    size = { width, height };
    if (!width || !height) return;
    const aspect = width / height;
    const pixelRatio = renderRatio(width, height, window.devicePixelRatio || 1, touch, preferences.graphics, resolutionScale);
    if (renderer.getPixelRatio() !== pixelRatio) renderer.setPixelRatio(pixelRatio);
    if (changed) renderer.setSize(width, height, false);
    camera.aspect = aspect;
    camera.fov = preferences.fov + (aspect < .92 ? 8 : 0);
    camera.updateProjectionMatrix();
    dirty = true;
  }
  const observer = new ResizeObserver(resize);
  observer.observe(viewport);
  resize();

  function adaptResolution(duration: number, moving: boolean) {
    if (preferences.graphics !== 'auto' || paused || !ready || !moving || duration <= 0 || duration > 180) return;
    sampleTime += duration;
    if (++frameSamples < 30) return;
    const average = sampleTime / frameSamples;
    frameSamples = sampleTime = 0;
    fastWindows = average < 19 ? fastWindows + 1 : 0;
    const next = average > 25 ? Math.max(.65, resolutionScale - .12)
      : fastWindows >= 3 ? Math.min(1, resolutionScale + .08) : resolutionScale;
    if (next !== resolutionScale) {
      resolutionScale = next;
      fastWindows = 0;
      resize();
    }
  }

  function frame(time: number) {
    if (disposed) return;
    animation = requestAnimationFrame(frame);
    const duration = time - (last || time);
    const dt = Math.min(duration / 1000, .077);
    last = time;
    if (!size.width || document.hidden) return;

    const lookDelta = angleDifference(yaw, position.yaw);
    const pitchDelta = pitch - viewPitch;
    const looking = Math.abs(lookDelta) > .0004 || Math.abs(pitchDelta) > .0004;
    if (looking) {
      const blend = preferences.reduceMotion ? 1 : 1 - Math.exp(-40 * dt);
      yaw += lookDelta * blend;
      viewPitch += pitchDelta * blend;
    }

    const ix = Number(held('right')) - Number(held('left')) + joystick.x;
    const iz = Number(held('forward')) - Number(held('back')) + joystick.z;
    const ratio = Math.max(1, Math.hypot(ix, iz));
    const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight')) && iz >= 0 ? 3.56 : 2.28;
    const forward = iz / ratio * speed * (iz < 0 ? .78 : 1);
    const sideways = ix / ratio * speed * .92;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    const wanted = paused ? zero : { x: forward * sin + sideways * cos, z: -forward * cos + sideways * sin };
    const movement = advancePlayer(position, velocity, wanted, dt);
    velocity = movement.velocity;
    position.x = movement.position.x;
    position.z = movement.position.z;
    const walking = movement.distance > .00015;
    if (walking) {
      gait += movement.distance * 5.26;
      cadence += movement.distance;
      if (cadence >= .61) { cadence -= .61; onCue('step'); }
    }
    const strideGoal = walking ? Math.min(1.15, movement.distance / Math.max(dt, .001) / 2.10) : 0;
    const pastStride = stride;
    stride = damp(stride, strideGoal, 13, dt);
    const walkYaw = mode === 'third' && walking ? Math.atan2(velocity.x, -velocity.z) : yaw;
    bodyYaw += angleDifference(bodyYaw, walkYaw) * (1 - Math.exp(-13 * dt));

    const wantsDoor = Math.abs(position.x) < 1.83 && Math.abs(position.z - room.front) < 1.93;
    const goal = Number(wantsDoor);
    if (wantsDoor !== previousOpen) {
      previousOpen = wantsDoor;
      if (wantsDoor && ready && !turnReset) onCue('door');
    }
    const nextDoor = Math.abs(goal - doorOpen) < .008 ? goal : damp(doorOpen, goal, 8, dt);
    const doorMoving = nextDoor !== doorOpen;
    doorOpen = nextDoor;
    if (!dirty && !looking && !walking && Math.abs(stride - pastStride) < .0003 && !doorMoving) return;
    adaptResolution(duration, walking || looking);
    dirty = projectCamera(dt);
    world.setDoor(doorOpen);
    world.player.object.visible = mode === 'third' && boom > .17;
    world.player.object.position.set(position.x, 0, position.z);
    world.player.object.rotation.y = -bodyYaw;
    world.player.pose(gait, stride, carrying, preferences.reduceMotion);
    world.playerShadow.visible = world.player.object.visible;
    world.playerShadow.position.set(position.x, .006, position.z);
    world.heldBasket.visible = mode === 'first' && carrying;
    world.heldBasket.position.set(Math.min(.44, camera.aspect * .37),
      -.48 + Math.sin(gait) * stride * (preferences.reduceMotion ? 0 : .023), -1.03);
    const target = paused ? null : hitAt(0, 0) ?? nearby();
    if (targetId(target) !== targetId(aimed)) {
      aimed = target;
      world.highlight(target);
      onAim(target);
    }
    onPose({ x: position.x, z: position.z, yaw });
    renderer.render(scene, camera);
    if (!ready) { ready = true; onReady(); }
  }
  scene.updateMatrixWorld(true);
  animation = requestAnimationFrame(frame);

  function keyDown(event: KeyboardEvent) {
    if (!navigationKeys.has(event.code) || paused) return;
    if (document.activeElement !== canvas && document.activeElement !== document.body && document.pointerLockElement !== canvas) return;
    event.preventDefault();
    if (event.code === 'KeyE') { if (!event.repeat) choose(); }
    else if (event.code === 'KeyV') { if (!event.repeat) onMode(); }
    else if (event.code === 'KeyQ') { if (!event.repeat) { shoulder *= -1; dirty = true; } }
    else keys.add(event.code);
  }

  function keyUp(event: KeyboardEvent) { keys.delete(event.code); }
  function lockChanged() {
    const locked = document.pointerLockElement === canvas;
    onLock(locked);
    if (!locked) clearControls();
  }

  function look(dx: number, dy: number, scale: number) {
    const speed = scale * preferences.sensitivity;
    position.yaw += dx * speed;
    pitch = THREE.MathUtils.clamp(pitch - dy * speed, -.91, .70);
    dirty = true;
  }

  function pointerDown(event: PointerEvent) {
    if (paused || event.button !== 0 || drag) return;
    canvas.focus({ preventScroll: true });
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, distance: 0 };
    if (document.pointerLockElement !== canvas) canvas.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: PointerEvent) {
    if (paused) return;
    if (document.pointerLockElement === canvas) {
      const dx = event.movementX;
      const dy = event.movementY;
      if (drag) drag.distance += Math.abs(dx) + Math.abs(dy);
      look(dx, dy, .0025);
    } else if (drag?.id === event.pointerId) {
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      drag.x = event.clientX;
      drag.y = event.clientY;
      drag.distance += Math.abs(dx) + Math.abs(dy);
      look(dx, dy, event.pointerType === 'touch' ? .0047 : .0038);
    }
  }

  function pointerEnd(event: PointerEvent) {
    if (event.pointerId !== drag?.id) return;
    const distance = drag.distance;
    drag = undefined;
    if (event.type !== 'pointerup' || distance > 8) return;
    if (document.pointerLockElement === canvas) { choose(); return; }
    const rect = canvas.getBoundingClientRect();
    const target = hitAt((event.clientX - rect.left) * 2 / rect.width - 1, 1 - (event.clientY - rect.top) * 2 / rect.height);
    if (target) choose(target);
  }

  addEventListener('keydown', keyDown);
  addEventListener('keyup', keyUp);
  addEventListener('blur', clearControls);
  document.addEventListener('visibilitychange', clearControls);
  document.addEventListener('pointerlockchange', lockChanged);
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
      yaw = bodyYaw = position.yaw;
      pitch = viewPitch = destination === 'freezer' ? -.34 : destination === 'register' || destination === 'service' ? -.18 : -.075;
      turnReset = dirty = true;
      clearControls();
      canvas.focus({ preventScroll: true });
    },
    changeCamera(next: CameraMode) {
      mode = next;
      turnReset = dirty = true;
    },
    setPreferences(next: ViewPreferences) {
      if (next.graphics !== preferences.graphics) {
        resolutionScale = 1;
        frameSamples = sampleTime = fastWindows = 0;
        renderer.shadowMap.enabled = next.graphics === 'detail' || (next.graphics === 'auto' && !touch);
        renderer.shadowMap.needsUpdate = renderer.shadowMap.enabled;
      }
      preferences = next;
      resize();
    },
    setPaused(next: boolean) {
      paused = next;
      dirty = true;
      if (paused) {
        clearControls();
        if (document.pointerLockElement === canvas) document.exitPointerLock();
      }
    },
    setInventory(next: Record<string, number>, basket: Record<string, number>) {
      carrying = Object.values(basket).some(count => count > 0);
      world.setStock(next);
      world.setBasket(basket);
      dirty = true;
    },
    setRegister(scanned: number, count: number, charge: number) {
      world.setRegister(scanned, count, charge);
      dirty = true;
    },
    setPreparation(preparation?: Preparation) {
      world.setService(preparation);
      dirty = true;
    },
    move(direction: Movement, pressed: boolean) {
      if (pressed) directions.add(direction);
      else directions.delete(direction);
    },
    setJoystick(x: number, z: number) { joystick = stickVector(x, z); },
    interact() { choose(); },
    async lock() {
      canvas.focus({ preventScroll: true });
      if (document.pointerLockElement === canvas) { document.exitPointerLock(); return; }
      try { await canvas.requestPointerLock(); } catch { /* Browsers can continue to use drag controls. */ }
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
      document.removeEventListener('visibilitychange', clearControls);
      document.removeEventListener('pointerlockchange', lockChanged);
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
  if (target.id === 'service') return '셀프 코너';
  return departments.find(department => department.id === target.id)?.name ?? '';
}
