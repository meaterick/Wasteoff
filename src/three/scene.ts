import * as THREE from 'three';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import dosirakUrl from '../assets/dosirak-1440.jpg';
import { inventory, limitedQty, pickup, points, product, pt, store } from '../data';
import { drawPoster, drawScreen, drawSign, drawTile, loadFonts, type ScreenKind } from './textures';

/**
 * 편의점 마감 판매 과정을 보여 주는 3D 장면.
 * 장면 상태는 (단계, 단계 안 경과 시간)만으로 정해지고, 물체와 카메라는 그 목표 위치를 부드럽게 따라갑니다.
 * 어느 단계로 바로 이동해도 같은 모습이 나옵니다.
 */

export interface SceneController {
  setStep(step: number): void;
  setActive(active: boolean): void;
  dispose(): void;
}

type V3 = [number, number, number];

const COL = {
  ivory: '#faf6ec',
  wall: '#f3ecdb',
  green: '#1f4d3a',
  green3: '#6f9a83',
  orange: '#ee7418',
  safety: '#cfc4ab',
  ink: '#1b2a22',
  sidewalk: '#ddd6c6',
};

// ───── 배치 기준 좌표 ─────
const FRIDGE = { x: -2.5, zBack: -4.0, zFront: -3.2, w: 3.8, h: 2.15 };
const SHELF_Y = [1.36, 0.76]; // 윗칸, 아랫칸
const COUNTER = { x: 2.6, z: -0.95 };
const POSTER = { x: 4.35, z: 2.75 };
const CUSTOMER_IDLE: V3 = [6.6, 0, 5.4];
const CUSTOMER_AT_POSTER: V3 = [4.35, 0, 3.7];
const CUSTOMER_AT_COUNTER: V3 = [2.75, 0, -0.12];
const WALK_TO_COUNTER: V3[] = [CUSTOMER_AT_POSTER, [3.2, 0, 3.15], [2.9, 0, 2.1], [2.8, 0, 0.9], CUSTOMER_AT_COUNTER];
const WALK_TO_POSTER: V3[] = [CUSTOMER_IDLE, [5.6, 0, 4.6], CUSTOMER_AT_POSTER];

const SHOTS: { pos: V3; target: V3 }[] = [
  { pos: [-0.7, 2.35, 1.3], target: [-2.5, 1.05, -3.5] },
  { pos: [1.7, 3.0, 1.5], target: [-0.4, 0.95, -2.6] },
  { pos: [7.6, 2.4, 7.6], target: [4.5, 1.15, 3.2] },
  { pos: [7.2, 2.2, 7.2], target: [4.5, 1.15, 3.3] },
  { pos: [8.4, 5.6, 2.2], target: [1.8, 0.6, -0.2] },
  { pos: [4.6, 2.5, 1.5], target: [2.5, 1.15, -0.7] },
];

const SOLD_INDEX = 11; // 고객이 사 가는 도시락 (아랫칸 맨 오른쪽)

type Group = 'order' | 'regular' | 'safety' | 'open';
const GROUP_OF = (i: number): Group =>
  i < inventory.confirmedOrders
    ? 'order'
    : i < inventory.confirmedOrders + inventory.expectedRegularSales
      ? 'regular'
      : i < inventory.onHand - limitedQty
        ? 'safety'
        : 'open';
const GROUP_COLOR: Record<Group, string> = {
  order: COL.green3,
  regular: COL.green,
  safety: COL.safety,
  open: COL.orange,
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
const prog = (t: number, a: number, b: number) => ease((t - a) / (b - a));
const v3 = (a: V3) => new THREE.Vector3(a[0], a[1], a[2]);

/** 꺾은선 경로 위의 위치 (u: 0~1) */
function along(path: V3[], u: number, out: THREE.Vector3) {
  const pts = path.map(v3);
  const lens = pts.slice(1).map((p, i) => p.distanceTo(pts[i]));
  const total = lens.reduce((a, b) => a + b, 0);
  let d = clamp01(u) * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      return out.copy(pts[i]).lerp(pts[i + 1], lens[i] ? Math.min(1, d / lens[i]) : 1);
    }
    d -= lens[i];
  }
  return out.copy(pts[pts.length - 1]);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function makeLabel(className: string, html: string) {
  const outer = document.createElement('div');
  const inner = document.createElement('div');
  inner.className = `l3 ${className}`;
  inner.innerHTML = html;
  outer.appendChild(inner);
  const obj = new CSS2DObject(outer);
  return { obj, inner };
}

function setOn(el: HTMLElement, on: boolean) {
  el.classList.toggle('is-on', on);
}

