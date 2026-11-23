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
export const departments = [
  { id: 'fresh', name: '냉장 간편식', label: 'FRESH FOOD' },
  { id: 'rescue', name: '마감 간편식', label: 'WASTEOFF' },
  { id: 'snacks', name: '과자·간식', label: 'SNACKS' },
  { id: 'noodles', name: '라면·즉석식품', label: 'INSTANT FOOD' },
  { id: 'drinks', name: '냉장 음료', label: 'COLD DRINKS' },
  { id: 'freezer', name: '아이스크림', label: 'FROZEN' },
] as const;

export type Department = (typeof departments)[number]['id'];
export type Destination = Department | 'register' | 'entrance';
export type Package = 'tray' | 'wedge' | 'roll' | 'cup' | 'bag' | 'bar' | 'bottle' | 'can' | 'carton';

export type Item = {
  sku: string;
  name: string;
  label: string;
  department: Department;
  form: Package;
  color: string;
  art: number;
  price: number;
  stock: number;
  size: string;
  barcode: string;
  date: string;
  rescue?: ProductId;
  offer?: '2+1';
};

const packages = [
  { form: 'tray', size: '410 g' },
  { form: 'wedge', size: '190 g' },
  { form: 'wedge', size: '110 g' },
  { form: 'roll', size: '250 g' },
] as const;

const chilled: Omit<Item, 'barcode'>[] = products.flatMap((product, index) => {
  const common = { ...packages[index], name: product.name, label: product.label, color: product.color, price: product.price, art: index };
  return [
    { ...common, sku: 'fresh-' + product.id, department: 'fresh', stock: 21 - index, date: '다음 날 11:00' },
    { ...common, sku: 'late-' + product.id, department: 'rescue', stock: product.stock, date: '오늘 23:00', rescue: product.id },
  ];
});

const dry: Omit<Item, 'barcode'>[] = [
  { sku: 'ramen', name: '얼큰 컵라면', label: 'HOT RAMYEON', department: 'noodles', form: 'cup', color: '#d34a40', art: 4, price: 1800, stock: 38, size: '110 g', date: '상온 보관' },
  { sku: 'udon', name: '가쓰오 우동', label: 'KATSUO UDON', department: 'noodles', form: 'cup', color: '#d7ac59', art: -1, price: 2300, stock: 30, size: '128 g', date: '상온 보관' },
  { sku: 'chips', name: '허니 감자칩', label: 'HONEY CHIPS', department: 'snacks', form: 'bag', color: '#77a5cb', art: 5, price: 1700, stock: 28, size: '60 g', date: '상온 보관' },
  { sku: 'cookies', name: '초코칩 쿠키', label: 'CHOCO COOKIE', department: 'snacks', form: 'bag', color: '#815244', art: 6, price: 1900, stock: 30, size: '120 g', date: '상온 보관' },
  { sku: 'rice', name: '즉석 백미밥', label: 'STEAMED RICE', department: 'noodles', form: 'cup', color: '#c6a877', art: -1, price: 2100, stock: 20, size: '210 g', date: '상온 보관' },
  { sku: 'cracker', name: '치즈 크래커', label: 'CHEESE CRACKER', department: 'snacks', form: 'bag', color: '#c49a59', art: -1, price: 1600, stock: 22, size: '66 g', date: '상온 보관' },
  { sku: 'cream', name: '복숭아 요거트바', label: 'PEACH YOGURT', department: 'freezer', form: 'bar', color: '#f4b88a', art: 7, price: 1700, stock: 28, size: '70 ml', date: '냉동 보관' },
  { sku: 'water', name: '맑은샘 생수', label: 'SPRING WATER', department: 'drinks', form: 'bottle', color: '#8eb9c5', art: 8, price: 900, stock: 24, size: '500 ml', date: '냉장 보관', offer: '2+1' },
  { sku: 'lime', name: '라임 탄산수', label: 'LIME SODA', department: 'drinks', form: 'can', color: '#517d62', art: 9, price: 1600, stock: 28, size: '355 ml', date: '냉장 보관' },
  { sku: 'latte', name: '카페라테', label: 'CAFE LATTE', department: 'drinks', form: 'carton', color: '#ad8362', art: 10, price: 2200, stock: 25, size: '300 ml', date: '냉장 보관' },
  { sku: 'grape', name: '청포도 스파클링', label: 'GRAPE FIZZ', department: 'drinks', form: 'can', color: '#896bb9', art: 11, price: 1600, stock: 28, size: '355 ml', date: '냉장 보관' },
];

function ean12(index: number) {
  const digits = '880970200' + String(index + 1).padStart(3, '0');
  const sum = [...digits].reduce((total, digit, position) => total + Number(digit) * (position % 2 ? 3 : 1), 0);
  return digits + (10 - sum % 10) % 10;
}

export const items: Item[] = [...chilled, ...dry].map((item, index) => ({ ...item, barcode: ean12(index) }));
const bySku = new Map(items.map(item => [item.sku, item]));
const byBarcode = new Map(items.map(item => [item.barcode, item]));

export function getItem(sku: string) {
  return bySku.get(sku);
}

export function lookupBarcode(code: string) {
  return byBarcode.get(code.trim());
}
