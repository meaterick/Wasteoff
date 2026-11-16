// 발표용 고정 예시 데이터입니다. 실제 재고·주문·결제·포인트와 연결되지 않습니다.

export const store = {
  name: '캠퍼스점',
  checkTime: '22:00',
  saleEnd: '23:00',
};

export const product = {
  name: '제육 도시락',
  price: 5000,
  limitedQty: 4,
  orderDeadline: '22:40',
  pickupDeadline: '22:50',
};

/** 점주 화면: 한정 판매 수량 계산 (12 − 1 − 5 − 2 = 4) */
export const inventory = {
  onHand: 12,
  confirmedOrders: 1,
  expectedRegularSales: 5,
  safetyStock: 2,
};

export const limitedQty =
  inventory.onHand -
  inventory.confirmedOrders -
  inventory.expectedRegularSales -
  inventory.safetyStock;

export const payment = {
  pointsOwned: 500,
  pointsUsed: 500,
  methods: ['토스페이', '네이버페이', '카카오페이'] as const,
  selectedMethod: '토스페이',
};

export const finalAmount = product.price - payment.pointsUsed;

export const pickup = {
  number: 'A-024',
  quantity: 1,
};

export const points = {
  used: 500,
  earned: 1000,
  balance: 1000,
};

export const flowSteps = [
  { key: 'forecast', label: '예측', desc: '오늘 남을 수량 계산' },
  { key: 'open', label: '한정 공개', desc: '4개만 판매에 공개' },
  { key: 'pay', label: '웹 결제', desc: '포인트 쓰고 4,500원' },
  { key: 'pickup', label: '주문번호 픽업', desc: 'A-024로 수령' },
  { key: 'reward', label: '포인트 적립', desc: '수령 후 1,000P' },
] as const;

export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
export const pt = (n: number) => `${n.toLocaleString('ko-KR')}P`;
