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
  { id: 'bakery', name: '빵·원두커피', label: 'BAKERY & COFFEE' },
  { id: 'daily', name: '생활용품', label: 'DAILY ESSENTIALS' },
] as const;

export type Department = (typeof departments)[number]['id'];
export type Destination = Department | 'register' | 'entrance' | 'service';
export type Package = 'tray' | 'wedge' | 'roll' | 'cup' | 'bag' | 'bar' | 'bottle' | 'can' | 'carton';

export const preparations = {
  microwave: { label: '전자레인지', action: '가열 시작', seconds: 12 },
  'hot-water': { label: '온수기', action: '온수 받기', seconds: 5 },
  coffee: { label: '원두커피 머신', action: '커피 추출', seconds: 8 },
} as const;
export type Preparation = keyof typeof preparations;

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
  offer?: '1+1' | '2+1';
  preparation?: Preparation;
  description?: string;
};

const packages = [
  { form: 'tray', size: '410 g', preparation: 'microwave' },
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
  { sku: 'ramen', preparation: 'hot-water', name: '얼큰 컵라면', label: 'HOT RAMYEON', department: 'noodles', form: 'cup', color: '#d34a40', art: 4, price: 1800, stock: 38, size: '110 g', date: '상온 보관' },
  { sku: 'udon', preparation: 'hot-water', name: '가쓰오 우동', label: 'KATSUO UDON', department: 'noodles', form: 'cup', color: '#d7ac59', art: -1, price: 2300, stock: 30, size: '128 g', date: '상온 보관' },
  { sku: 'chips', name: '허니 감자칩', label: 'HONEY CHIPS', department: 'snacks', form: 'bag', color: '#77a5cb', art: 5, price: 1700, stock: 28, size: '60 g', date: '상온 보관' },
  { sku: 'cookies', name: '초코칩 쿠키', label: 'CHOCO COOKIE', department: 'snacks', form: 'bag', color: '#815244', art: 6, price: 1900, stock: 30, size: '120 g', date: '상온 보관' },
  { sku: 'rice', preparation: 'microwave', name: '즉석 백미밥', label: 'STEAMED RICE', department: 'noodles', form: 'cup', color: '#c6a877', art: -1, price: 2100, stock: 20, size: '210 g', date: '상온 보관' },
  { sku: 'cracker', name: '치즈 크래커', label: 'CHEESE CRACKER', department: 'snacks', form: 'bag', color: '#c49a59', art: -1, price: 1600, stock: 22, size: '66 g', date: '상온 보관' },
  { sku: 'cream', name: '복숭아 요거트바', label: 'PEACH YOGURT', department: 'freezer', form: 'bar', color: '#f4b88a', art: 7, price: 1700, stock: 28, size: '70 ml', date: '냉동 보관' },
  { sku: 'water', name: '맑은샘 생수', label: 'SPRING WATER', department: 'drinks', form: 'bottle', color: '#8eb9c5', art: 8, price: 900, stock: 24, size: '500 ml', date: '냉장 보관', offer: '2+1' },
  { sku: 'lime', name: '라임 탄산수', label: 'LIME SODA', department: 'drinks', form: 'can', color: '#517d62', art: 9, price: 1600, stock: 28, size: '355 ml', date: '냉장 보관' },
  { sku: 'latte', name: '카페라테', label: 'CAFE LATTE', department: 'drinks', form: 'carton', color: '#ad8362', art: 10, price: 2200, stock: 25, size: '300 ml', date: '냉장 보관' },
  { sku: 'grape', offer: '1+1', name: '청포도 스파클링', label: 'GRAPE FIZZ', department: 'drinks', form: 'can', color: '#896bb9', art: 11, price: 1600, stock: 28, size: '355 ml', date: '냉장 보관' },
];