export async function createScene(host: HTMLElement, opts: { reducedMotion: boolean }): Promise<SceneController> {
  const [photo] = await Promise.all([loadImage(dosirakUrl), loadFonts()]);

  // ───── 렌더러 ─────
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.className = 'stage3d__canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = 'stage3d__labels';
  host.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COL.ivory);
  scene.fog = new THREE.Fog(COL.ivory, 20, 42);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);

  // ───── 조명 ─────
  scene.add(new THREE.HemisphereLight('#ffffff', '#e9dfc8', 1.7));
  const sun = new THREE.DirectionalLight('#fff6e8', 2.4);
  sun.position.set(6, 11, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 30 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(x: T) => {
    disposables.push(x);
    return x;
  };
  const mat = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
    track(new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra }));
  const box = (w: number, h: number, d: number) => track(new THREE.BoxGeometry(w, h, d));
  const mesh = (g: THREE.BufferGeometry, m: THREE.Material, p: V3, shadow = true) => {
    const o = new THREE.Mesh(g, m);
    o.position.set(...p);
    o.castShadow = shadow;
    o.receiveShadow = true;
    scene.add(o);
    return o;
  };
  const canvasTex = (cv: HTMLCanvasElement) => {
    const t = track(new THREE.CanvasTexture(cv));
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  };

  // ───── 바닥, 벽 ─────
  const ground = mesh(track(new THREE.PlaneGeometry(80, 80)), mat(COL.ivory, { roughness: 1 }), [0, -0.01, 0], false);
  ground.rotation.x = -Math.PI / 2;

  const tile = canvasTex(drawTile());
  tile.wrapS = tile.wrapT = THREE.RepeatWrapping;
  tile.repeat.set(10, 6);
  const floor = mesh(track(new THREE.PlaneGeometry(10, 6.1)), mat('#ffffff', { map: tile, roughness: 0.6 }), [-0.5, 0, -1.05], false);
  floor.rotation.x = -Math.PI / 2;

  const walk = mesh(track(new THREE.PlaneGeometry(16, 5)), mat(COL.sidewalk, { roughness: 0.95 }), [1, 0.002, 4.5], false);
  walk.rotation.x = -Math.PI / 2;

  mesh(box(10.15, 3, 0.15), mat(COL.wall), [-0.5, 1.5, -4.18]);
  mesh(box(10.15, 0.34, 0.17), mat(COL.green), [-0.5, 2.62, -4.1]);
  mesh(box(0.15, 3, 6.25), mat(COL.wall), [-5.58, 1.5, -1.05]);

  // 앞 유리벽 (출입문 x 2.2~3.6)
  const glass = mat('#cfe3d8', { transparent: true, opacity: 0.16, roughness: 0.1, depthWrite: false });
  const frame = mat(COL.green);
  const glassSpans: [number, number][] = [
    [-5.5, 2.2],
    [3.6, 4.5],
  ];
  glassSpans.forEach(([a, b]) => {
    const w = b - a;
    const g = mesh(box(w, 2.5, 0.04), glass, [(a + b) / 2, 1.25, 2.0], false);
    g.receiveShadow = false;
    mesh(box(w, 0.08, 0.1), frame, [(a + b) / 2, 0.04, 2.0]);
  });
  [-5.5, 2.2, 3.6, 4.5].forEach((x) => mesh(box(0.1, 2.6, 0.1), frame, [x, 1.3, 2.0]));
  mesh(box(10.1, 0.34, 0.12), frame, [-0.5, 2.67, 2.0]);
  const sign = mesh(track(new THREE.PlaneGeometry(1.9, 0.37)), track(new THREE.MeshBasicMaterial({ map: canvasTex(drawSign('캠퍼스점')), toneMapped: false })), [2.9, 2.67, 2.065], false);
  sign.castShadow = false;

  // ───── 일반 진열대 (분위기용) ─────
  const gondolaMat = mat('#e9e1cf');
  const snackColors = ['#e36b3a', '#2f6b9a', '#f2c14e', '#7aa05a', '#c44d58', '#ffffff', '#8e6bb8', '#3aa39a'];
  const snackGeo = box(0.22, 0.28, 0.16);
  const snackMat = mat('#ffffff', { roughness: 0.6 });
  // 왼쪽 벽 쪽 진열대 1개 (도시락 냉장고 시야를 가리지 않게 세로로 배치)
  const gondolas: V3[] = [[-4.25, 0, -0.1]];
  const wallShelf = { x: 2.3, z: -3.85, w: 3.6 };
  const snackCount = gondolas.length * 2 * 3 * 10 + 3 * 12;
  const snacks = new THREE.InstancedMesh(snackGeo, snackMat, snackCount);
  snacks.castShadow = true;
  const dummy = new THREE.Object3D();
  let si = 0;
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const addSnack = (x: number, y: number, z: number, ry = 0) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, ry, 0);
    dummy.updateMatrix();
    snacks.setMatrixAt(si, dummy.matrix);
    snacks.setColorAt(si, new THREE.Color(snackColors[Math.floor(rand() * snackColors.length)]));
    si++;
  };
  gondolas.forEach(([gx, , gz]) => {
    mesh(box(0.7, 1.35, 3), gondolaMat, [gx, 0.675, gz]);
    mesh(box(0.74, 0.05, 3.04), gondolaMat, [gx, 1.37, gz]);
    [-1, 1].forEach((side) => {
      [0.32, 0.72, 1.12].forEach((y) => {
        mesh(box(0.12, 0.03, 3), mat('#d8cdb5'), [gx + side * 0.37, y - 0.02, gz], false);
        for (let k = 0; k < 10; k++) addSnack(gx + side * 0.42, y + 0.13, gz - 1.33 + k * 0.295, Math.PI / 2);
      });
    });
  });
  // 뒷벽 오른쪽 벽면 진열대
  mesh(box(wallShelf.w, 1.9, 0.4), gondolaMat, [wallShelf.x, 0.95, wallShelf.z - 0.05]);
  [0.5, 1.0, 1.5].forEach((y) => {
    mesh(box(wallShelf.w, 0.04, 0.5), mat('#d8cdb5'), [wallShelf.x, y - 0.02, wallShelf.z + 0.1], false);
    for (let k = 0; k < 12; k++) addSnack(wallShelf.x - wallShelf.w / 2 + 0.17 + k * 0.297, y + 0.14, wallShelf.z + 0.18);
  });
  scene.add(snacks);

  // ───── 도시락 냉장 진열대 ─────
  const fridgeMat = mat(COL.green, { roughness: 0.55 });
  const fx = FRIDGE.x;
  const fzc = (FRIDGE.zBack + FRIDGE.zFront) / 2;
  const fdepth = FRIDGE.zFront - FRIDGE.zBack;
  mesh(box(FRIDGE.w, FRIDGE.h, 0.06), mat('#dfe7e2'), [fx, FRIDGE.h / 2, FRIDGE.zBack + 0.03]);
  [-1, 1].forEach((s) => mesh(box(0.08, FRIDGE.h, fdepth), fridgeMat, [fx + (s * FRIDGE.w) / 2, FRIDGE.h / 2, fzc]));
  mesh(box(FRIDGE.w + 0.08, 0.22, fdepth + 0.06), fridgeMat, [fx, FRIDGE.h + 0.11, fzc]);
  mesh(box(FRIDGE.w, 0.5, fdepth), fridgeMat, [fx, 0.25, fzc]);
  const lightStrip = mesh(box(FRIDGE.w - 0.2, 0.03, 0.05), track(new THREE.MeshBasicMaterial({ color: '#fffbe8' })), [fx, FRIDGE.h - 0.03, FRIDGE.zFront - 0.12], false);
  lightStrip.castShadow = false;
  const fridgeLight = new THREE.PointLight('#fff5dc', 3, 4, 1.6);
  fridgeLight.position.set(fx, 1.8, -3.1);
  scene.add(fridgeLight);
  SHELF_Y.forEach((y) => {
    mesh(box(FRIDGE.w - 0.1, 0.03, fdepth - 0.05), mat('#f4f1ea', { roughness: 0.4 }), [fx, y - 0.015, fzc]);
    mesh(box(FRIDGE.w - 0.1, 0.09, 0.03), mat('#e9e4d8'), [fx, y - 0.03, FRIDGE.zFront + 0.01], false);
  });

  // 도시락 12개
  const photoTex = canvasTex(photo as unknown as HTMLCanvasElement);
  const trayGeo = box(0.5, 0.11, 0.36);
  const lidGeo = track(new THREE.PlaneGeometry(0.47, 0.33));
  const tagGeo = box(0.44, 0.075, 0.012);
  const trayMat = mat('#1c1c1c', { roughness: 0.35 });

  interface Dosirak {
    obj: THREE.Group;
    lid: THREE.MeshStandardMaterial;
    tag: THREE.Mesh;
    home: THREE.Vector3;
    group: Group;
    index: number;
  }
  const dosiraks: Dosirak[] = [];
  for (let i = 0; i < inventory.onHand; i++) {
    const rowIdx = i < 6 ? 0 : 1;
    const col = i % 6;
    const g = new THREE.Group();
    const tray = new THREE.Mesh(trayGeo, trayMat);
    tray.castShadow = true;
    g.add(tray);
    const lidMat = track(new THREE.MeshStandardMaterial({ map: photoTex, roughness: 0.35, emissive: COL.orange, emissiveIntensity: 0 }));
    const lid = new THREE.Mesh(lidGeo, lidMat);
    lid.rotation.x = -Math.PI / 2;
    lid.position.y = 0.056;
    g.add(lid);
    g.rotation.x = 0.42; // 앞으로 살짝 기울여 진열
    const home = new THREE.Vector3(fx + (col - 2.5) * 0.585, SHELF_Y[rowIdx] + 0.1, FRIDGE.zBack + 0.45);
    g.position.copy(home);
    scene.add(g);
    const group = GROUP_OF(i);
    const tag = new THREE.Mesh(
      tagGeo,
      track(new THREE.MeshStandardMaterial({ color: GROUP_COLOR[group], emissive: GROUP_COLOR[group], emissiveIntensity: 0.25 })),
    );
    tag.position.set(home.x, SHELF_Y[rowIdx] - 0.03, FRIDGE.zFront + 0.03);
    tag.scale.x = 0.001;
    scene.add(tag);
    dosiraks.push({ obj: g, lid: lidMat, tag, home, group, index: i });
  }
  const sold = dosiraks[SOLD_INDEX];

  // ───── 카운터, POS ─────
  mesh(box(2.5, 1.0, 0.72), mat(COL.green, { roughness: 0.6 }), [COUNTER.x, 0.5, COUNTER.z]);
  mesh(box(2.6, 0.06, 0.82), mat('#f6f1e4', { roughness: 0.4 }), [COUNTER.x, 1.03, COUNTER.z]);
  const pos = new THREE.Group();
  pos.position.set(COUNTER.x + 0.75, 1.06, COUNTER.z - 0.08);
  const posStand = new THREE.Mesh(box(0.08, 0.28, 0.08), mat('#2b2b2b'));
  posStand.position.y = 0.14;
  const posScreen = new THREE.Mesh(box(0.46, 0.32, 0.04), mat('#2b2b2b'));
  posScreen.position.set(0, 0.36, 0);
  posScreen.rotation.x = -0.25;
  pos.add(posStand, posScreen);
  pos.rotation.y = Math.PI;
  pos.traverse((o) => (o.castShadow = true));
  scene.add(pos);

  // ───── QR 포스터 (입간판) ─────
  const posterTex = canvasTex(drawPoster());
  const poster = new THREE.Group();
  poster.position.set(POSTER.x, 0, POSTER.z);
  const posterBoard = new THREE.Mesh(track(new THREE.PlaneGeometry(0.66, 0.946)), track(new THREE.MeshStandardMaterial({ map: posterTex, roughness: 0.5 })));
  posterBoard.position.set(0, 1.08, 0.03);
  posterBoard.rotation.x = -0.12;
  const posterBack = new THREE.Mesh(box(0.74, 1.04, 0.04), mat(COL.green));
  posterBack.position.set(0, 1.08, 0);
  posterBack.rotation.x = -0.12;
  const legs = [-0.3, 0.3].map((x) => {
    const l = new THREE.Mesh(box(0.04, 0.62, 0.04), mat(COL.green));
    l.position.set(x, 0.31, -0.03);
    return l;
  });
  poster.add(posterBack, posterBoard, ...legs);
  poster.rotation.y = 0.15;
  poster.traverse((o) => {
    o.castShadow = true;
  });
  scene.add(poster);
  poster.updateMatrixWorld(true);
  const posterCorners = [
    [-0.3, -0.43],
    [0.3, -0.43],
    [0.3, 0.43],
    [-0.3, 0.43],
  ].map(([x, y]) => posterBoard.localToWorld(new THREE.Vector3(x, y, 0.01)));
  const posterCenter = posterBoard.localToWorld(new THREE.Vector3(0, 0.05, 0.02));

  // ───── 사람 ─────
  function person(shirt: string, pants: string, hair: string, apron?: string) {
    const g = new THREE.Group();
    const skin = mat('#e9c6a2', { roughness: 0.8 });
    const shirtM = mat(shirt);
    const pantsM = mat(pants);
    const legGeo = track(new THREE.CapsuleGeometry(0.075, 0.46, 4, 12));
    const legsArr = [-0.09, 0.09].map((x) => {
      const l = new THREE.Mesh(legGeo, pantsM);
      l.position.set(x, 0.32, 0);
      g.add(l);
      return l;
    });
    const torso = new THREE.Mesh(track(new THREE.CapsuleGeometry(0.2, 0.42, 6, 16)), shirtM);
    torso.position.y = 0.96;
    torso.scale.z = 0.75;
    const armGeo = track(new THREE.CapsuleGeometry(0.058, 0.42, 4, 10));
    const arms = [-0.265, 0.265].map((x) => {
      const a = new THREE.Mesh(armGeo, shirtM);
      a.position.set(x, 0.95, 0);
      g.add(a);
      return a;
    });
    const head = new THREE.Mesh(track(new THREE.SphereGeometry(0.155, 24, 16)), skin);
    head.position.y = 1.47;
    const hairM = new THREE.Mesh(track(new THREE.SphereGeometry(0.163, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55)), mat(hair));
    hairM.position.set(0, 1.49, -0.012);
    g.add(torso, head, hairM);
    if (apron) {
      const ap = new THREE.Mesh(box(0.32, 0.48, 0.02), mat(apron));
      ap.position.set(0, 0.86, 0.155);
      g.add(ap);
    }
    g.traverse((o) => (o.castShadow = true));
    scene.add(g);
    return { g, legs: legsArr, arms };
  }

  const staff = person('#fffdf8', '#33403a', '#2a211c', COL.green);
  staff.g.position.set(COUNTER.x - 0.2, 0, COUNTER.z - 0.75);
  const customer = person('#3b4a6b', '#2b2f3a', '#3a2a20');
  customer.g.position.set(...CUSTOMER_IDLE);

  // ───── 휴대폰 ─────
  const screens = (['scan', 'scanFound', 'product', 'pay', 'done'] as ScreenKind[]).reduce(
    (acc, k) => ({ ...acc, [k]: canvasTex(drawScreen(k, photo)) }),
    {} as Record<ScreenKind, THREE.Texture>,
  );
  const phone = new THREE.Group();
  const phoneBody = new THREE.Mesh(box(0.47, 0.95, 0.045), mat('#15221b', { roughness: 0.3 }));
  const screenMat = track(new THREE.MeshBasicMaterial({ map: screens.product, toneMapped: false }));
  const phoneScreen = new THREE.Mesh(track(new THREE.PlaneGeometry(0.43, 0.876)), screenMat);
  phoneScreen.position.z = 0.0235;
  phone.add(phoneBody, phoneScreen);
  phoneBody.castShadow = true;
  scene.add(phone);
  let currentScreen: ScreenKind = 'product';

  // 스캔 빛 (휴대폰 → 포스터)
  const beamGeo = new THREE.BufferGeometry();
  beamGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(4 * 3 * 3), 3));
  track(beamGeo);
  const beamMat = track(
    new THREE.MeshBasicMaterial({ color: '#7fe0a6', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.frustumCulled = false;
  scene.add(beam);
  const scanLine = new THREE.Mesh(track(new THREE.PlaneGeometry(0.62, 0.025)), track(new THREE.MeshBasicMaterial({ color: '#4be08a', transparent: true, opacity: 0 })));
  posterBoard.add(scanLine);
  scanLine.position.z = 0.012;

  // ───── 포인트 코인 ─────
  const coin = new THREE.Group();
  const coinBody = new THREE.Mesh(track(new THREE.CylinderGeometry(0.17, 0.17, 0.045, 40)), mat(COL.orange, { metalness: 0.35, roughness: 0.3 }));
  coinBody.rotation.x = Math.PI / 2;
  const coinRim = new THREE.Mesh(track(new THREE.TorusGeometry(0.17, 0.018, 8, 40)), mat('#ffb169', { metalness: 0.4, roughness: 0.3 }));
  coin.add(coinBody, coinRim);
  coin.scale.setScalar(0.001);
  scene.add(coin);

  // ───── 3D 위 글자 ─────
  const groupLabelDefs: { g: Group; text: string; idx: number[] }[] = [
    { g: 'order', text: `확정 주문 <b>${inventory.confirmedOrders}</b>`, idx: [0] },
    { g: 'regular', text: `예상 정상가 판매 <b>${inventory.expectedRegularSales}</b>`, idx: [1, 2, 3, 4, 5] },
    { g: 'safety', text: `안전재고 <b>${inventory.safetyStock}</b>`, idx: [6, 7] },
    { g: 'open', text: `한정 판매 <b>${limitedQty}</b>`, idx: [8, 9, 10, 11] },
  ];
  const groupLabels = groupLabelDefs.map((d) => {
    const l = makeLabel(`l3--group l3--${d.g}`, d.text);
    const c = d.idx.reduce((acc, i) => acc.add(dosiraks[i].home), new THREE.Vector3()).divideScalar(d.idx.length);
    l.obj.position.set(c.x, c.y + 0.3, FRIDGE.zFront + 0.25);
    scene.add(l.obj);
    return { ...l, def: d };
  });
  const forecastLabel = makeLabel(
    'l3--forecast',
    `<span class="l3__kicker">수요예측</span><span>${store.saleEnd}까지 정상가 판매 <b>${inventory.expectedRegularSales}개</b> 예상 · 남을 예상 <b>${limitedQty}개</b></span>`,
  );
  forecastLabel.obj.position.set(fx + 0.7, FRIDGE.h + 0.12, FRIDGE.zFront + 0.5);
  scene.add(forecastLabel.obj);
  const openSign = makeLabel('l3--hero', `<b>${limitedQty}개</b> 판매 공개`);
  openSign.obj.position.set(fx + 0.6, 0.38, FRIDGE.zFront + 0.6);
  const approveLabel = makeLabel('l3--counter', '');
  approveLabel.obj.position.set(fx + 2.6, 1.55, FRIDGE.zFront + 0.6);
  scene.add(approveLabel.obj);
  scene.add(openSign.obj);
  const posterLabel = makeLabel('l3--note', `한정 ${limitedQty}개 · QR 주문`);
  posterLabel.obj.position.set(POSTER.x, 1.85, POSTER.z);
  scene.add(posterLabel.obj);
  const scanLabel = makeLabel('l3--scan', 'QR 스캔');
  scene.add(scanLabel.obj);
  const counterLabel = makeLabel('l3--counter', '');
  counterLabel.obj.position.set(COUNTER.x + 1.0, 1.5, COUNTER.z);
  scene.add(counterLabel.obj);
  const customerLabel = makeLabel('l3--customer', '');
  scene.add(customerLabel.obj);
  const coinLabel = makeLabel('l3--coin', `+${pt(points.earned)} 적립`);
  coin.add(coinLabel.obj);
  coinLabel.obj.position.set(0, 0.32, 0);

  // ───── 상태 ─────
  let step = 0;
  let stepTime = 0;
  let stepStart = performance.now();
  let active = true;
  let raf = 0;
  let width = 1;
  let height = 1;

  const camPos = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const shotPos = new THREE.Vector3();
  const shotTarget = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const tmpColor = new THREE.Color();
  const customerTarget = new THREE.Vector3(...CUSTOMER_IDLE);
  const lastCustomer = new THREE.Vector3(...CUSTOMER_IDLE);
  let customerYaw = -Math.PI / 2;
  let walkPhase = 0;

  function shotFor(i: number) {
    const s = SHOTS[i];
    shotTarget.set(...s.target);
    shotPos.set(...s.pos);
  }

  shotFor(0);
  camPos.copy(shotPos);
  camTarget.copy(shotTarget);

  function resize() {
    width = Math.max(1, host.clientWidth);
    height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false);
    labelRenderer.setSize(width, height);
    camera.aspect = width / height;
    // 좁은 화면에서는 카메라를 뒤로 빼지 않고 시야각을 넓혀 가로 폭을 유지 (벽 밖으로 나가지 않게)
    const minAspect = 1.35;
    camera.fov =
      camera.aspect < minAspect
        ? THREE.MathUtils.radToDeg(2 * Math.atan((Math.tan(THREE.MathUtils.degToRad(20)) * minAspect) / camera.aspect))
        : 40;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  const damp = (k: number, dt: number) => (opts.reducedMotion ? 1 : 1 - Math.exp(-k * dt));

  function setScreen(k: ScreenKind) {
    if (k !== currentScreen) {
      screenMat.map = screens[k];
      screenMat.needsUpdate = true;
      currentScreen = k;
    }
  }

  function update(dt: number) {
    const t = opts.reducedMotion ? 99 : stepTime;
    shotFor(step);

    // 카메라
    const kc = damp(2.4, dt);
    camPos.lerp(shotPos, kc);
    camTarget.lerp(shotTarget, kc);
    camera.position.copy(camPos);
    camera.lookAt(camTarget);

    // 도시락: 분류 표시, 흐리게, 강조
    dosiraks.forEach((d) => {
      const g = d.group;
      // 가격표 등장 (예측 단계에서 하나씩)
      const tagOn = step > 0 ? 1 : prog(t, 0.4 + d.index * 0.13, 0.7 + d.index * 0.13);
      d.tag.scale.x += (Math.max(0.001, tagOn) - d.tag.scale.x) * damp(10, dt);
      const approved = step > 1 || (step === 1 && t > 1.8);
      const dim = step === 1 && approved && g !== 'open' ? 1 : 0;
      const glow = g === 'open' && approved && !(d === sold && step >= 4) ? (step === 1 ? 0.55 + 0.25 * Math.sin(stepTime * 4) : 0.25) : 0;
      const c = 1 - dim * 0.55;
      d.lid.color.lerp(tmpColor.setRGB(c, c, c), damp(6, dt));
      d.lid.emissiveIntensity += (glow - d.lid.emissiveIntensity) * damp(6, dt);
      if (d !== sold || step < 4) {
        const forward = g === 'open' && approved ? 0.14 : 0;
        tmp.copy(d.home).add(tmp2.set(0, forward * 0.4, forward));
        d.obj.position.lerp(tmp, damp(8, dt));
        d.obj.rotation.x += (0.42 - d.obj.rotation.x) * damp(8, dt);
      }
    });

    // 고객 위치
    let walking = false;
    if (step <= 1) {
      customerTarget.set(...CUSTOMER_IDLE);
    } else if (step === 2) {
      along(WALK_TO_POSTER, prog(t, 0.1, 1.7), customerTarget);
      walking = t > 0.1 && t < 1.7;
    } else if (step === 3) {
      customerTarget.set(...CUSTOMER_AT_POSTER);
    } else if (step === 4) {
      along(WALK_TO_COUNTER, (t - 0.1) / 2.6, customerTarget);
      walking = t > 0.1 && t < 2.7;
    } else {
      customerTarget.set(...CUSTOMER_AT_COUNTER);
    }
    customer.g.position.lerp(customerTarget, damp(walking ? 14 : 5, dt));
    const moved = tmp.subVectors(customer.g.position, lastCustomer);
    const speed = moved.length() / Math.max(dt, 1e-4);
    lastCustomer.copy(customer.g.position);
    let yawTarget: number;
    if (speed > 0.25) yawTarget = Math.atan2(moved.x, moved.z);
    else if (step <= 1) yawTarget = -Math.PI / 2 - 0.4;
    else if (step <= 3) yawTarget = Math.atan2(POSTER.x - customer.g.position.x, POSTER.z - customer.g.position.z);
    else yawTarget = Math.PI;
    let dy = yawTarget - customerYaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    customerYaw += dy * damp(8, dt);
    customer.g.rotation.y = customerYaw;
    if (speed > 0.25 && !opts.reducedMotion) {
      walkPhase += dt * 10;
      customer.legs[0].rotation.x = Math.sin(walkPhase) * 0.5;
      customer.legs[1].rotation.x = -Math.sin(walkPhase) * 0.5;
      customer.g.position.y = Math.abs(Math.sin(walkPhase)) * 0.03;
    } else {
      customer.legs.forEach((l) => (l.rotation.x *= 0.8));
    }

    // 직원: 픽업 준비 때 냉장고 쪽으로 몸을 돌림
    const staffYaw = step === 4 && t > 0.3 && t < 1.7 ? -Math.PI / 2 - 0.5 : 0;
    staff.g.rotation.y += (staffYaw - staff.g.rotation.y) * damp(6, dt);

    // 고객 손 위치 (가슴 앞)
    const fwd = tmp2.set(Math.sin(customerYaw), 0, Math.cos(customerYaw));
    const hand = new THREE.Vector3().copy(customer.g.position).addScaledVector(fwd, 0.3);
    hand.y = 1.02;

    // 판매된 도시락의 이동 (냉장고 → 카운터 → 고객)
    if (step >= 4) {
      const onCounter = tmp.set(COUNTER.x - 0.35, 1.12, COUNTER.z + 0.05);
      const p1 = step === 4 ? prog(t, 0.5, 1.8) : 1;
      const p2 = step === 4 ? prog(t, 2.9, 3.6) : 1;
      const target = new THREE.Vector3().copy(sold.home).lerp(onCounter, p1);
      target.y += Math.sin(p1 * Math.PI) * 0.7;
      target.lerp(hand, p2);
      sold.obj.position.lerp(target, damp(14, dt));
      sold.obj.rotation.x += ((p1 > 0.5 ? 0 : 0.42) - sold.obj.rotation.x) * damp(8, dt);
      sold.obj.rotation.y = p2 > 0.5 ? customerYaw : 0;
    }

    // 휴대폰: 손에 들기 / 크게 띄워 보여 주기
    const bigPhone = (step === 2 && t > 2.7) || step === 3;
    const raised = step === 2 && t > 1.6;
    const phoneHand = new THREE.Vector3().copy(customer.g.position).addScaledVector(fwd, 0.34);
    phoneHand.y = raised ? 1.38 : 1.08;
    if (step >= 4) phoneHand.addScaledVector(tmp.set(Math.cos(customerYaw), 0, -Math.sin(customerYaw)), 0.28);
    if (bigPhone) {
      // 카메라 앞, 화면 오른쪽에 크게
      const dist = 2.0;
      const dir = tmp.subVectors(shotPos, shotTarget).normalize();
      const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), dir).normalize();
      const camDist = shotPos.distanceTo(shotTarget) - dist;
      const visH = 2 * camDist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const aspect = width / height;
      const scale = (visH * (aspect < 1 ? 0.62 : 0.74)) / 0.95;
      const offX = aspect < 1 ? 0 : visH * aspect * 0.2;
      const p = new THREE.Vector3().copy(shotTarget).addScaledVector(dir, dist).addScaledVector(right, offX);
      p.y += visH * 0.02;
      phone.position.lerp(p, damp(6, dt));
      const s = phone.scale.x + (scale - phone.scale.x) * damp(6, dt);
      phone.scale.setScalar(s);
      // 화면(+z)이 카메라를 향하도록
      const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(shotPos, phone.position, new THREE.Vector3(0, 1, 0)));
      phone.quaternion.slerp(q, damp(6, dt));
    } else {
      phone.position.lerp(phoneHand, damp(10, dt));
      const s = phone.scale.x + (0.17 - phone.scale.x) * damp(8, dt);
      phone.scale.setScalar(s);
      const facing = raised ? customerYaw : customerYaw + Math.PI;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(raised ? 0 : -0.6, facing, 0, 'YXZ'));
      phone.quaternion.slerp(q, damp(8, dt));
    }

    // 화면 내용
    if (step === 2) setScreen(t < 4.0 ? 'scan' : 'scanFound');
    else if (step === 3) setScreen(t < 2.2 ? 'product' : t < 4.6 ? 'pay' : 'done');
    else if (step >= 4) setScreen('done');
    else setScreen('product');

    // 스캔 빛
    const beamOn = step === 2 ? prog(t, 1.9, 2.2) * (1 - prog(t, 3.8, 4.2)) : 0;
    beamMat.opacity = beamOn * 0.28;
    scanLine.material.opacity = beamOn * 0.9;
    scanLine.position.y = Math.sin(stepTime * 3.2) * 0.4;
    if (beamOn > 0) {
      const apex = new THREE.Vector3().copy(phoneHand);
      const arr = beamGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < 4; i++) {
        const a = posterCorners[i];
        const b = posterCorners[(i + 1) % 4];
        arr.set([apex.x, apex.y, apex.z, a.x, a.y, a.z, b.x, b.y, b.z], i * 9);
      }
      beamGeo.attributes.position.needsUpdate = true;
    }
    scanLabel.obj.position.copy(posterCenter).add(tmp.set(0, 0.62, 0.1));

    // 코인
    const coinP = step === 5 ? prog(t, 0.6, 1.8) : 0;
    const coinS = step === 5 ? Math.max(0.001, prog(t, 0.5, 0.9)) : 0.001;
    coin.scale.setScalar(coin.scale.x + (coinS - coin.scale.x) * damp(10, dt));
    coin.position.set(customer.g.position.x + 0.45, 1.25 + coinP * 0.5, customer.g.position.z + 0.25);
    if (!opts.reducedMotion) coin.rotation.y += dt * 3;

    // 글자 켜고 끄기
    groupLabels.forEach((l, i) => {
      const on = step === 0 ? t > 0.7 + l.def.idx[l.def.idx.length - 1] * 0.13 : step === 1 && l.def.g === 'open';
      setOn(l.inner, on);
      l.inner.classList.toggle('is-dim', step === 1 && l.def.g !== 'open');
      void i;
    });
    setOn(forecastLabel.inner, step === 0 && t > 2.4);
    setOn(openSign.inner, step === 1 && t > 2.0);
    setOn(posterLabel.inner, step === 1 && t > 2.6);
    setOn(scanLabel.inner, beamOn > 0.5);

    customerLabel.obj.position.copy(customer.g.position).add(tmp.set(0, 2.05, 0));
    let cText = '';
    if (step === 4) cText = `픽업 번호 <b>${pickup.number}</b>`;
    else if (step === 5 && t > 2.0) cText = `포인트 잔액 <b>${pt(points.balance)}</b>`;
    if (cText) customerLabel.inner.innerHTML = cText;
    setOn(customerLabel.inner, !!cText);

    let kText = '';
    const aText = t < 1.8 ? `점주 승인 대기 · ${product.name} <b>${limitedQty}개</b>` : `<b>✓ 점주 승인</b> · ${product.name} ${limitedQty}개`;
    if (step === 1) approveLabel.inner.innerHTML = aText;
    setOn(approveLabel.inner, step === 1);
    if (step === 4 && t > 1.6) kText = `<b>${pickup.number}</b> · ${product.name} ${pickup.quantity}개`;
    else if (step === 5) kText = `<b>${pickup.number}</b> · 수령 완료`;
    if (kText) counterLabel.inner.innerHTML = kText;
    setOn(counterLabel.inner, !!kText);
    setOn(coinLabel.inner, step === 5 && t > 1.0);
  }

  const clock = new THREE.Clock();
  function loop() {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.1);
    if (!active || document.hidden) return;
    // 단계 안 시간은 실제 시계 기준 (화면 아래 진행 막대와 맞추기 위함)
    stepTime = (performance.now() - stepStart) / 1000;
    update(dt);
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }
  loop();

  return {
    setStep(next: number) {
      if (next === step) return;
      step = next;
      stepTime = 0;
      stepStart = performance.now();
    },
    setActive(on: boolean) {
      if (on && !active) {
        clock.getDelta();
        stepStart = performance.now(); // 다시 보일 때 현재 단계를 처음부터 (자동 재생 타이머와 맞춤)
      }
      active = on;
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
      labelRenderer.domElement.remove();
    },
  };
}
