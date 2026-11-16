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

/** 제육 도시락의 수요예측 결과: 12 − 1 − 5 − 2 = 4 (예상 정상가 판매 5개가 수요예측 값) */
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

/** 수요예측에 쓰는 근거 (예시) */
export const forecastBasis = ['최근 4주 같은 요일 판매', '시간대별 판매 흐름', '오늘 날씨·캠퍼스 일정'];

/**
 * 유동 포인트 규칙 (예시 값)
 * 적립 포인트 = 가격 × (기본 비율 + 남을 예상 비율 × 가중치)
 *   남을 예상 비율 = 수요예측상 남을 수량 ÷ 실물 재고
 * 상한: 가격의 maxRate, 그리고 상품 1개당 maxPoints 중 작은 값. 10P 단위로 내림.
 * 적립된 포인트는 당일에는 쓸 수 없고 다음 날부터 사용할 수 있습니다.
 */
export const pointPolicy = {
  baseRate: 0.1,
  weight: 0.45,
  maxRate: 0.3,
  maxPoints: 1000,
  unit: 10,
  usableFrom: '적립 다음 날부터',
};

export function rewardFor(price: number, stock: number, expectedLeft: number) {
  const leftRatio = stock > 0 ? expectedLeft / stock : 0;
  const rawRate = expectedLeft > 0 ? pointPolicy.baseRate + leftRatio * pointPolicy.weight : 0;
  const rate = Math.min(rawRate, pointPolicy.maxRate);
  const limit = Math.min(price * pointPolicy.maxRate, pointPolicy.maxPoints);
  const raw = price * rawRate;
  const points = Math.floor(Math.min(raw, limit) / pointPolicy.unit) * pointPolicy.unit;
  return { leftRatio, rawRate, rate, raw, points, capped: raw > limit };
}

/** 수요예측이 오늘 남을 것으로 본 상품과 추천 수량. 점주는 이 목록을 승인만 합니다. */
export const recommendations = [
  { name: '제육 도시락', stock: 12, expectedLeft: 4, saleEnd: '23:00', price: 5000, main: true },
  { name: '참치마요 삼각김밥', stock: 6, expectedLeft: 3, saleEnd: '24:00', price: 1500, main: false },
  { name: '햄치즈 샌드위치', stock: 8, expectedLeft: 2, saleEnd: '24:00', price: 3200, main: false },
].map((r) => ({ ...r, reward: rewardFor(r.price, r.stock, r.expectedLeft) }));

/** 제육 도시락: 남을 예상 4/12 → 계산값 1,250P → 상한 1,000P */
export const mainReward = recommendations[0].reward;

export const payment = {
  /** 사용 가능 포인트 (전날까지 적립분) */
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
  /** 이번 주문에 쓴 포인트 (전날까지 적립된 포인트) */
  used: 500,
  /** 이번 주문 수령 후 적립되는 유동 포인트. 당일에는 쓸 수 없음 */
  earned: mainReward.points,
  balance: 500 - 500 + mainReward.points,
  /** 오늘 바로 쓸 수 있는 포인트 (오늘 적립분 제외) */
  usableToday: 0,
};

export const flowSteps = [
  { key: 'forecast', label: '수요예측', desc: '오늘 남을 상품·수량 추천' },
  { key: 'approve', label: '점주 승인', desc: '추천대로 4개 판매 공개' },
  { key: 'browse', label: '사이트 확인', desc: '마감 상품을 사이트에서 확인' },
  { key: 'pay', label: 'QR 결제', desc: '500P 쓰고 QR로 4,500원' },
  { key: 'pickup', label: '주문번호 픽업', desc: 'A-024로 수령' },
  { key: 'reward', label: '포인트 적립', desc: '유동 1,000P · 내일부터 사용' },
] as const;

/** 자체 주문 사이트 표시 이름 (모의 화면의 주소창에 사용) */
export const site = {
  name: 'Wasteoff 웹 주문',
  path: '캠퍼스점 마감 상품',
};

export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
export const pt = (n: number) => `${n.toLocaleString('ko-KR')}P`;
