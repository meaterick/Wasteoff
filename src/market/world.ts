import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import atlasUrl from '../assets/package-labels.webp';
import { departments, items, type Destination, type Item } from '../catalog';
import { makeAvatar } from './avatar';
import { counter, fixtures, room } from './layout';
import { canvasMap, labelMap, priceMap, repeatedSurface, signMap } from './textures';

export type Target = { type: 'item'; sku: string } | { type: 'area'; id: Destination };
type P = [number, number, number];
type Stocked = { meshes: THREE.InstancedMesh[]; shown: number };
const floorWidth = room.right - room.left;
const floorDepth = room.front - room.rear;

export function buildWorld(scene: THREE.Scene, onTexturesReady: () => void) {
  const resources = new Set<{ dispose(): void }>();
  const keep = <T extends { dispose(): void }>(resource: T): T => { resources.add(resource); return resource; };
  const coat = (color: string, options: THREE.MeshStandardMaterialParameters = {}) =>
    keep(new THREE.MeshStandardMaterial({ color, roughness: 0.66, ...options }));
  const flat = (options: THREE.MeshBasicMaterialParameters) => keep(new THREE.MeshBasicMaterial({ toneMapped: false, ...options }));
  const walls = coat('#e9e9df');
  const trim = coat('#dedfd4', { roughness: 0.49 });
  const black = coat('#272f2e');
  const pine = coat('#264b3c', { roughness: 0.5 });
  const green = coat('#66816c');
  const steel = coat('#b9c3be', { metalness: 0.25, roughness: 0.38 });
  const shades = coat('#a9b3a5');
  const lateShelf = coat('#bd8747', { roughness: 0.51 });
  const shelfWhite = coat('#e4e8dc', { roughness: 0.45 });
  const light = coat('#fafaf0', { emissive: '#fff7e3', emissiveIntensity: 0.82 });
  const glass = keep(new THREE.MeshPhysicalMaterial({
    color: '#b8d4d1', metalness: 0.18, roughness: 0.12, transparent: true, opacity: 0.18, depthWrite: false, clearcoat: 0.7,
  }));
  const targets: THREE.Mesh[] = [];
  const stocks = new Map<string, Stocked>();
  const hitMat = flat({ visible: false });

  function put(geometry: THREE.BufferGeometry, material: THREE.Material, position: P, parent: THREE.Object3D = scene) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    parent.add(mesh);
    return mesh;
  }

  function box(w: number, h: number, d: number, material: THREE.Material, position: P,
    parent: THREE.Object3D = scene, radius = 0, cast = true) {
    const geometry = radius ? new RoundedBoxGeometry(w, h, d, 2, radius) : new THREE.BoxGeometry(w, h, d);
    const mesh = put(keep(geometry), material, position, parent);
    mesh.castShadow = cast && !material.transparent;
    mesh.receiveShadow = !material.transparent;
    return mesh;
  }

  function panel(w: number, h: number, material: THREE.Material, position: P, parent: THREE.Object3D = scene) {
    return put(keep(new THREE.PlaneGeometry(w, h)), material, position, parent);
  }

  function horizontal(w: number, d: number, material: THREE.Material, position: P) {
    const mesh = panel(w, d, material, position);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    return mesh;
  }

  function sign(title: string, subtitle: string, w: number, h: number, position: P,
    parent: THREE.Object3D = scene, bg = '#234538', fg = '#f1f4e7') {
    return panel(w, h, flat({ map: keep(signMap(title, subtitle, bg, fg, w / h)) }), position, parent);
  }

  function fixtureTarget(w: number, h: number, d: number, y: number, z: number, target: Target,
    parent: THREE.Object3D, x = 0) {
    const hit = box(w, h, d, hitMat, [x, y, z], parent, 0, false);
    hit.receiveShadow = false;
    hit.userData.target = target;
    targets.push(hit);
  }

  function surface(kind: 'porcelain' | 'pavement' | 'asphalt', u: number, v: number) {
    const map = keep(repeatedSurface(kind));
    map.repeat.set(u, v);
    return coat('#ffffff', { map, roughness: kind === 'porcelain' ? 0.43 : 0.86 });
  }

  horizontal(floorWidth, floorDepth, surface('porcelain', 12, 12), [0, 0, (room.rear + room.front) / 2]);
  horizontal(18, 3.75, surface('pavement', 16, 2.9), [0, -0.041, 8.35]);
  horizontal(54, 28, surface('asphalt', 27, 14), [0, -0.15, 21.8]);
  box(23.5, 0.12, 0.32, trim, [0, -0.092, 10.3], scene, 0.02);
  box(floorWidth + 0.26, room.ceiling, 0.18, walls, [0, room.ceiling / 2, room.rear - 0.03]);
  for (const x of [room.left - .06, room.right + .06]) {
    box(0.19, room.ceiling, floorDepth + 0.08, walls, [x, room.ceiling / 2, 0]);
    box(0.054, 0.20, floorDepth, pine, [x < 0 ? x + 0.116 : x - 0.116, .14, 0]);
    box(0.041, 0.09, floorDepth, green, [x < 0 ? x + 0.108 : x - 0.108, 2.79, 0]);
  }
  box(floorWidth, .11, floorDepth + .24, coat('#f1f0e8', { emissive: '#d9d7c9', emissiveIntensity: .18 }), [0, room.ceiling + 0.045, 0], scene, 0, false);
  for (let i = -4; i <= 4; i++) {
    box(.018, .022, floorDepth, shades, [i * 1.45, room.ceiling - .012, 0], scene, 0, false);
    box(floorWidth, .023, .016, shades, [0, room.ceiling - .012, i * 1.45], scene, 0, false);
  }
  for (const x of [-4.65, -1.59, 1.59, 4.65]) for (const z of [-4.65, -1.55, 1.55, 4.65]) {
    box(0.66, .055, 1.30, trim, [x, 3.287, z], scene, 0.018, false);
    box(0.585, .028, 1.23, light, [x, 3.246, z], scene, 0.012, false);
  }
  for (const z of [-2.95, 2.95]) {
    box(0.95, .055, .95, trim, [0, 3.28, z], scene, .022, false);
    for (let j = -3; j <= 3; j++) box(.71, .014, .015, shades, [0, 3.244, z + j * .089], scene, 0, false);
  }

  box(floorWidth, .14, .07, pine, [0, 2.64, room.rear + .115]);
  box(floorWidth, .067, .07, lateShelf, [0, 2.53, room.rear + .116]);
  sign('WASTEOFF MART', '캠퍼스점  ·  24 HOURS', 4.35, .65, [-2.87, 2.94, room.rear + .124], scene, '#e8ede1', '#214a3a');
  sign('COLD DRINKS', '냉장 음료', 3.30, .63, [3.62, 2.94, room.rear + .124], scene, '#e8ede1', '#214a3a');

  // Front glazing, framed doorway and illuminated fascia.
  const door = new THREE.Group();
  door.position.z = room.front;
  scene.add(door);
  for (const side of [-1, 1]) {
    const x = side * 3.85;
    box(5.56, 2.53, .047, glass, [x, 1.40, 0], door);
    box(5.57, .13, .17, pine, [x, .15, 0], door);
    box(5.56, .076, .122, pine, [x, 1.115, 0], door);
    box(5.56, .12, .16, pine, [x, 2.70, 0], door);
  }
  for (const x of [-6.52, -4.75, -2.92, -1.1, 1.1, 2.92, 4.75, 6.52]) {
    box(.086, 2.64, .15, pine, [x, 1.36, 0], door, .014);
  }
  box(13.18, .53, .27, pine, [0, 3.04, .035], door, .02, false);
  box(13.20, .064, .284, lateShelf, [0, 2.77, .04], door, 0, false);
  sign('WASTEOFF MART', '24 HOURS', 3.39, .46, [-.55, 3.05, .177], door, '#2a4c3e', '#e5f3d9');
  box(2.10, .042, .53, steel, [0, .012, .025], door, 0, false);
  box(.30, .070, .11, black, [0, 2.65, -.12], door, .017, false);
  const sliding = [-1, 1].map(side => {
    const pane = new THREE.Group();
    pane.position.set(side * .535, 0, .046);
    door.add(pane);
    box(1.04, 2.30, .021, glass, [0, 1.23, 0], pane, 0, false);
    for (const x of [-.511, .511]) box(.027, 2.32, .061, steel, [x, 1.23, 0], pane, .008, false);
    for (const y of [.079, 2.391]) box(1.049, .043, .061, steel, [0, y, 0], pane, .009, false);
    box(1.026, .067, .028, green, [0, 1.167, .019], pane, .004, false);
    return pane;
  });
  const mat = flat({ map: keep(signMap('WELCOME', 'WASTEOFF CAMPUS', '#2a3b33', '#c7d2b7', 2.9)) });
  horizontal(2.5, .86, mat, [0, .006, 5.82]);

  const night = ['#1b2632', '#232b37', '#2d3342'].map(color => coat(color, { roughness: .91 }));
  const windowLight = coat('#d3b17a', { emissive: '#d99864', emissiveIntensity: .42 });
  for (let i = 0; i < 10; i++) {
    const x = i * 3.53 - 16;
    const h = 3.4 + (i * 17 % 7) * .69;
    box(3.04, h, 2.3, night[i % 3], [x, h / 2 - .10, 17.7], scene, 0, false);
    for (let oy = 1.1; oy < h - .15; oy += .81) for (let ox = -1.05; ox <= 1.1; ox += .66) {
      if (Math.floor((ox + 3) * 10 + oy * 17 + i * 5) % 3) box(.32, .35, .02, windowLight, [x + ox, oy, 16.54], scene, .01, false);
    }
  }
  for (const x of [-5.8, 5.8]) {
    box(.081, 3.45, .08, black, [x, 1.72, 9.95], scene, 0, false);
    box(.49, .10, .23, steel, [x, 3.43, 9.85], scene, .02, false);
    box(.34, .022, .16, light, [x, 3.36, 9.85], scene, .01, false);
  }
  for (let i = -4; i <= 4; i++) box(1.0, .006, .08, coat('#c9ab70'), [i * 2.66, -.136, 12.55], scene, 0, false);

  const atlas = keep(new THREE.TextureLoader().load(atlasUrl, onTexturesReady, undefined, onTexturesReady));
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.anisotropy = 4;
  const packageMaps = new Map<number, THREE.Texture>();
  function mapFor(item: Item) {
    if (item.art < 0) return keep(labelMap(item));
    const existing = packageMaps.get(item.art);
    if (existing) return existing;
    const texture = keep(atlas.clone());
    texture.repeat.set(.2475, .3298);
    texture.offset.set(item.art % 4 / 4 + .00125, (2 - Math.floor(item.art / 4)) / 3 + .0017);
    texture.needsUpdate = true;
    packageMaps.set(item.art, texture);
    return texture;
  }

  const sizeFor: Record<Item['form'], P> = {
    tray: [.37, .067, .244], wedge: [.186, .171, .105], roll: [.278, .068, .10], cup: [.128, .137, .128],
    bag: [.184, .237, .057], bar: [.143, .060, .092], bottle: [.076, .27, .076], can: [.073, .144, .073], carton: [.083, .185, .068],
  };

  function stock(item: Item, group: THREE.Group, shelfPositions: P[], stand: boolean) {
    const [w, h, d] = sizeFor[item.form];
    const container = coat(item.form === 'tray' ? '#343835' : item.color, { roughness: item.form === 'can' ? .33 : .57 });
    const print = coat('#ffffff', { map: mapFor(item), roughness: .59 });
    const parts: [THREE.BufferGeometry, THREE.Material, P, number][] = [];

    if (item.form === 'bottle' || item.form === 'can' || item.form === 'cup') {
      const bottle = item.form === 'bottle';
      const cup = item.form === 'cup';
      const shell = keep(new THREE.CylinderGeometry(w * .50, w * (cup ? .35 : .50), h, 14));
      parts.push([shell, container, [0, 0, 0], 0]);
      const label = keep(new THREE.CylinderGeometry(w * .507, w * (cup ? .40 : .507), h * .76, 14, 1, true, -.85, 1.70));
      parts.push([label, print, [0, -.01, .0008], 0]);
      const cap = keep(new THREE.CylinderGeometry(w * (bottle ? .28 : .49), w * .49, .016, 14));
      parts.push([cap, bottle ? steel : (cup ? container : steel), [0, h / 2 + .009, 0], 0]);
    } else if (item.form === 'wedge') {
      const shape = new THREE.Shape();
      shape.moveTo(-w / 2, -h / 2);
      shape.lineTo(w / 2, -h / 2);
      shape.lineTo(.013, h / 2);
      shape.quadraticCurveTo(0, h / 2 + .014, -.013, h / 2);
      shape.closePath();
      const face = keep(new THREE.ShapeGeometry(shape));
      const uv = face.getAttribute('uv');
      const p = face.getAttribute('position');
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getY(i) + h / 2) / (h + .02));
      parts.push([keep(new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false })), container, [0, 0, -d * .5], 0]);
      parts.push([face, print, [0, 0, d * .5 + .001], 0]);
    } else {
      const body = keep(new RoundedBoxGeometry(w, h, d, 2, Math.min(d / 4, .023)));
      parts.push([body, container, [0, 0, 0], 0]);
      if (stand) {
        parts.push([keep(new THREE.PlaneGeometry(w * .91, h * .90)), print, [0, 0, d / 2 + .001], 0]);
      } else {
        parts.push([keep(new THREE.PlaneGeometry(w * .92, d * .93)), print, [0, h / 2 + .001, 0], -Math.PI / 2]);
      }
    }

    const dummy = new THREE.Object3D();
    const meshes = parts.map(([geometry, material, offset, rot]) => {
      const mesh = keep(new THREE.InstancedMesh(geometry, material, shelfPositions.length));
      shelfPositions.forEach(([x, y, z], i) => {
        dummy.position.set(x + offset[0], y + h / 2 + offset[1], z + offset[2]);
        dummy.rotation.set(rot, 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    });
    stocks.set(item.sku, { meshes, shown: shelfPositions.length });
  }

  for (const department of departments) {
    const layout = fixtures[department.id];
    const rotated = layout.rotation !== 0;
    const w = rotated ? layout.depth : layout.width;
    const d = rotated ? layout.width : layout.depth;
    const g = new THREE.Group();
    g.rotation.y = layout.rotation;
    g.position.set(layout.x, 0, layout.z);
    scene.add(g);
    const merch = items.filter(item => item.department === department.id);
    const freezer = department.id === 'freezer';
    const cool = department.id === 'drinks' || department.id === 'fresh' || department.id === 'rescue';
    const late = department.id === 'rescue';
    const frame = late ? lateShelf : pine;
    const levels = freezer ? [.85] : cool ? [.29, .71, 1.13, 1.55] : [.26, .58, .90, 1.22];
    const { height } = layout;

    box(w, .17, d, frame, [0, .097, 0], g, .026);
    box(w, height - .18, .078, cool ? shades : shelfWhite, [0, height / 2, -d / 2 + .07], g);
    for (const x of [-w / 2 + .053, w / 2 - .053]) box(.106, height, d, frame, [x, height / 2, 0], g, .024);
    if (freezer) {
      box(w, .76, .09, shelfWhite, [0, .44, d / 2 - .047], g, .024);
      box(w - .13, .059, d - .05, glass, [0, .98, 0], g, .024);
      const label = sign('FROZEN', '냉동 보관', 1.57, .29, [0, .59, d / 2 + .003], g, '#234538', '#e1f0e6');
      label.renderOrder = 1;
      for (const x of [-w / 4, w / 4]) box(.071, .079, .26, steel, [x, .986, .14], g, .022);
    } else {
      box(w, cool ? .24 : .17, d, frame, [0, height - .09, 0], g, .022);
      sign(department.label, department.name, Math.min(w - .2, 2.8), cool ? .203 : .141,
        [-Math.max(0, (w - 2.98) / 2), height - .084, d / 2 + .006], g,
        late ? '#b5793d' : '#264b3c', '#f4f1dd');
    }
    if (cool) {
      for (let column = 1; column < merch.length; column++) {
        const x = (column / merch.length - .5) * (w - .15);
        box(.048, height - .31, .048, steel, [x, height / 2 - .05, d / 2 - .033], g, .008);
        if (department.id === 'drinks') box(.043, .71, .088, steel, [x + .075, .96, d / 2 + .019], g, .014);
      }
      for (const x of [-w / 2 + .14, w / 2 - .14]) {
        box(.032, height - .43, .039, light, [x, height / 2 - .08, d / 2 - .081], g, 0, false);
      }
    }

    for (const y of levels) {
      box(w - .17, .062, d - .087, shelfWhite, [0, y, 0], g, .014);
      box(w - .184, .060, .045, steel, [0, y - .009, d / 2 - .031], g, .01);
      if (cool) box(w - .20, .019, .041, light, [0, y + .026, d / 2 - .085], g, 0, false);
    }

    const bayWidth = (w - .22) / merch.length;
    merch.forEach((item, index) => {
      const center = (index - (merch.length - 1) / 2) * bayWidth;
      const [itemW] = sizeFor[item.form];
      const slotsAcross = Math.max(2, Math.floor((freezer ? 2.0 : bayWidth - .07) / (itemW + .021)));
      const placements: P[] = [];
      const levelOrder = [...levels].sort((a, b) => Math.abs(a - 1.11) - Math.abs(b - 1.11));
      const setbacks = freezer || cool ? [.174, .406] : [.165, .321];
      for (const setback of setbacks) {
        for (const y of levelOrder) {
          for (let i = 0; i < slotsAcross; i++) {
            const x = center + (i - (slotsAcross - 1) / 2) * (itemW + .026);
            placements.push([x, y + .037, d / 2 - setback]);
          }
        }
      }
      stock(item, g, placements, item.form !== 'tray' && item.form !== 'roll' && item.form !== 'bar');
      for (const y of levels) panel(.267, .098, flat({ map: keep(priceMap(item)) }), [center, y - .015, d / 2 - .004], g);
      fixtureTarget(bayWidth - .085, freezer ? .33 : height - .30, .10,
        freezer ? .91 : height / 2 - .025, d / 2 + .013, { type: 'item', sku: item.sku }, g, center);
    });
    if (department.id === 'snacks' || department.id === 'noodles') {
      const featured = merch[0];
      const endZ = layout.z + layout.depth / 2;
      box(.786, 1.06, .044, shelfWhite, [layout.x, .80, endZ + .023], scene, .021);
      panel(.74, .74, coat('#ffffff', { map: mapFor(featured) }), [layout.x, .943, endZ + .047]);
      sign('NEW', featured.label, .71, .234, [layout.x, .427, endZ + .047], scene, '#f2eee1', '#2e5540');
      box(.857, .069, .11, steel, [layout.x, 1.389, endZ + .022], scene, .015);
    }
    if (department.id === 'drinks') {
      const frost = keep(new THREE.MeshPhysicalMaterial({
        color: '#a5bfba', roughness: .17, opacity: .104, transparent: true, depthWrite: false,
      }));
      for (let i = 0; i < merch.length; i++) {
        const x = (i - (merch.length - 1) / 2) * bayWidth;
        box(bayWidth - .049, height - .395, .024, frost, [x, 1.073, d / 2 + .017], g, .008, false);
      }
    }
  }

  const notices = [
    { sku: 'ramen', x: room.left + .054, z: 1.31, rotation: Math.PI / 2, title: 'HOT MEAL', subtitle: '따뜻한 간편식' },
    { sku: 'lime', x: room.right - .054, z: -1.52, rotation: -Math.PI / 2, title: 'COLD & FRESH', subtitle: '냉장 음료 코너' },
  ];
  for (const notice of notices) {
    const group = new THREE.Group();
    group.position.set(notice.x, 2.33, notice.z);
    group.rotation.y = notice.rotation;
    scene.add(group);
    box(.87, .99, .031, black, [0, 0, -.025], group, .013, false);
    const product = items.find(item => item.sku === notice.sku)!;
    panel(.80, .75, coat('#ffffff', { map: mapFor(product) }), [0, .097, 0], group);
    sign(notice.title, notice.subtitle, .80, .198, [0, -.371, .002], group, '#e5e9d8', '#254538');
  }
  const backDoor = new THREE.Group();
  backDoor.position.set(-.20, 0, room.rear + .125);
  scene.add(backDoor);
  box(.90, 2.18, .041, steel, [0, 1.09, 0], backDoor, .01, false);
  box(.80, 2.04, .045, coat('#b1b5ac'), [0, 1.045, .026], backDoor, .014, false);
  box(.119, .035, .081, black, [.239, 1.021, .086], backDoor, .011, false);
  sign('STAFF ONLY', '직원 전용', .60, .175, [0, 1.55, .051], backDoor, '#e9e9e0', '#303d32');

  const wood = coat('#8b745a', { roughness: .7 });
  const counterTop = coat('#555d56', { roughness: .37 });
  const till = new THREE.Group();
  till.position.set(counter.x, 0, counter.z);
  scene.add(till);
  box(counter.width, 1.04, counter.depth, pine, [0, .55, 0], till, .065);
  box(counter.width + .05, .087, counter.depth + .06, counterTop, [0, 1.115, 0], till, .036);
  box(counter.width - .08, .09, .046, steel, [0, .13, -counter.depth / 2 - .001], till, .015);
  for (let i = 0; i < 18; i++) box(.037, .68, .025, wood, [-1.56 + .18 * i, .55, -.531], till, .007);

  const registerSign = sign('CHECKOUT', '계산대  ·  POS', 1.46, .35, [0, .76, -.556], till, '#264b3c', '#e8f4d8');
  registerSign.rotation.y = Math.PI;
  box(.41, .095, .31, black, [-.58, 1.20, .08], till, .028);
  box(.075, .20, .086, black, [-.58, 1.32, .09], till, .017);
  box(.64, .417, .115, black, [-.58, 1.54, .092], till, .035);
  const posScreen = sign('WELCOME', 'SCAN YOUR ITEMS', .555, .327, [-.58, 1.545, .027], till, '#1b3027', '#c8e3a4');
  posScreen.rotation.y = Math.PI;
  box(.21, .082, .26, black, [.43, 1.196, -.173], till, .026);
  box(.158, .010, .175, coat('#233c36', { emissive: '#427764', emissiveIntensity: .29 }), [.43, 1.241, -.182], till, .016);
  box(.36, .035, .27, steel, [.95, 1.172, -.071], till, .018);
  const scan = coat('#712013', { emissive: '#e84c31', emissiveIntensity: .75 });
  box(.23, .008, .014, scan, [.95, 1.194, -.073], till, .006, false);
  box(.24, .168, .24, black, [-1.22, 1.248, .21], till, .025);
  box(.15, .018, .098, walls, [-1.22, 1.342, .153], till, .004, false);
  fixtureTarget(counter.width, 1.70, counter.depth + .035, .86, 0, { type: 'area', id: 'register' }, till);

  const clerk = makeAvatar(keep, true);
  clerk.object.position.set(4.87, 0, 4.93);
  scene.add(clerk.object);

  // Microwave and coffee station, basket stand and seating by the windows.
  box(.78, .91, 2.17, pine, [-5.89, .46, 3.42], scene, .04);
  box(.91, .075, 2.26, counterTop, [-5.89, .95, 3.42], scene, .025);
  for (const z of [2.87, 3.51, 4.09]) {
    box(.51, .35, .47, steel, [-5.90, 1.166, z], scene, .025);
    box(.041, .215, .34, black, [-5.626, 1.166, z], scene, .017);
    box(.04, .160, .055, trim, [-5.596, 1.174, z - .12], scene, .012);
  }
  const self = sign('셀프 코너', 'HEAT & EAT', 1.73, .39, [-6.474, 1.83, 3.46], scene, '#e9eee0', '#2d513e');
  self.rotation.y = Math.PI / 2;
  box(2.18, .083, .64, wood, [-4.60, .97, 5.8], scene, .026);
  for (const x of [-5.48, -3.70]) box(.09, .94, .08, black, [x, .47, 5.81], scene, .012);
  for (const x of [-5.27, -4.54, -3.82]) {
    const seat = put(keep(new THREE.CylinderGeometry(.218, .225, .108, 18)), pine, [x, .56, 5.68]);
    seat.castShadow = true;
    put(keep(new THREE.CylinderGeometry(.042, .07, .54, 12)), steel, [x, .28, 5.68]);
  }
  box(.68, .72, .56, pine, [5.65, .37, 5.91], scene, .033);
  for (let i = 0; i < 5; i++) box(.68, .05, .56, i % 2 ? green : pine, [5.65, .74 + i * .045, 5.91], scene, .017);
  box(1.7, .07, .40, wood, [-3.4, .47, 8.49], scene, .017);
  box(1.7, .19, .065, wood, [-3.4, .71, 8.70], scene, .012);
  for (const x of [-4.10, -2.70]) box(.076, .47, .33, black, [x, .22, 8.49]);

  const shadow = keep(canvasMap(64, 64, ctx => {
    const ink = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    ink.addColorStop(0, '#17252890');
    ink.addColorStop(1, '#17252800');
    ctx.fillStyle = ink;
    ctx.fillRect(0, 0, 64, 64);
  }));
  const playerShadow = horizontal(.88, .85, flat({ map: shadow, transparent: true, depthWrite: false }), [0, .008, 0]);
  const player = makeAvatar(keep);
  scene.add(player.object);

  return {
    player,
    playerShadow,
    targets,
    setDoor(open: number) {
      sliding.forEach((pane, index) => { pane.position.x = (index ? 1 : -1) * (.535 + 1.014 * open); });
    },
    setStock(quantities: Record<string, number>) {
      for (const [sku, { meshes, shown }] of stocks) {
        const count = Math.min(shown, quantities[sku] ?? 0);
        for (const mesh of meshes) {
          if (mesh.count !== count) {
            mesh.count = count;
            mesh.computeBoundingSphere();
          }
        }
      }
    },
    dispose() {
      resources.forEach(resource => resource.dispose());
    },
  };
}
