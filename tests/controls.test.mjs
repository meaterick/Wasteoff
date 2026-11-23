import assert from 'node:assert/strict';
import test from 'node:test';
import { advancePlayer, angleDifference, clearCameraFraction, stickVector } from '../src/market/controls.ts';
import { canStand, fixtures } from '../src/market/layout.ts';

test('analog movement has a dead zone, proportional speed and no diagonal bonus', () => {
  assert.deepEqual(stickVector(.05, .07), { x: 0, z: 0 });
  assert.ok(stickVector(.54, 0).x < 1);
  const clamp = stickVector(1, 1);
  assert.ok(Math.abs(Math.hypot(clamp.x, clamp.z) - 1) < 1e-9);
});

test('acceleration and braking produce the same trajectory at 30 and 120 Hz', () => {
  const simulate = frames => {
    let position = { x: 0, z: 4.6 };
    let velocity = { x: 0, z: 0 };
    for (let frame = 0; frame < frames * 2; frame++) {
      ({ position, velocity } = advancePlayer(position, velocity, { x: 0, z: frame < frames ? -2.2 : 0 }, 1 / frames));
    }
    return position.z;
  };
  assert.ok(Math.abs(simulate(30) - simulate(120)) < .003);
});

test('moving into a shelf stops perpendicular drift and lets the player slide', () => {
  const near = { x: fixtures.snacks.x + fixtures.snacks.width / 2 + .267, z: .3 };
  const state = advancePlayer(near, { x: -2, z: 1 }, { x: -2, z: 1 }, .07);
  assert.equal(state.position.x, near.x);
  assert.ok(state.position.z > near.z);
  assert.equal(state.velocity.x, 0);
  assert.ok(canStand(state.position.x, state.position.z));
});

test('third-person line retracts at a shelf and stays extended over an aisle', () => {
  assert.equal(clearCameraFraction({ x: 0, z: 1, y: 1.7 }, { x: 0, z: 3.7, y: 2.4 }), 1);
  const fraction = clearCameraFraction({ x: -4.2, z: -2.8, y: 1.7 }, { x: -6.4, z: -2.8, y: 1.9 });
  assert.ok(fraction > .2 && fraction < .8);
  assert.ok(Math.abs(angleDifference(Math.PI - .1, -Math.PI + .1) - .2) < 1e-9);
});
