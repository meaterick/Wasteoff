import { getItem, items, lookupBarcode, products, type Item, type Preparation, type ProductId } from './catalog.ts';
export { products, type Product, type ProductId } from './catalog.ts';
import type { Product } from './catalog.ts';

type Quantities = Record<ProductId, number>;

function quantities(dosirak = 0, sandwich = 0, onigiri = 0, kimbap = 0): Quantities {
  return { dosirak, sandwich, onigiri, kimbap };
}

export const scenarios = {
  typical: {
    name: '평소 저녁',
    forecast: quantities(5, 4, 4, 4),
    demand: [
      quantities(1, 1, 2, 1),
      quantities(1, 0, 1, 1),
      quantities(2, 1, 0, 1),
      quantities(1, 2, 1, 0),
    ],
  },
  quiet: {
    name: '한산한 저녁',
    forecast: quantities(3, 2, 3, 2),
    demand: [
      quantities(0, 0, 1, 0),
      quantities(1, 1, 0, 1),
      quantities(0, 0, 1, 0),
      quantities(1, 1, 1, 0),
    ],
  },
  busy: {
    name: '예상보다 붐비는 저녁',
    forecast: quantities(8, 6, 6, 7),
    demand: [
      quantities(3, 2, 2, 2),
      quantities(2, 1, 2, 3),
      quantities(3, 2, 2, 2),
      quantities(3, 3, 2, 2),
    ],
  },
} satisfies Record<string, { name: string; forecast: Quantities; demand: Quantities[] }>;

export type ScenarioId = keyof typeof scenarios;
export const openingBudget = 10_000;
export const openingPoints = 500;
export const disposalCostPerUnit = 100;
export const times = ['22:00', '22:15', '22:30', '22:45', '23:00'];
export const closingStep = times.length - 1;
export const closingTime = times[closingStep];

type Line = { id: ProductId; quantity: number };
type Order = {
  number: string;
  receipt?: string;
  lines: Line[];
  subtotal: number;
  usedPoints: number;
  cash: number;
  reward: number;
  status: 'paid' | 'pickedUp' | 'cancelled';
};

export type Store = {
  scenario: ScenarioId;
  step: number;
  regular: Quantities;
  control: Quantities;
  cart: Quantities;
  usePoints: boolean;
  orders: Order[];
  register?: Register;
};

type Basket = Record<string, number>;
export type Payment = 'card' | 'cash';
export type ReceiptLine = { sku: string; quantity: number; price: number; discount: number };
export type Receipt = {
  number: string;
  time: string;
  lines: ReceiptLine[];
  subtotal: number;
  discount: number;
  usedPoints: number;
  charged: number;
  regularCharged: number;
  reward: number;
  method: Payment;
  tendered: number;
  change: number;
  refunded?: boolean;
  prepared?: Basket;
};

export const preparationTime = { microwave: 12_000, 'hot-water': 5_000 } satisfies Record<Preparation, number>;
type PreparationJob = { receipt: string; sku: string; started: number; ends: number };

type Register = {
  basket: Basket;
  scanned: Basket;
  usePoints: boolean;
  receipts: Receipt[];
  preparation?: PreparationJob;
};

export type Action =
  | { type: 'add' | 'remove'; id: ProductId }
  | { type: 'points'; use: boolean }
  | { type: 'checkout' | 'pickup' | 'cancel' | 'advance' | 'close' }
  | { type: 'reset'; scenario: ScenarioId }
  | { type: 'basket-add' | 'basket-remove'; sku: string }
  | { type: 'pos-scan'; barcode: string }
  | { type: 'pos-clear' }
  | { type: 'pos-points'; use: boolean }
  | { type: 'pos-pay'; method: Payment; tendered?: number }
  | { type: 'pos-refund'; number: string }
  | { type: 'service-start'; receipt: string; sku: string; now: number }
  | { type: 'service-finish'; now: number };

