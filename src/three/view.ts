import * as THREE from 'three';
import type { ProductId } from '../model';
import { buildMarket, type Target } from './market';

type Options = {
  canvas: HTMLCanvasElement;
  viewport: HTMLElement;
  movePin: (target: Target, x: number, y: number) => void;
  select: (target: Target) => void;
  contextLost: () => void;
};

const defaultYaw = 0.52;
const defaultPitch = 0.60;
const bounds = [
  [-6.04, -0.58, -4.02], [6.04, -0.58, -4.02], [-6.04, -0.58, 4.05], [6.04, -0.58, 4.05],
  [-5.93, 3.33, 3.93], [-5.93, 3.33, -3.93], [5.93, 3.33, -3.93], [5.57, 0.88, 3.55],
].map(([x, y, z]) => new THREE.Vector3(x, y, z));

export function mountMarket({ canvas, viewport, movePin, select, contextLost }: Options) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#fff3d9', '#92ab99', 1.65));
  const light = new THREE.DirectionalLight('#fff7e3', 2.5);
  light.position.set(3, 10, 5);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  Object.assign(light.shadow.camera, { left: -8, right: 8, top: 7, bottom: -7, near: 1, far: 21 });
  light.shadow.bias = -0.00055;
  light.shadow.normalBias = 0.035;
  scene.add(light);
  const fill = new THREE.DirectionalLight('#b6dbc8', 0.65);
  fill.position.set(-4, 3, -2);
  scene.add(fill);

  const market = buildMarket(scene);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 70);
  const aim = new THREE.Vector3(0, 0.95, 0);
  const probe = new THREE.Vector3();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const hits = Array.from(market.fixtures.values(), fixture => fixture.hit);
  let yaw = defaultYaw;
  let pitch = defaultPitch;
  let frame = 0;
  let disposed = false;
  let size = { width: 0, height: 0 };
  let drag: { id: number; x: number; y: number; yaw: number; pitch: number; moved: boolean } | undefined;

  function draw() {
    frame = 0;
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    if (!width || !height) return;
    if (width !== size.width || height !== size.height) {
      renderer.setSize(width, height, false);
      size = { width, height };
    }

    const radius = 23;
    camera.position.set(
      aim.x + radius * Math.cos(pitch) * Math.sin(yaw),
      aim.y + radius * Math.sin(pitch),
      aim.z + radius * Math.cos(pitch) * Math.cos(yaw),
    );
    camera.lookAt(aim);
    camera.updateMatrixWorld();

    let left = Infinity, right = -Infinity, bottom = Infinity, top = -Infinity;
    for (const point of bounds) {
      probe.copy(point).applyMatrix4(camera.matrixWorldInverse);
      left = Math.min(left, probe.x); right = Math.max(right, probe.x);
      bottom = Math.min(bottom, probe.y); top = Math.max(top, probe.y);
    }
    const aspect = width / height;
    const halfHeight = Math.max((right - left) / (1.84 * aspect), (top - bottom) / 1.63);
    const centerX = (right + left) / 2;
    const centerY = (top + bottom) / 2;
    camera.left = centerX - halfHeight * aspect;
    camera.right = centerX + halfHeight * aspect;
    camera.bottom = centerY - halfHeight;
    camera.top = centerY + halfHeight;
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
    for (const [id, { anchor }] of market.fixtures) {
      probe.copy(anchor).project(camera);
      movePin(id, (probe.x + 1) * width / 2, (1 - probe.y) * height / 2);
    }
  }

  function requestDraw() {
    if (!frame && !disposed) frame = requestAnimationFrame(draw);
  }

  const constrainYaw = (value: number) => THREE.MathUtils.clamp(value, 0.12, 1.09);
  const constrainPitch = (value: number) => THREE.MathUtils.clamp(value, 0.44, 0.84);

  function pick(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(hits, false)[0]?.object.userData.target as Target | undefined;
  }

  function pointerDown(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw, pitch, moved: false };
    canvas.setPointerCapture(event.pointerId);
  }

  function pointerMove(event: PointerEvent) {
    if (!drag) {
      canvas.dataset.hover = pick(event) ? 'product' : '';
      return;
    }
    if (event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) < 5 && !drag.moved) return;
    drag.moved = true;
    canvas.dataset.hover = 'drag';
    yaw = constrainYaw(drag.yaw - dx * 0.006);
    pitch = constrainPitch(drag.pitch + dy * 0.005);
    requestDraw();
  }

  function pointerEnd(event: PointerEvent) {
    if (event.pointerId !== drag?.id) return;
    const moved = drag.moved;
    drag = undefined;
    canvas.dataset.hover = '';
    if (!moved && event.type === 'pointerup') {
      const target = pick(event);
      if (target) select(target);
    }
  }

  const resize = new ResizeObserver(requestDraw);
  resize.observe(viewport);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerEnd);
  canvas.addEventListener('pointercancel', pointerEnd);
  canvas.addEventListener('lostpointercapture', pointerEnd);
  canvas.addEventListener('webglcontextlost', contextLost);
  renderer.shadowMap.needsUpdate = true;
  requestDraw();

  return {
    rotate(direction: number) {
      yaw = constrainYaw(yaw + direction * 0.19);
      requestDraw();
    },
    reset() {
      yaw = defaultYaw;
      pitch = defaultPitch;
      requestDraw();
    },
    setStock(stock: Record<ProductId, number>) {
      market.setStock(stock);
      renderer.shadowMap.needsUpdate = true;
      requestDraw();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      resize.disconnect();
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerEnd);
      canvas.removeEventListener('pointercancel', pointerEnd);
      canvas.removeEventListener('lostpointercapture', pointerEnd);
      canvas.removeEventListener('webglcontextlost', contextLost);
      market.dispose();
      light.shadow.dispose();
      renderer.dispose();
    },
  };
}
