import assert from 'node:assert/strict';
import test from 'node:test';
import { getItem } from '../src/catalog.ts';
import { budgetBalance, compare, newStore, pointsBalance, registerState, registerTotals, shelfStock, updateStore } from '../src/model.ts';
import { canStand, counter, destinations, fixtures, room, walk } from '../src/market/layout.ts';

const remove = (store, sku) => updateStore(store, { type: 'basket-remove', sku });
const add = (store, sku) => updateStore(store, { type: 'basket-add', sku });
const scan = (store, sku) => updateStore(store, { type: 'pos-scan', barcode: getItem(sku).barcode });
const card = store => updateStore(store, { type: 'pos-pay', method: 'card' });
const latest = store => registerState(store).receipts.at(-1);

test('a scan cannot exceed basket quantity or register an unrelated barcode', () => {
  const basket = add(newStore('typical'), 'water');
  assert.equal(scan(basket, 'chips'), basket);
  assert.equal(card(basket), basket);
  const scanned = scan(basket, 'water');
  assert.equal(scan(scanned, 'water'), scanned);
  const reduced = remove(scanned, 'water');
  assert.equal(registerTotals(reduced).count, 0);
  assert.equal(registerTotals(reduced).scanCount, 0);
  assert.equal(card(reduced), reduced);
});

test('mixed sales apply 2+1, rescue points and cash change without charging twice', () => {
  let store = newStore('typical');
  for (const sku of ['water', 'water', 'water', 'late-dosirak']) store = scan(add(store, sku), sku);
  store = updateStore(store, { type: 'pos-points', use: true });
  assert.equal(registerTotals(store).charged, 6300);
  assert.equal(updateStore(store, { type: 'pos-pay', method: 'cash', tendered: 6200 }), store);
  assert.equal(updateStore(store, { type: 'pos-pay', method: 'cash', tendered: 10001 }), store);
  const paid = updateStore(store, { type: 'pos-pay', method: 'cash', tendered: 7000 });
  assert.equal(latest(paid).discount, 900);
  assert.equal(latest(paid).change, 700);
  assert.equal(budgetBalance(paid), 3700);
  assert.equal(pointsBalance(paid), 0);
  assert.equal(shelfStock(paid, getItem('water')), 21);
  assert.equal(shelfStock(paid, getItem('late-dosirak')), 4);
  assert.equal(shelfStock(paid, getItem('fresh-dosirak')), 21);
  assert.equal(compare(paid).wasteoff.waste, compare(paid).control.waste - 1);
  assert.equal(compare(paid).wasteoff.contribution - compare(paid).control.contribution, 3600);
  assert.equal(card(paid), paid);
  const refund = updateStore(paid, { type: 'pos-refund', number: latest(paid).number });
  assert.equal(budgetBalance(refund), 10000);
  assert.equal(pointsBalance(refund), 500);
  assert.equal(shelfStock(refund, getItem('water')), 24);
  assert.equal(compare(refund).wasteoff.waste, compare(refund).control.waste);
  assert.equal(latest(refund).refunded, true);
  assert.equal(updateStore(refund, { type: 'pos-refund', number: 'POS-001' }), refund);
});

test('a participant cannot exceed their budget after a previous receipt', () => {
  let store = newStore('typical');
  for (const sku of ['fresh-dosirak', 'fresh-dosirak']) store = scan(add(store, sku), sku);
  store = card(store);
  assert.equal(budgetBalance(store), 0);
  const next = scan(add(store, 'latte'), 'latte');
  assert.equal(card(next), next);
  assert.equal(registerState(next).receipts.length, 1);
  assert.equal(updateStore(store, { type: 'reset', scenario: 'typical' }), store);
});

test('the short-dated lot expires at 23:00 while other stock remains sellable', () => {
  let store = newStore('typical');
  for (const sku of ['fresh-dosirak', 'late-dosirak']) store = scan(add(store, sku), sku);
  store = updateStore(store, { type: 'close' });
  assert.equal(registerTotals(store).count, 1);
  assert.equal(registerTotals(store).scanCount, 1);
  assert.equal(shelfStock(store, getItem('late-dosirak')), 0);
  assert.equal(add(store, 'late-dosirak'), store);
  assert.equal(budgetBalance(card(store)), 5000);
});

test('previous saved baskets and orders survive migration to the new register', () => {
  let previous = updateStore(newStore('typical'), { type: 'add', id: 'dosirak' });
  previous = updateStore(previous, { type: 'points', use: true });
  assert.equal(registerTotals(previous).charged, 4500);
  const bought = card(scan(previous, 'late-dosirak'));
  assert.equal(budgetBalance(bought), 5500);
  assert.equal(bought.cart.dosirak, 0);
  const pickedUp = updateStore(updateStore(previous, { type: 'checkout' }), { type: 'pickup' });
  const updated = card(scan(add(pickedUp, 'water'), 'water'));
  assert.equal(budgetBalance(updated), 4600);
  assert.equal(updated.orders.length, 1);
});

test('shelves, till and storefront block movement but the entry is walkable', () => {
  for (const pose of Object.values(destinations)) assert.ok(canStand(pose.x, pose.z), JSON.stringify(pose));
  assert.equal(canStand(fixtures.snacks.x, fixtures.snacks.z), false);
  assert.equal(canStand(counter.x, counter.z), false);
  assert.equal(canStand(3, room.front), false);
  assert.equal(canStand(0, room.front), true);
  assert.ok(walk({ x: 0, z: room.front - .15 }, 0, .30).z > room.front);
  const nearShelf = { x: fixtures.snacks.x + fixtures.snacks.width / 2 + .29, z: 0 };
  assert.equal(walk(nearShelf, -.13, .08).x, nearShelf.x);
  assert.equal(walk(nearShelf, -.13, .08).z, .08);
});