const additions: Omit<Item, 'barcode'>[] = [
  { sku: 'fresh-chicken', name: '매콤 닭갈비 도시락', label: 'SPICY CHICKEN RICE', department: 'fresh', form: 'tray', color: '#c95c36', art: 12, price: 5400, stock: 12, size: '400 g', date: '다음 날 11:00', preparation: 'microwave', description: '고추장 양념 닭갈비에 흰쌀밥과 채소를 곁들인 도시락이에요.' },
  { sku: 'fresh-egg', name: '에그 샌드위치', label: 'EGG SANDWICH', department: 'fresh', form: 'wedge', color: '#86af93', art: 13, price: 2900, stock: 15, size: '190 g', date: '다음 날 09:00', description: '부드러운 달걀 샐러드를 두툼한 식빵 사이에 담았어요.' },
  { sku: 'fresh-salad', name: '닭가슴살 샐러드', label: 'CHICKEN SALAD', department: 'fresh', form: 'tray', color: '#6f9d55', art: 14, price: 4500, stock: 10, size: '180 g', date: '다음 날 08:00', description: '닭가슴살과 잎채소를 한 용기에 담은 가벼운 한 끼예요.' },
  { sku: 'soy-milk', name: '검은콩 두유', label: 'BLACK SOY MILK', department: 'drinks', form: 'carton', color: '#d8c7a5', art: 15, price: 1400, stock: 24, size: '190 ml', date: '냉장 보관' },
  { sku: 'orange', name: '제주 감귤 주스', label: 'TANGERINE JUICE', department: 'drinks', form: 'bottle', color: '#eda642', art: 16, price: 1900, stock: 18, size: '500 ml', date: '냉장 보관' },
  { sku: 'oolong', name: '우롱차', label: 'OOLONG TEA', department: 'drinks', form: 'bottle', color: '#8a7845', art: 17, price: 1500, stock: 20, size: '500 ml', date: '냉장 보관' },
  { sku: 'pretzel', name: '솔티 프레첼', label: 'SALTED PRETZEL', department: 'snacks', form: 'bag', color: '#3764ac', art: 18, price: 1800, stock: 22, size: '90 g', date: '상온 보관' },
  { sku: 'gummy', name: '과일 젤리', label: 'FRUITY GUMMY', department: 'snacks', form: 'bag', color: '#bc4b7b', art: 19, price: 1500, stock: 24, size: '80 g', date: '상온 보관', offer: '2+1' },
  { sku: 'bibim', name: '비빔 컵면', label: 'BIBIM NOODLES', department: 'noodles', form: 'cup', color: '#c94135', art: 20, price: 1900, stock: 25, size: '130 g', date: '상온 보관', preparation: 'hot-water' },
  { sku: 'curry', name: '카레 덮밥', label: 'CURRY RICE', department: 'noodles', form: 'tray', color: '#d1a43b', art: 21, price: 3800, stock: 12, size: '320 g', date: '상온 보관', preparation: 'microwave' },
  { sku: 'choco-pop', name: '초코 아이스바', label: 'CHOCOLATE ICE BAR', department: 'freezer', form: 'bar', color: '#77473c', art: 22, price: 1800, stock: 20, size: '70 ml', date: '냉동 보관' },
  { sku: 'sorbet', name: '망고 셔벗', label: 'MANGO SORBET', department: 'freezer', form: 'cup', color: '#efbb48', art: 23, price: 2100, stock: 17, size: '100 ml', date: '냉동 보관' },
  { sku: 'brioche', name: '버터 소금빵', label: 'SALT BUTTER ROLL', department: 'bakery', form: 'bag', color: '#c6a785', art: 24, price: 2400, stock: 12, size: '80 g', date: '다음 날 12:00' },
  { sku: 'donut', name: '초코 도넛', label: 'CHOCOLATE DONUT', department: 'bakery', form: 'bag', color: '#c86b91', art: 25, price: 1700, stock: 16, size: '75 g', date: '다음 날 15:00' },
  { sku: 'castella', name: '우유 카스텔라', label: 'MILK CASTELLA', department: 'bakery', form: 'bar', color: '#d9c29e', art: 26, price: 2100, stock: 13, size: '100 g', date: '다음 날 15:00' },
  { sku: 'americano', name: '원두 아메리카노', label: 'HOT AMERICANO', department: 'bakery', form: 'cup', color: '#3a4960', art: 27, price: 1800, stock: 22, size: '355 ml', date: '결제 후 추출', preparation: 'coffee', description: '계산대에서 결제한 뒤 셀프 코너의 커피 머신에서 추출해요.' },
  { sku: 'latte-hot', name: '따뜻한 카페라테', label: 'HOT CAFE LATTE', department: 'bakery', form: 'cup', color: '#b18057', art: 28, price: 2600, stock: 18, size: '355 ml', date: '결제 후 추출', preparation: 'coffee' },
  { sku: 'tissues', name: '휴대용 티슈', label: 'POCKET TISSUE', department: 'daily', form: 'carton', color: '#8dcac0', art: 29, price: 1200, stock: 20, size: '10매', date: '상온 보관' },
  { sku: 'toothbrush', name: '여행용 칫솔', label: 'TRAVEL TOOTHBRUSH', department: 'daily', form: 'carton', color: '#4d83ac', art: 30, price: 1900, stock: 15, size: '1개입', date: '상온 보관' },
  { sku: 'wipes', name: '휴대용 물티슈', label: 'WET WIPES', department: 'daily', form: 'bar', color: '#8d87c7', art: 31, price: 2300, stock: 17, size: '20매', date: '상온 보관' },
];

export const bundles = [
  { id: 'cafe', name: '빵 + 원두커피', discount: 500, food: ['brioche', 'donut', 'castella'], drink: ['americano', 'latte-hot'] },
  { id: 'meal', name: '한 끼 + 냉장 음료', discount: 400, food: ['fresh-chicken', 'fresh-egg', 'fresh-salad', 'curry'], drink: ['soy-milk', 'orange', 'oolong'] },
] satisfies { id: string; name: string; discount: number; food: string[]; drink: string[] }[];

export function itemBundle(sku: string) {
  return bundles.find(bundle => bundle.food.includes(sku) || bundle.drink.includes(sku));
}

function ean12(index: number) {
  const digits = '880970200' + String(index + 1).padStart(3, '0');
  const sum = [...digits].reduce((total, digit, position) => total + Number(digit) * (position % 2 ? 3 : 1), 0);
  return digits + (10 - sum % 10) % 10;
}

// Keep the original entries in their existing order so their printed barcodes stay valid.
export const items: Item[] = [...chilled, ...dry, ...additions].map((item, index) => ({ ...item, barcode: ean12(index) }));
const bySku = new Map(items.map(item => [item.sku, item]));
const byBarcode = new Map(items.map(item => [item.barcode, item]));

export function getItem(sku: string) {
  return bySku.get(sku);
}

export function lookupBarcode(code: string) {
  return byBarcode.get(code.trim());
}

function searchText(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/[^\p{L}\p{N}]/gu, '');
}

const departmentNames = Object.fromEntries(departments.map(({ id, name, label }) => [id, name + ' ' + label]));
const searchIndex = items.map(item => ({
  item, text: searchText([item.name, item.label, item.barcode, departmentNames[item.department], item.description].join(' ')),
}));

export function findItems(query: string, department?: Department, promotionsOnly = false) {
  const terms = query.trim().split(/\s+/).map(searchText).filter(Boolean);
  return searchIndex.filter(({ item, text }) => (!department || item.department === department)
    && (!promotionsOnly || item.offer || itemBundle(item.sku)) && terms.every(term => text.includes(term)))
    .map(({ item }) => item);
}
