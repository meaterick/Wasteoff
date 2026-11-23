import { cameraClear, room, walk, type Position } from './layout.ts';

export type Vector = { x: number; z: number };
export type Point = Vector & { y: number };

export function stickVector(x: number, z: number, deadZone = 0.12): Vector {
  const length = Math.hypot(x, z);
  if (length <= deadZone) return { x: 0, z: 0 };
  const strength = (Math.min(1, length) - deadZone) / (1 - deadZone);
  return { x: strength * x / length, z: strength * z / length };
}

export function damp(value: number, goal: number, rate: number, dt: number) {
  return goal + (value - goal) * Math.exp(-rate * dt);
}

export function angleDifference(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export function advancePlayer(position: Position, velocity: Vector, wanted: Vector, dt: number) {
  const rate = wanted.x || wanted.z ? 19 : 24;
  const remainder = Math.exp(-rate * dt);
  const integral = (1 - remainder) / rate;
  const dx = wanted.x * dt + (velocity.x - wanted.x) * integral;
  const dz = wanted.z * dt + (velocity.z - wanted.z) * integral;
  let next = position;
  const samples = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .075));
  for (let sample = 0; sample < samples; sample++) next = walk(next, dx / samples, dz / samples);
  const movedX = next.x - position.x;
  const movedZ = next.z - position.z;
  const newX = wanted.x + (velocity.x - wanted.x) * remainder;
  const newZ = wanted.z + (velocity.z - wanted.z) * remainder;
  return {
    position: next,
    velocity: {
      x: Math.abs(newX) < .012 || Math.abs(dx - movedX) > .001 ? 0 : newX,
      z: Math.abs(newZ) < .012 || Math.abs(dz - movedZ) > .001 ? 0 : newZ,
    },
    distance: Math.hypot(movedX, movedZ),
  };
}

export function clearCameraFraction(anchor: Point, end: Point) {
  const delta = { x: end.x - anchor.x, y: end.y - anchor.y, z: end.z - anchor.z };
  const distance = Math.hypot(delta.x, delta.y, delta.z);
  const samples = Math.max(1, Math.ceil(distance / .105));
  for (let index = 1; index <= samples; index++) {
    const t = index / samples;
    const z = anchor.z + delta.z * t;
    if ((anchor.z < room.front - .30 && z > room.front - .15) || !cameraClear(anchor.x + delta.x * t, z, anchor.y + delta.y * t)) {
      return (index - 1) / samples;
    }
  }
  return 1;
}