export function newStore(scenario: ScenarioId): Store {
  return {
    scenario, step: 0, regular: quantities(), control: quantities(), cart: quantities(),
    usePoints: false, orders: [],
  };
}

export function getProduct(id: ProductId): Product {
  return products.find(product => product.id === id)!;
}

export function approvedQuantity(scenario: ScenarioId, product: Product) {
  return Math.max(0, product.stock - scenarios[scenario].forecast[product.id] - product.safety);
}

export function rewardPoints(scenario: ScenarioId, product: Product) {
  const approved = approvedQuantity(scenario, product);
  if (approved === 0) return 0;
  const amount = product.price * ((10 * product.stock + 45 * approved) / (100 * product.stock));
  return 10 * Math.floor(Math.min(amount, product.price * 0.3, 1000) / 10);
}

export function pendingOrder(store: Store) {
  return store.orders.find(order => order.status === 'paid');
}

function orderedQuantity(orders: Order[], id: ProductId, status?: Order['status']) {
  return orders.reduce((sum, order) => {
    if (status ? order.status !== status : order.status === 'cancelled') return sum;
    return sum + (order.lines.find(line => line.id === id)?.quantity ?? 0);
  }, 0);
}

export function availableQuantity(store: Store, product: Product) {
  if (store.step >= closingStep) return 0;
  const { id, stock, safety } = product;
  const ordered = orderedQuantity(store.orders, id);
  const forecast = scenarios[store.scenario].forecast[id];
  const forecastRemaining = Math.ceil(forecast * (closingStep - store.step) / closingStep);
  const availableStock = stock - store.regular[id] - ordered;
  return Math.max(0, Math.min(
    approvedQuantity(store.scenario, product) - ordered,
    availableStock - forecastRemaining - safety,
  ));
}

export function budgetBalance(store: Store) {
  const debits = store.orders.reduce((sum, order) => sum + (order.status === 'cancelled' ? 0 : order.cash), 0);
  const regular = (store.register?.receipts ?? []).reduce((sum, receipt) => sum + (receipt.refunded ? 0 : receipt.regularCharged), 0);
  return openingBudget - debits - regular;
}

export function canRestart(store: Store) {
  return store.orders.every(order => order.status === 'cancelled')
    && (store.register?.receipts ?? []).every(receipt => receipt.refunded);
}

export function pointsBalance(store: Store) {
  const debits = store.orders.reduce((sum, order) => sum + (order.status === 'cancelled' ? 0 : order.usedPoints), 0);
  return openingPoints - debits;
}

export function cartSummary(store: Store) {
  const lines = products.filter(({ id }) => store.cart[id] > 0).map(({ id }) => ({ id, quantity: store.cart[id] }));
  const subtotal = lines.reduce((sum, line) => sum + getProduct(line.id).price * line.quantity, 0);
  const reward = lines.reduce((sum, line) => sum + rewardPoints(store.scenario, getProduct(line.id)) * line.quantity, 0);
  const usedPoints = store.usePoints ? Math.min(subtotal, pointsBalance(store)) : 0;
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  return { lines, subtotal, reward, usedPoints, cash: subtotal - usedPoints, count };
}

function advance(store: Store): Store {
  if (store.step >= closingStep) return store;
  const demand = scenarios[store.scenario].demand[store.step];
  const regular = { ...store.regular };
  const control = { ...store.control };
  for (const { id, stock } of products) {
    regular[id] += Math.min(demand[id], stock - regular[id] - orderedQuantity(store.orders, id));
    control[id] += Math.min(demand[id], stock - control[id]);
  }
  const step = store.step + 1;
  const orders = step === closingStep
    ? store.orders.map(order => order.status === 'paid' ? { ...order, status: 'cancelled' as const } : order)
    : store.orders;
  const next = { ...store, step, regular, control, orders };
  const cart = { ...store.cart };
  for (const product of products) cart[product.id] = Math.min(cart[product.id], availableQuantity(next, product));
  return normalizeBasket({ ...next, cart });
}

