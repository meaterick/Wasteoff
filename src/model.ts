export const products = [
  {
    id: 'dosirak', name: '제육 도시락', short: '도시락', label: 'JEYUK RICE', category: '도시락',
    price: 5000, cost: 3000, stock: 12, safety: 2, color: '#ea825f',
  },
  {
    id: 'sandwich', name: '햄치즈 샌드위치', short: '샌드위치', label: 'HAM & CHEESE', category: '샌드위치',
    price: 3200, cost: 1800, stock: 8, safety: 1, color: '#a9cc8f',
  },
  {
    id: 'onigiri', name: '참치마요 삼각김밥', short: '삼각김밥', label: 'TUNA MAYO', category: '삼각김밥',
    price: 1500, cost: 850, stock: 8, safety: 1, color: '#f1ca69',
  },
  {
    id: 'kimbap', name: '불고기 김밥', short: '김밥', label: 'BULGOGI ROLL', category: '김밥',
    price: 3500, cost: 2050, stock: 9, safety: 1, color: '#b9a5df',
  },
] as const;

export type Product = (typeof products)[number];
export type ProductId = Product['id'];
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
};

export type Action =
  | { type: 'add' | 'remove'; id: ProductId }
  | { type: 'points'; use: boolean }
  | { type: 'checkout' | 'pickup' | 'cancel' | 'advance' | 'close' }
  | { type: 'reset'; scenario: ScenarioId };

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

export function offerStock(store: Store) {
  const stock = quantities();
  for (const product of products) stock[product.id] = availableQuantity(store, product);
  return stock;
}

export function budgetBalance(store: Store) {
  const debits = store.orders.reduce((sum, order) => sum + (order.status === 'cancelled' ? 0 : order.cash), 0);
  return openingBudget - debits;
}

export function canRestart(store: Store) {
  return store.orders.every(order => order.status === 'cancelled');
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
  return { ...next, cart };
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
