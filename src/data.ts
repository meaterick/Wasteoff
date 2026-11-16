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

/** 수요예측이 오늘 남을 것으로 본 상품과 추천 수량. 점주는 이 목록을 승인만 합니다. */
export const recommendations = [
  { name: '제육 도시락', stock: 12, expectedLeft: 4, saleEnd: '23:00', main: true },
  { name: '참치마요 삼각김밥', stock: 9, expectedLeft: 3, saleEnd: '24:00', main: false },
  { name: '햄치즈 샌드위치', stock: 6, expectedLeft: 2, saleEnd: '24:00', main: false },
];

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
  { key: 'forecast', label: '수요예측', desc: '오늘 남을 상품·수량 추천' },
  { key: 'approve', label: '점주 승인', desc: '추천대로 4개 판매 공개' },
  { key: 'qr', label: 'QR 접속', desc: '앱 설치 없이 주문 사이트로' },
  { key: 'pay', label: '웹 결제', desc: '자체 사이트에서 4,500원' },
  { key: 'pickup', label: '주문번호 픽업', desc: 'A-024로 수령' },
  { key: 'reward', label: '포인트 적립', desc: '남을 상품 구매로 1,000P' },
] as const;

/** 자체 주문 사이트 표시 이름 (모의 화면의 주소창에 사용) */
export const site = {
  name: 'Wasteoff 웹 주문',
  path: '캠퍼스점 마감 상품',
};

export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
export const pt = (n: number) => `${n.toLocaleString('ko-KR')}P`;