function closeStore(store: Store) {
  while (store.step < closingStep) store = advance(store);
  return store;
}

export function updateStore(store: Store, action: Action): Store {
  switch (action.type) {
    case 'reset':
      return canRestart(store) ? newStore(action.scenario) : store;
    case 'add': {
      const { id } = action;
      if (pendingOrder(store) || store.cart[id] >= availableQuantity(store, getProduct(id))) return store;
      return { ...store, cart: { ...store.cart, [id]: store.cart[id] + 1 } };
    }
    case 'remove':
      if (!store.cart[action.id]) return store;
      return { ...store, cart: { ...store.cart, [action.id]: store.cart[action.id] - 1 } };
    case 'points':
      return { ...store, usePoints: action.use };
    case 'checkout': {
      if (store.step >= closingStep || pendingOrder(store)) return store;
      const { count, ...summary } = cartSummary(store);
      if (!count || summary.cash > budgetBalance(store)
        || summary.lines.some(line => line.quantity > availableQuantity(store, getProduct(line.id)))) return store;
      const order: Order = {
        ...summary,
        number: 'WO-' + String(store.orders.length + 1).padStart(3, '0'),
        status: 'paid',
      };
      return { ...store, orders: [...store.orders, order], cart: quantities(), usePoints: false };
    }
    case 'pickup':
    case 'cancel': {
      if (!pendingOrder(store) || store.step >= closingStep) return store;
      const status = action.type === 'pickup' ? 'pickedUp' : 'cancelled';
      return { ...store, orders: store.orders.map(order => order.status === 'paid' ? { ...order, status } : order) };
    }
    case 'advance':
      return advance(store);
    case 'close':
      return closeStore(store);
    case 'basket-add':
    case 'basket-remove':
    case 'pos-scan':
    case 'pos-clear':
    case 'pos-points':
    case 'pos-pay':
    case 'pos-refund':
    case 'service-start':
    case 'service-finish':
      return updateRegister(store, action);
  }
}

export type Result = {
  waste: number;
  regular: number;
  rescued: number;
  cash: number;
  contribution: number;
};

export function compare(store: Store) {
  const projected = closeStore(store);
  const completed = projected.orders.filter(order => order.status === 'pickedUp');
  const rows = products.map(product => {
    const { id, stock } = product;
    const regular = projected.regular[id];
    const controlRegular = projected.control[id];
    const rescued = orderedQuantity(completed, id);
    return { product, regular, controlRegular, rescued, waste: stock - regular - rescued, controlWaste: stock - controlRegular };
  });

  const control = { waste: 0, regular: 0, rescued: 0, cash: 0, contribution: 0 };
  const wasteoff: Result = { ...control };
  for (const row of rows) {
    control.waste += row.controlWaste;
    control.regular += row.controlRegular;
    control.cash += row.controlRegular * row.product.price;
    wasteoff.waste += row.waste;
    wasteoff.regular += row.regular;
    wasteoff.rescued += row.rescued;
    wasteoff.cash += row.regular * row.product.price;
  }
  const procurement = products.reduce((sum, product) => sum + product.stock * product.cost, 0);
  const earnedPoints = completed.reduce((sum, order) => sum + order.reward, 0);
  wasteoff.cash += completed.reduce((sum, order) => sum + order.cash, 0);
  control.contribution = control.cash - procurement - control.waste * disposalCostPerUnit;
  wasteoff.contribution = wasteoff.cash - procurement - earnedPoints - wasteoff.waste * disposalCostPerUnit;
  return { rows, control, wasteoff };
}

const numbers = new Intl.NumberFormat('ko-KR');
export const number = (value: number) => numbers.format(value);
export const won = (value: number) => number(value) + '원';
export const points = (value: number) => number(value) + 'P';

type RegisterAction = Extract<Action, { type: 'basket-add' | 'basket-remove' | 'pos-scan' | 'pos-clear' | 'pos-points' | 'pos-pay' | 'pos-refund' | 'service-start' | 'service-finish' }>;

