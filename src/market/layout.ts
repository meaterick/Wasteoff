import type { Department, Destination } from '../catalog.ts';

type Rectangle = { x: number; z: number; width: number; depth: number; height: number };
export type Position = { x: number; z: number };
export type Pose = Position & { yaw: number };

export const room = { left: -6.6, right: 6.6, rear: -6.6, front: 6.55, ceiling: 3.35, pavement: 9.0 };

export const fixtures: Record<Department, Rectangle & { rotation: number }> = {
  fresh: { x: -3.48, z: -5.95, width: 5.45, depth: 1.05, height: 2.30, rotation: 0 },
  drinks: { x: 3.55, z: -5.95, width: 5.25, depth: 1.05, height: 2.30, rotation: 0 },
  rescue: { x: -5.95, z: -2.90, width: 0.94, depth: 3.60, height: 2.04, rotation: Math.PI / 2 },
  snacks: { x: -2.21, z: -0.19, width: 1.0, depth: 4.35, height: 1.57, rotation: Math.PI / 2 },
  noodles: { x: 2.16, z: -0.19, width: 1.0, depth: 4.35, height: 1.57, rotation: -Math.PI / 2 },
  freezer: { x: 5.85, z: -1.53, width: 1.08, depth: 3.26, height: 1.00, rotation: -Math.PI / 2 },
};

export const counter: Rectangle = { x: 4.55, z: 4.04, width: 3.44, depth: 1.05, height: 1.18 };
export const fixturesOutside = [
  { x: -5.88, z: 3.43, width: 0.83, depth: 2.2, height: 1.43 },
  { x: -4.60, z: 5.80, width: 2.18, depth: 0.64, height: 0.99 },
  { x: 5.65, z: 5.91, width: 0.84, depth: 0.79, height: 1.02 },
  { x: -3.40, z: 8.49, width: 1.70, depth: 0.54, height: 0.89 },
];

export const destinations: Record<Destination, Pose> = {
  entrance: { x: 0.05, z: 4.54, yaw: 0.10 },
  fresh: { x: -3.42, z: -4.36, yaw: 0 },
  drinks: { x: 3.55, z: -4.30, yaw: 0 },
  rescue: { x: -4.35, z: -2.9, yaw: -Math.PI / 2 },
  snacks: { x: -0.77, z: -0.14, yaw: -Math.PI / 2 },
  noodles: { x: 0.72, z: -0.11, yaw: Math.PI / 2 },
  freezer: { x: 4.45, z: -1.53, yaw: Math.PI / 2 },
  register: { x: 4.48, z: 2.58, yaw: Math.PI },
};

export const colliders: Rectangle[] = [
  ...Object.values(fixtures), counter, ...fixturesOutside,
  { x: -3.85, z: room.front, width: 5.50, depth: 0.20, height: room.ceiling },
  { x: 3.85, z: room.front, width: 5.50, depth: 0.20, height: room.ceiling },
];

export function canStand(x: number, z: number, radius = 0.26) {
  if (x < room.left + radius || x > room.right - radius
    || z < room.rear + radius || z > room.pavement - radius) return false;
  return !colliders.some(rectangle => {
    const dx = Math.max(0, Math.abs(x - rectangle.x) - rectangle.width / 2);
    const dz = Math.max(0, Math.abs(z - rectangle.z) - rectangle.depth / 2);
    return dx * dx + dz * dz < radius * radius;
  });
}

export function walk(position: Position, dx: number, dz: number): Position {
  const x = canStand(position.x + dx, position.z) ? position.x + dx : position.x;
  const z = canStand(x, position.z + dz) ? position.z + dz : position.z;
  return { x, z };
}

export function cameraClear(x: number, z: number, y: number) {
  if (x < room.left + 0.15 || x > room.right - 0.15 || z < room.rear + 0.18 || z > room.pavement) return false;
  return !colliders.some(rectangle => y <= rectangle.height + 0.2
    && Math.abs(x - rectangle.x) < rectangle.width / 2 + 0.15
    && Math.abs(z - rectangle.z) < rectangle.depth / 2 + 0.15);
}
