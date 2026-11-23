import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function makeAvatar(keep: <T extends { dispose(): void }>(resource: T) => T, clerk = false) {
  const group = new THREE.Group();
  const material = (color: string) => keep(new THREE.MeshStandardMaterial({ color, roughness: 0.78 }));
  const coat = material(clerk ? '#526547' : '#53667e');
  const cuff = material(clerk ? '#263d2b' : '#28394a');
  const trousers = material('#323a40');
  const shoes = material('#293635');
  const sole = material('#d6d8cd');
  const hair = material('#312c29');
  const skin = material('#c49373');
  const white = material('#dfe8dd');
  const green = material('#36604b');
  const inner = material('#183126');

  function box(w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number,
    parent = group, rounding = 0.035) {
    const mesh = new THREE.Mesh(keep(new RoundedBoxGeometry(w, h, d, 2, rounding)), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }

  function limb(x: number, height: number) {
    const joint = new THREE.Group();
    joint.position.set(x, height, 0);
    group.add(joint);
    return joint;
  }

  function ellipsoid(radius: number, scale: [number, number, number], material: THREE.Material,
    position: [number, number, number], parent = group) {
    const shape = new THREE.Mesh(keep(new THREE.SphereGeometry(radius, 18, 12)), material);
    shape.position.set(...position);
    shape.scale.set(...scale);
    parent.add(shape);
    return shape;
  }
  function cylinder(top: number, base: number, length: number, material: THREE.Material,
    position: [number, number, number], parent = group, oval = 1) {
    const shape = new THREE.Mesh(keep(new THREE.CylinderGeometry(top, base, length, 13)), material);
    shape.position.set(...position);
    shape.scale.z = oval;
    parent.add(shape);
  }

  ellipsoid(.19, [1.05, .51, .74], trousers, [0, .94, 0]);
  const profile = [[0, -.25], [.129, -.25], [.15, -.207], [.154, -.105], [.158, .04],
    [.177, .14], [.17, .184], [.136, .223], [.104, .247], [0, .247]];
  const torso = new THREE.Mesh(keep(new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 26)), coat);
  torso.position.set(0, 1.189, 0);
  torso.scale.set(1.45, 1, .83);
  group.add(torso);
  cylinder(.15, .131, .045, cuff, [0, .958, 0], group, .86);
  cylinder(.070, .078, .115, skin, [0, 1.477, -.007]);
  ellipsoid(.129, [.94, .43, .71], cuff, [0, 1.394, .103]);
  box(.26, .017, .009, cuff, 0, 1.14, .135, group, .004);
  box(.099, .065, .011, cuff, -.123, 1.13, -.115, group, .010);
  box(0.072, 0.083, 0.013, white, 0.115, 1.32, -0.143, group, 0.010);
  const head = new THREE.Mesh(keep(new THREE.SphereGeometry(0.135, 18, 14)), skin);
  head.position.set(0, 1.61, -0.017);
  head.scale.set(0.81, 1.05, 0.88);
  group.add(head);
  const cap = new THREE.Mesh(keep(new THREE.SphereGeometry(0.136, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.58)), hair);
  cap.position.set(0, 1.643, -0.005);
  cap.scale.set(0.88, 0.85, 0.93);
  group.add(cap);
  for (const side of [-1, 1]) ellipsoid(.035, [.62, 1.21, .68], skin, [side * .104, 1.600, -.023]);
  ellipsoid(.031, [.68, 1.03, 1.12], skin, [0, 1.591, -.126]);

  const legs = [-1, 1].map(side => {
    const joint = limb(side * 0.107, 0.92);
    cylinder(.090, .070, .407, trousers, [0, -.221, 0], joint, 1.18);
    cylinder(.072, .062, .372, trousers, [0, -.602, .009], joint, 1.19);
    ellipsoid(.071, [1, .91, 1.18], trousers, [0, -.423, .002], joint);
    box(0.176, 0.123, 0.29, shoes, 0, -0.833, -0.049, joint);
    box(0.174, 0.036, 0.291, sole, 0, -0.894, -0.049, joint, 0.013);
    return joint;
  });
  const arms = [-1, 1].map(side => {
    const joint = limb(side * 0.265, 1.385);
    joint.rotation.z = side * 0.085;
    ellipsoid(.079, [1, 1.12, 1.07], coat, [0, -.043, 0], joint);
    cylinder(.076, .067, .222, coat, [0, -.152, 0], joint, 1.1);
    cylinder(.068, .058, .21, coat, [0, -.348, .004], joint, 1.12);
    cylinder(.061, .056, .045, cuff, [0, -.464, .008], joint, 1.12);
    ellipsoid(.064, [.64, 1.08, .69], skin, [0, -.526, -.012], joint);
    return joint;
  });
  const basket = new THREE.Group();
  const handle = new THREE.Mesh(keep(new THREE.TorusGeometry(0.147, 0.014, 6, 24, Math.PI)), inner);
  basket.add(handle);
  box(0.34, 0.126, 0.25, inner, 0, -0.05, 0, basket, 0.024);
  box(0.345, 0.056, 0.257, green, 0, -0.007, 0, basket, 0.014);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) box(0.017, 0.059, 0.013, green, -0.123 + i * 0.061, -0.075, side * 0.128, basket, 0.004);
  }
  basket.position.set(0.034, -0.691, -0.041);
  arms[1].add(basket);
  basket.visible = false;

  return {
    object: group,
    pose(phase: number, walking: number, carrying: boolean) {
      const swing = Math.sin(phase) * 0.48 * walking;
      legs[0].rotation.x = swing;
      legs[1].rotation.x = -swing;
      arms[0].rotation.x = -swing * 0.52;
      arms[1].rotation.x = carrying ? -0.25 : swing * 0.52;
      basket.visible = carrying;
    },
  };
}