export function registerState(store: Store): Register {
  if (store.register) return store.register;
  // An existing participant can finish the basket started in the preceding version.
  const basket = Object.fromEntries(products.filter(({ id }) => store.cart[id] > 0).map(({ id }) => ['late-' + id, store.cart[id]]));
  return { basket, scanned: {}, usePoints: store.usePoints, receipts: [] };
}

export function shelfStock(store: Store, item: Item) {
  if (item.rescue) return availableQuantity(store, getProduct(item.rescue));
  return item.stock - (store.register?.receipts ?? []).reduce((sum, receipt) =>
    sum + (receipt.refunded ? 0 : receipt.lines.find(line => line.sku === item.sku)?.quantity ?? 0), 0);
}

export function pointReward(store: Store, item: Item) {
  return item.rescue ? rewardPoints(store.scenario, getProduct(item.rescue)) : 0;
}

export function registerTotals(store: Store) {
  const { basket, scanned, usePoints } = registerState(store);
  const lines = items.flatMap(item => {
    const quantity = basket[item.sku] ?? 0;
    if (quantity === 0) return [];
    const groupSize = item.offer === '1+1' ? 2 : 3;
    const discount = item.offer ? Math.floor(quantity / groupSize) * item.price : 0;
    return [{ item, quantity, scanned: scanned[item.sku] ?? 0, price: item.price, discount }];
  });
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const scanCount = lines.reduce((sum, line) => sum + line.scanned, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.price, 0);
  const discount = lines.reduce((sum, line) => sum + line.discount, 0);
  const rescueSubtotal = lines.reduce((sum, line) => sum + (line.item.rescue ? line.quantity * line.price : 0), 0);
  const usedPoints = usePoints ? Math.min(pointsBalance(store), rescueSubtotal) : 0;
  const reward = lines.reduce((sum, line) => sum + pointReward(store, line.item) * line.quantity, 0);
  return { lines, count, scanCount, subtotal, discount, rescueSubtotal, usedPoints, reward, charged: subtotal - discount - usedPoints };
}

export function eligiblePreparations(store: Store) {
  return registerState(store).receipts.flatMap(receipt => {
    if (receipt.refunded) return [];
    return receipt.lines.flatMap(line => {
      const item = getItem(line.sku);
      const remaining = line.quantity - (receipt.prepared?.[line.sku] ?? 0);
      return item?.preparation && remaining > 0 ? [{ receipt: receipt.number, item, remaining, method: item.preparation }] : [];
    });
  });
}

export function canRefundReceipt(store: Store, receipt: Receipt) {
  return !receipt.refunded && !Object.values(receipt.prepared ?? {}).some(Boolean)
    && registerState(store).preparation?.receipt !== receipt.number
    && (store.step < closingStep || !receipt.lines.some(line => getItem(line.sku)?.rescue));
}

function setRegister(store: Store, register: Register): Store {
  return { ...store, register, cart: quantities(), usePoints: false };
}

function normalizeBasket(store: Store): Store {
  if (!store.register) return store;
  const register = store.register;
  const basket = { ...register.basket };
  const scanned = { ...register.scanned };
  for (const item of items) {
    if (!basket[item.sku]) continue;
    basket[item.sku] = Math.min(basket[item.sku], shelfStock(store, item));
    scanned[item.sku] = Math.min(scanned[item.sku] ?? 0, basket[item.sku]);
  }
  return setRegister(store, { ...register, basket, scanned });
}

