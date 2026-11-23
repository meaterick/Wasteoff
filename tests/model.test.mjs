import assert from 'node:assert/strict';
import test from 'node:test';
import {
  availableQuantity, budgetBalance, canRestart, cartSummary, compare, getProduct, newStore,
  openingBudget, pendingOrder, pointsBalance, products, scenarios, updateStore,
} from '../src/model.ts';

const act = (store, type) => updateStore(store, { type });
const add = (store, id, quantity = 1) => {
  for (let index = 0; index < quantity; index++) store = updateStore(store, { type: 'add', id });
  return store;
};

test('same inventory and demand produce the same results with no human purchases', () => {
  for (const scenario of Object.keys(scenarios)) {
    const store = newStore(scenario);
    const report = compare(store);
    assert.deepEqual(report.wasteoff, report.control);
    assert.equal(store.step, 0);
    for (const row of report.rows) assert.equal(row.controlRegular + row.controlWaste, row.product.stock);
  }
});

test('a paid and collected order reduces waste and accounts for cash, points and waste cost', () => {
  let store = add(newStore('typical'), 'dosirak');
  store = updateStore(store, { type: 'points', use: true });
  store = act(store, 'checkout');
  assert.equal(pendingOrder(store).cash, 4500);
  assert.equal(availableQuantity(store, getProduct('dosirak')), 4);
  assert.equal(budgetBalance(store), 5500);
  assert.equal(pointsBalance(store), 0);
  assert.equal(compare(store).wasteoff.rescued, 0);

  store = act(store, 'pickup');
  const { control, wasteoff } = compare(store);
  assert.equal(control.waste, 21);
  assert.equal(wasteoff.waste, 20);
  assert.equal(wasteoff.regular, control.regular);
  assert.equal(wasteoff.contribution - control.contribution, 3600);
  assert.equal(pointsBalance(store), 0);
  assert.equal(budgetBalance(store), 5500);
  assert.equal(canRestart(store), false);
  assert.equal(updateStore(store, { type: 'reset', scenario: 'quiet' }), store);
});

test('a participant cannot order above the remaining budget or pay twice', () => {
  let store = add(newStore('typical'), 'dosirak', 3);
  assert.equal(cartSummary(store).cash, 15000);
  assert.equal(act(store, 'checkout'), store);

  store = updateStore(store, { type: 'remove', id: 'dosirak' });
  store = act(store, 'checkout');
  assert.equal(budgetBalance(store), 0);
  assert.equal(act(store, 'checkout'), store);
  assert.equal(add(store, 'onigiri'), store);

  store = act(store, 'pickup');
  store = add(store, 'onigiri');
  assert.equal(act(store, 'checkout'), store);
  assert.equal(budgetBalance(store), 0);
});

test('cancellation and no pickup release the reservation, budget and used points', () => {
  const initial = newStore('typical');
  let store = add(initial, 'kimbap');
  store = updateStore(store, { type: 'points', use: true });
  store = act(store, 'checkout');
  const cancelled = act(store, 'cancel');
  assert.equal(budgetBalance(cancelled), openingBudget);
  assert.equal(pointsBalance(cancelled), 500);
  assert.equal(availableQuantity(cancelled, getProduct('kimbap')), 4);
  assert.equal(compare(cancelled).wasteoff.rescued, 0);
  const closed = act(store, 'close');
  assert.equal(budgetBalance(closed), openingBudget);
  assert.equal(pointsBalance(closed), 500);
  assert.equal(pendingOrder(closed), undefined);
  assert.equal(availableQuantity(closed, getProduct('kimbap')), 0);
  assert.equal(act(closed, 'pickup'), closed);
});

test('unexpected demand can displace normal sales and lower estimated profit', () => {
  let store = add(newStore('busy'), 'sandwich');
  store = act(act(store, 'checkout'), 'pickup');
  const { control, wasteoff, rows } = compare(store);
  assert.equal(wasteoff.regular, control.regular - 1);
  assert.equal(wasteoff.waste, control.waste);
  assert.ok(wasteoff.contribution < control.contribution);
  for (const row of rows) assert.equal(row.regular + row.rescued + row.waste, row.product.stock);
});

test('time advances both sides and removes unavailable units from an unreserved cart', () => {
  let store = add(newStore('busy'), 'dosirak', 8);
  assert.equal(cartSummary(store).count, 2);
  store = act(store, 'advance');
  assert.equal(store.step, 1);
  assert.equal(cartSummary(store).count, 1);
  assert.deepEqual(store.regular, store.control);
  store = act(store, 'close');
  assert.equal(cartSummary(store).count, 0);
  assert.ok(products.every(product => availableQuantity(store, product) === 0));
});
