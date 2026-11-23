import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { products, type ProductId } from '../model';
import { dropShadow, floorTiles, nightWindow, packageLabel, sign } from './art';

export type Target = ProductId | 'register';

type Position = [number, number, number];
type Fixture = { anchor: THREE.Vector3; hit: THREE.Mesh };

const placements: Record<ProductId, { position: Position; rows: number; spacing: number }> = {
  dosirak: { position: [-2.32, 0.91, 0.93], rows: 3, spacing: 0.53 },
  sandwich: { position: [-3.48, 1.48, -2.75], rows: 3, spacing: 0.43 },
  onigiri: { position: [-0.48, 1.48, -2.75], rows: 3, spacing: 0.40 },
  kimbap: { position: [-0.25, 0.91, 1.58], rows: 3, spacing: 0.53 },
};

export function buildMarket(scene: THREE.Scene) {
  const resources = new Set<{ dispose(): void }>();
  const track = <T extends { dispose(): void }>(resource: T) => {
    resources.add(resource);
    return resource;
  };
  const standard = (color: string, options: THREE.MeshStandardMaterialParameters = {}) =>
    track(new THREE.MeshStandardMaterial({ color, roughness: 0.73, ...options }));
  const flat = (options: THREE.MeshBasicMaterialParameters) =>
    track(new THREE.MeshBasicMaterial({ toneMapped: false, ...options }));
  const pine = standard('#234b40');
  const dark = standard('#18312a');
  const shell = standard('#deded0');
  const teal = standard('#a7c8ae');
  const cream = standard('#f6edda');
  const yellow = standard('#e8b760');
  const mintLight = standard('#cdeed6', { emissive: '#77bfa0', emissiveIntensity: 0.32 });
  const warmLight = standard('#fce7b7', { emissive: '#ffc46b', emissiveIntensity: 0.55 });

  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], position: Position,
    group: THREE.Object3D = scene, shadow = true) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position);
    object.castShadow = shadow;
    object.receiveShadow = shadow;
    group.add(object);
    return object;
  }

  function box(w: number, h: number, d: number, material: THREE.Material, position: Position,
    group?: THREE.Object3D, radius = 0) {
    const geometry = radius ? new RoundedBoxGeometry(w, h, d, 2, radius) : new THREE.BoxGeometry(w, h, d);
    return mesh(track(geometry), material, position, group);
  }

  function plane(w: number, h: number, material: THREE.Material, position: Position, rotationX = 0, rotationY = 0) {
    const object = mesh(track(new THREE.PlaneGeometry(w, h)), material, position, scene, false);
    object.rotation.set(rotationX, rotationY, 0);
    return object;
  }

  function wallSign(title: string, note: string, width: number, height: number, position: Position,
    bg = '#24493b', fg = '#e5f3d5') {
    return plane(width, height, flat({ map: track(sign(title, note, bg, fg, Math.round(128 * width / height))) }), position);
  }

  const shadow = flat({ map: track(dropShadow()), transparent: true, depthWrite: false, opacity: 0.73 });
  plane(17.5, 12.5, shadow, [0, -0.59, 0.13], -Math.PI / 2);
  box(11.93, 0.33, 8.0, dark, [0, -0.39, 0], undefined, 0.13);
  box(11.78, 0.30, 7.87, pine, [0, -0.16, 0], undefined, 0.08);
  const floor = plane(11.55, 7.66, standard('#ffffff', { map: track(floorTiles()) }), [0, 0, 0], -Math.PI / 2);
  floor.receiveShadow = true;
  box(11.66, 0.06, 0.10, teal, [0, -0.01, 3.87]);
  box(0.10, 0.06, 7.75, teal, [5.79, -0.01, 0]);

  // The open front and right wall keep the aisles and register in view.
  box(11.68, 3.25, 0.19, shell, [0, 1.62, -3.75]);
  box(0.20, 3.25, 7.61, shell, [-5.77, 1.62, 0.02]);
  box(11.83, 0.14, 0.33, pine, [0, 3.21, -3.72], undefined, 0.025);
  box(0.31, 0.14, 7.77, pine, [-5.76, 3.21, 0.05], undefined, 0.025);
  box(11.58, 0.12, 0.05, pine, [0, 2.66, -3.63]);
  box(0.05, 0.12, 7.42, pine, [-5.65, 2.66, 0.01]);
  box(11.56, 0.06, 0.05, yellow, [0, 2.55, -3.63]);
  box(0.05, 0.06, 7.42, yellow, [-5.65, 2.55, 0.01]);
  box(11.55, 0.16, 0.10, pine, [0, 0.08, -3.62]);
  box(0.10, 0.16, 7.52, pine, [-5.63, 0.08, 0.02]);

  const windowMaterial = flat({ map: track(nightWindow()) });
  for (const z of [-2.44, 0.12, 2.68]) {
    box(0.10, 1.63, 2.35, dark, [-5.62, 1.58, z], undefined, 0.035);
    plane(2.23, 1.50, windowMaterial, [-5.56, 1.58, z], 0, Math.PI / 2);
    box(0.061, 1.50, 0.035, teal, [-5.52, 1.58, z]);
    box(0.072, 0.029, 2.23, teal, [-5.51, 1.01, z]);
  }
  wallSign('WASTEOFF', 'MART  /  FRESH TO THE END', 3.98, 0.66, [1.6, 2.83, -3.59], '#24493b', '#deeead');
  box(4.91, 0.09, 0.10, warmLight, [-2.9, 3.02, -3.54]);
  box(1.65, 0.09, 0.10, warmLight, [4.66, 3.02, -3.54]);

  function refrigerator(x: number, title: string) {
    const width = 2.84;
    const front = -2.32;
    box(width, 0.28, 1.03, pine, [x, 0.18, -2.89], undefined, 0.035);
    box(width, 2.15, 0.10, teal, [x, 1.22, -3.38]);
    for (const side of [-1, 1]) {
      box(0.12, 2.14, 1.04, pine, [x + side * (width / 2 - 0.06), 1.22, -2.90]);
      box(0.028, 1.65, 0.049, mintLight, [x + side * (width / 2 - 0.16), 1.14, front - 0.01]);
    }
    for (const y of [0.43, 0.90, 1.33, 1.84]) {
      box(width - 0.22, 0.08, 0.95, cream, [x, y, -2.89]);
      box(width - 0.22, 0.056, 0.046, teal, [x, y - 0.02, front - 0.065]);
      for (let i = 0; i < 5; i++) {
        box(0.16, 0.037, 0.018, whiteTag, [x - 0.99 + i * 0.49, y - 0.016, front - 0.035]);
      }
    }
    box(width + 0.08, 0.30, 1.09, pine, [x, 2.25, -2.89], undefined, 0.04);
    wallSign(title, '', width - 0.16, 0.25, [x, 2.24, -2.337]);
    box(width - 0.25, 0.056, 0.089, mintLight, [x, 2.10, -2.42]);
  }

  const whiteTag = standard('#ecead8');
  refrigerator(-3.48, 'SANDWICHES');
  refrigerator(-0.48, 'RICE BALLS');
  refrigerator(3.78, 'COLD DRINKS');

  // Repeated filler products share geometry and draw calls.
  const snacks: { X: number; Y: number; Z: number; color: string; sx?: number; sy?: number; sz?: number }[] = [];
  const snacksColors = ['#d8bf66', '#a9c886', '#e88d73', '#dfd2aa', '#89babb', '#bca7cc', '#799b80'];
  for (const x of [-3.48, -0.48]) {
    [0.54, 1.02, 1.97].forEach((y, row) => {
      for (let i = 0; i < 8; i++) {
        snacks.push({ X: x - 1.06 + i * 0.30, Y: y, Z: -2.85 + (i % 3) * 0.08,
          color: snacksColors[(i + row * 3 + (x < -1 ? 1 : 3)) % snacksColors.length], sy: 0.70 + (i % 4) * 0.15 });
      }
    });
  }
  const x = -4.63, z = 0.12;
  box(1.16, 0.12, 2.67, pine, [x, 0.06, z]);
  box(0.10, 1.25, 2.58, cream, [x, 0.71, z]);
  for (const y of [0.26, 0.73, 1.27]) {
    box(1.18, 0.068, 2.61, teal, [x, y, z], undefined, 0.023);
    for (let i = 0; i < 8; i++) {
      snacks.push({ X: x + 0.29, Y: y + 0.15, Z: z - 1.08 + i * 0.30,
        color: snacksColors[(i + Math.round(y * 10)) % snacksColors.length], sy: 0.80 + i % 3 * 0.22 });
    }
  }
  const snackMesh = new THREE.InstancedMesh(
    track(new THREE.BoxGeometry(0.23, 0.24, 0.17)), standard('#ffffff'), snacks.length,
  );
  const slot = new THREE.Object3D();
  snacks.forEach((snack, index) => {
    slot.position.set(snack.X, snack.Y, snack.Z);
    slot.scale.set(snack.sx ?? 1, snack.sy ?? 1, snack.sz ?? 1);
    slot.rotation.y = index % 2 ? -0.05 : 0.065;
    slot.updateMatrix();
    snackMesh.setMatrixAt(index, slot.matrix);
    snackMesh.setColorAt(index, new THREE.Color(snack.color));
  });
  snackMesh.castShadow = true;
  snackMesh.receiveShadow = true;
  scene.add(snackMesh);
  resources.add(snackMesh);

  const drinkGeometry = track(new THREE.CylinderGeometry(0.067, 0.072, 0.294, 12));
  const drinks = new THREE.InstancedMesh(drinkGeometry, standard('#ffffff', { roughness: 0.45 }), 60);
  const labels = new THREE.InstancedMesh(track(new THREE.CylinderGeometry(0.071, 0.074, 0.103, 12)),
    standard('#ffffff'), 60);
  [0.62, 1.09, 1.54, 2.01].forEach((y, row) => {
    for (let i = 0; i < 15; i++) {
      const index = row * 15 + i;
      slot.position.set(3.78 - 1.10 + i * 0.157, y, -2.81 + (i % 2) * 0.12);
      slot.scale.set(1, row === 3 ? 0.74 : 1, 1);
      slot.rotation.set(0, 0, 0);
      slot.updateMatrix();
      drinks.setMatrixAt(index, slot.matrix);
      drinks.setColorAt(index, new THREE.Color(snacksColors[(3 * row + i) % snacksColors.length]));
      slot.position.y -= 0.025;
      slot.updateMatrix();
      labels.setMatrixAt(index, slot.matrix);
      labels.setColorAt(index, new THREE.Color(i % 2 ? '#f7e3b1' : '#f4f3e1'));
    }
  });
  scene.add(drinks, labels);
  resources.add(drinks);
  resources.add(labels);

  // Open-top chilled island.
  box(3.69, 0.69, 1.62, pine, [-1.32, 0.36, 1.20], undefined, 0.10);
  box(3.70, 0.06, 1.58, teal, [-1.32, 0.72, 1.20], undefined, 0.03);
  box(3.43, 0.074, 1.39, cream, [-1.32, 0.79, 1.20], undefined, 0.02);
  box(3.62, 0.13, 0.09, pine, [-1.32, 0.84, 0.39]);
  box(3.62, 0.10, 0.075, pine, [-1.32, 0.81, 2.00]);
  for (const edge of [-3.11, 0.47]) box(0.09, 0.14, 1.61, pine, [edge, 0.84, 1.20]);
  plane(1.67, 0.25, flat({ map: track(sign('FRESH PICKS', '', '#24493b', '#f1db9b')) }), [-1.32, 0.42, 2.024]);
  box(3.23, 0.038, 0.055, mintLight, [-1.32, 0.66, 2.013]);

  // Checkout counter, receipt, entrance mat, and plants.
  box(2.95, 0.93, 1.17, pine, [3.55, 0.48, 0.95], undefined, 0.08);
  box(2.99, 0.088, 1.23, cream, [3.55, 0.97, 0.95], undefined, 0.033);
  box(2.84, 0.12, 0.04, teal, [3.55, 0.13, 1.55]);
  wallSign('CHECKOUT', '', 1.49, 0.28, [3.55, 0.53, 1.543], '#24493b', '#e1eda8');
  for (let i = 0; i < 13; i++) box(0.033, 0.46, 0.034, teal, [2.19 + i * 0.099, 0.42, 1.538]);
  box(0.53, 0.07, 0.36, dark, [3.71, 1.05, 0.68], undefined, 0.021);
  box(0.093, 0.20, 0.073, dark, [3.71, 1.17, 0.65]);
  const terminal = box(0.55, 0.33, 0.074, dark, [3.71, 1.39, 0.65], undefined, 0.025);
  terminal.rotation.x = -0.14;
  const screen = plane(0.465, 0.26, flat({ map: track(sign('OPEN', 'WASTEOFF POS', '#18352e', '#cde893', 245)) }),
    [3.71, 1.39, 0.691], -0.14);
  screen.renderOrder = 1;
  box(0.28, 0.08, 0.34, teal, [4.29, 1.055, 1.11], undefined, 0.022);
  box(0.17, 0.021, 0.15, dark, [4.29, 1.104, 1.11]);
  box(0.29, 0.015, 0.26, yellow, [2.94, 1.022, 1.11]);

  plane(2.73, 1.03, flat({ map: track(sign('WELCOME', 'GOOD FOOD, LESS WASTE', '#224338', '#b9d791', 354)) }),
    [2.61, 0.012, 3.19], -Math.PI / 2);
  box(2.81, 0.053, 1.10, dark, [2.61, -0.019, 3.19], undefined, 0.028);

  const plantMaterial = standard('#729957');
  const lowPlantMaterial = standard('#567d49');
  function plant(px: number, pz: number, size: number) {
    mesh(track(new THREE.CylinderGeometry(0.25 * size, 0.17 * size, 0.35 * size, 12)),
      yellow, [px, 0.175 * size, pz]);
    mesh(track(new THREE.CylinderGeometry(0.217 * size, 0.217 * size, 0.028, 12)), dark, [px, 0.35 * size, pz]);
    const leaves = track(new THREE.SphereGeometry(1, 9, 7));
    for (let i = 0; i < 9; i++) {
      const angle = i * 2.4;
      const extension = (0.10 + i % 3 * 0.085) * size;
      const leaf = mesh(leaves, i % 2 ? plantMaterial : lowPlantMaterial, [
        px + Math.sin(angle) * extension, (0.49 + (i * 3 % 5) * 0.043) * size, pz + Math.cos(angle) * extension,
      ]);
      leaf.scale.set(0.10 * size, 0.24 * size, 0.071 * size);
      leaf.rotation.set(Math.cos(angle) * 0.60, angle, -Math.sin(angle) * 0.64);
    }
  }
  plant(-5.16, 3.14, 1.13);
  plant(5.20, -2.88, 1.01);
  plant(5.11, 3.20, 0.89);

  const fixtures = new Map<Target, Fixture>();
  const featured = new Map<ProductId, THREE.Group[]>();
  const hitMaterial = track(new THREE.MeshBasicMaterial({ visible: false }));
  function target(id: Target, anchor: Position, hitAt: Position, hitSize: Position) {
    const hit = mesh(track(new THREE.BoxGeometry(...hitSize)), hitMaterial, hitAt, scene, false);
    hit.userData.target = id;
    fixtures.set(id, { anchor: new THREE.Vector3(...anchor), hit });
  }

  for (const product of products) {
    const { position: [px, py, pz], rows, spacing } = placements[product.id];
    const chilled = product.id === 'dosirak' || product.id === 'kimbap';
    const body = standard(product.id === 'dosirak' ? '#413933' : product.color);
    const label = flat({ map: track(packageLabel(product)) });
    const merchandise = new THREE.Group();
    if (chilled) {
      box(0.47, 0.095, 0.30, body, [0, 0.018, 0], merchandise, 0.021);
      const cover = mesh(track(new THREE.PlaneGeometry(0.428, 0.27)), label, [0, 0.068, 0], merchandise, false);
      cover.rotation.x = -Math.PI / 2;
    } else {
      const shape = new THREE.Shape();
      shape.moveTo(-0.18, 0.01);
      shape.lineTo(0.18, 0.01);
      shape.lineTo(0.016, 0.34);
      shape.quadraticCurveTo(0, 0.366, -0.016, 0.34);
      shape.closePath();
      const front = new THREE.ExtrudeGeometry(shape, { depth: 0.106, bevelEnabled: true, bevelThickness: 0.016, bevelSize: 0.014, bevelSegments: 2 });
      const uv = front.attributes.uv;
      const positions = front.attributes.position;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (positions.getX(i) + 0.2) / 0.4, positions.getY(i) / 0.38);
      mesh(track(front), [label, body], [0, 0, -0.05], merchandise);
    }

    const units: THREE.Group[] = [];
    for (let i = 0; i < 8; i++) {
      const item = merchandise.clone();
      item.position.set(
        px + (i % rows - 1) * spacing,
        py - (chilled ? 0.079 : 0.104),
        pz + (0.19 - Math.floor(i / rows) * (chilled ? 0.33 : 0.24)),
      );
      item.rotation.y = chilled ? (i % 2 ? 0.05 : -0.049) : (i % 2 ? 0.18 : 0.075);
      scene.add(item);
      units.push(item);
    }
    featured.set(product.id, units);
    target(product.id, [px, py + (chilled ? 0.40 : 0.51), pz + 0.26],
      [px, py + (chilled ? 0.02 : 0.11), pz], [1.42, chilled ? 0.32 : 0.42, chilled ? 0.65 : 0.75]);
  }
  target('register', [3.69, 1.29, 1.50], [3.55, 0.91, 0.95], [2.85, 1.50, 1.27]);

  return {
    fixtures,
    setStock(stock: Record<ProductId, number>) {
      for (const [id, models] of featured) models.forEach((item, index) => { item.visible = index < stock[id]; });
    },
    dispose() {
      resources.forEach(resource => resource.dispose());
    },
  };
}