function updateRegister(store: Store, action: RegisterAction): Store {
  const register = registerState(store);
  switch (action.type) {
    case 'basket-add':
    case 'basket-remove': {
      const item = getItem(action.sku);
      if (!item) return store;
      const current = register.basket[item.sku] ?? 0;
      const next = current + (action.type === 'basket-add' ? 1 : -1);
      if (next < 0 || (action.type === 'basket-add' && next > shelfStock(store, item))) return store;
      return setRegister(store, {
        ...register,
        basket: { ...register.basket, [item.sku]: next },
        scanned: { ...register.scanned, [item.sku]: Math.min(register.scanned[item.sku] ?? 0, next) },
      });
    }
    case 'pos-scan': {
      const item = lookupBarcode(action.barcode);
      if (!item) return store;
      const scanned = register.scanned[item.sku] ?? 0;
      if (scanned >= Math.min(register.basket[item.sku] ?? 0, shelfStock(store, item))) return store;
      return setRegister(store, { ...register, scanned: { ...register.scanned, [item.sku]: scanned + 1 } });
    }
    case 'pos-clear':
      return setRegister(store, { ...register, scanned: {} });
    case 'pos-points':
      return setRegister(store, { ...register, usePoints: action.use });
    case 'pos-pay': {
      const totals = registerTotals(store);
      const budget = budgetBalance(store);
      if (!totals.count || totals.scanCount !== totals.count || totals.charged > budget
        || totals.lines.some(line => line.quantity > shelfStock(store, line.item))) return store;
      const tendered = action.method === 'card' ? totals.charged : Number(action.tendered);
      if (!Number.isInteger(tendered) || tendered < totals.charged || tendered > budget) return store;
      const number = 'POS-' + String(register.receipts.length + 1).padStart(3, '0');
      const receipt: Receipt = {
        number, time: times[store.step],
        lines: totals.lines.map(line => ({ sku: line.item.sku, quantity: line.quantity, price: line.price, discount: line.discount })),
        subtotal: totals.subtotal, discount: totals.discount, usedPoints: totals.usedPoints, charged: totals.charged,
        regularCharged: totals.charged - totals.rescueSubtotal + totals.usedPoints, reward: totals.reward,
        method: action.method, tendered, change: tendered - totals.charged,
      };
      const rescueLines = totals.lines.flatMap(line => line.item.rescue ? [{ id: line.item.rescue, quantity: line.quantity }] : []);
      const orders = rescueLines.length ? [...store.orders, {
        number, receipt: number, lines: rescueLines, subtotal: totals.rescueSubtotal, usedPoints: totals.usedPoints,
        cash: totals.rescueSubtotal - totals.usedPoints, reward: totals.reward, status: 'pickedUp' as const,
      }] : store.orders;
      return setRegister({ ...store, orders }, { ...register, basket: {}, scanned: {}, usePoints: false, receipts: [...register.receipts, receipt] });
    }
    case 'pos-refund': {
      const receipt = register.receipts.find(previous => previous.number === action.number);
      if (!receipt || !canRefundReceipt(store, receipt)) return store;
      const receipts = register.receipts.map(previous => previous === receipt ? { ...receipt, refunded: true } : previous);
      const orders = store.orders.map(order => order.receipt === receipt.number ? { ...order, status: 'cancelled' as const } : order);
      return setRegister({ ...store, orders }, { ...register, receipts });
    }
    case 'service-start': {
      if (register.preparation || !Number.isFinite(action.now)) return store;
      const eligible = eligiblePreparations(store).find(option => option.receipt === action.receipt && option.item.sku === action.sku);
      if (!eligible) return store;
      return setRegister(store, {
        ...register,
        preparation: { receipt: action.receipt, sku: action.sku, started: action.now, ends: action.now + preparationTime[eligible.method] },
      });
    }
    case 'service-finish': {
      const job = register.preparation;
      if (!job || !Number.isFinite(action.now) || action.now < job.ends) return store;
      const receipts = register.receipts.map(receipt => {
        if (receipt.number !== job.receipt || receipt.refunded) return receipt;
        const prepared = receipt.prepared ?? {};
        return { ...receipt, prepared: { ...prepared, [job.sku]: (prepared[job.sku] ?? 0) + 1 } };
      });
      return setRegister(store, { ...register, receipts, preparation: undefined });
    }
  }
}
