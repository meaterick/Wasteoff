import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function makeAvatar(keep: <T extends { dispose(): void }>(resource: T) => T, clerk = false) {
  const group = new THREE.Group();
  const material = (color: string) => keep(new THREE.MeshStandardMaterial({ color, roughness: 0.78 }));
  const coat = material(clerk ? '#526547' : '#53667e');
  const cuff = material(clerk ? '#263d2b' : '#28394a');
  const seam = material(clerk ? '#637557' : '#5e728a');
  const trousers = material('#323a40');
  const shoes = material('#293635');
  const sole = material('#d6d8cd');
  const hair = material('#312c29');
  const skin = material('#c49373');
  const white = material('#dfe8dd');

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
  ellipsoid(.115, [1.03, .59, .56], coat, [0, 1.385, .079]);
  box(.25, .011, .01, seam, 0, 1.275, .134, group, .004);
  box(.099, .065, .011, cuff, -.123, 1.13, -.115, group, .010);
  if (clerk) box(.071, .040, .013, white, .115, 1.32, -.140, group, .010);
  else box(.014, .23, .009, seam, 0, 1.09, -.128, group, .004);
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
    const knee = new THREE.Group();
    knee.position.set(0, -.423, 0);
    joint.add(knee);
    cylinder(.072, .062, .372, trousers, [0, -.179, .009], knee, 1.19);
    ellipsoid(.071, [1, .91, 1.18], trousers, [0, 0, .002], knee);
    box(.166, .121, .278, shoes, 0, -.406, -.053, knee);
    box(.169, .035, .285, sole, 0, -.466, -.053, knee, .013);
    for (const z of [-.055, -.083, -.111]) box(.067, .009, .009, sole, 0, -.342, z, knee, .003);
    return { joint, knee };
  });
  const arms = [-1, 1].map(side => {
    const joint = limb(side * .222, 1.354);
    joint.rotation.z = side * 0.085;
    const silhouette = [[0, -.45], [.052, -.45], [.061, -.395], [.061, -.302], [.065, -.231],
      [.072, -.128], [.078, -.038], [.071, .019], [.050, .048], [0, .056]];
    const sleeve = new THREE.Mesh(keep(new THREE.LatheGeometry(silhouette.map(([x, y]) => new THREE.Vector2(x, y)), 18)), coat);
    sleeve.scale.z = 1.11;
    joint.add(sleeve);
    cylinder(.058, .053, .041, cuff, [0, -.455, .004], joint, 1.12);
    ellipsoid(.056, [.64, 1.08, .69], skin, [0, -.508, -.008], joint);
    return joint;
  });
  const basket = makeBasket(keep);
  basket.position.set(.062, -.660, -.026);
  arms[1].add(basket);
  basket.visible = false;

  return {
    object: group,
    basket,
    pose(phase: number, intensity: number, carrying: boolean, reduceMotion = false) {
      const strength = intensity * (reduceMotion ? .42 : 1);
      const swing = Math.sin(phase) * .43 * strength;
      legs[0].joint.rotation.x = swing;
      legs[1].joint.rotation.x = -swing;
      legs[0].knee.rotation.x = -Math.max(0, -Math.sin(phase - .62)) * strength * .60;
      legs[1].knee.rotation.x = -Math.max(0, Math.sin(phase - .62)) * strength * .60;
      arms[0].rotation.x = -swing * .57;
      arms[1].rotation.x = carrying ? -.23 + swing * .18 : swing * .57;
      basket.visible = carrying;
    },
  };
}

export function makeBasket(keep: <T extends { dispose(): void }>(resource: T) => T, handheld = false) {
  const basket = new THREE.Group();
  const plastic = keep(new THREE.MeshStandardMaterial({ color: '#426a49', roughness: .48, metalness: .06 }));
  const dark = keep(new THREE.MeshStandardMaterial({ color: '#244735', roughness: .53 }));
  function bars(w: number, h: number, depth: number, positions: [number, number, number][], material = plastic) {
    const geometry = keep(new RoundedBoxGeometry(w, h, depth, 1, .008));
    const mesh = keep(new THREE.InstancedMesh(geometry, material, positions.length));
    const transform = new THREE.Matrix4();
    positions.forEach(([x, y, z], index) => mesh.setMatrixAt(index, transform.makeTranslation(x, y, z)));
    basket.add(mesh);
  }
  bars(.318, .027, .228, [[0, -.125, 0]], dark);
  bars(.362, .026, .023, [[0, -.016, -.123], [0, -.016, .123]]);
  bars(.326, .021, .019, [[0, -.111, -.108], [0, -.111, .108]]);
  bars(.021, .025, .264, [[-.169, -.016, 0], [.169, -.016, 0]]);
  bars(.021, .025, .225, [[-.153, -.111, 0], [.153, -.111, 0]]);
  bars(.016, .103, .014, [-.116, .116].flatMap(z =>
    Array.from({ length: 8 }, (_, i) => [(i - 3.5) * .043, -.066, z] as [number, number, number])));
  bars(.014, .10, .016, [-.164, .164].flatMap(x =>
    Array.from({ length: 5 }, (_, i) => [x, -.067, (i - 2) * .048] as [number, number, number])));
  const handle = new THREE.Mesh(keep(new THREE.TorusGeometry(.148, .012, 7, 24, Math.PI)), dark);
  handle.position.y = -.006;
  basket.add(handle);
  if (handheld) {
    const skin = keep(new THREE.MeshStandardMaterial({ color: '#b98a6c', roughness: .69 }));
    const sleeve = keep(new THREE.MeshStandardMaterial({ color: '#34485c', roughness: .81 }));
    const arm = new THREE.Mesh(keep(new THREE.CapsuleGeometry(.048, .20, 5, 10)), sleeve);
    arm.rotation.z = -.79;
    arm.rotation.x = .36;
    arm.position.set(.123, .101, .16);
    basket.add(arm);
    const fist = new THREE.Mesh(keep(new THREE.SphereGeometry(.048, 13, 10)), skin);
    fist.scale.set(.86, .77, 1.11);
    fist.position.set(.056, .120, .030);
    basket.add(fist);
    basket.rotation.y = -.24;
  }
  return basket;
}
