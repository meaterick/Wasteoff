import { finalAmount, inventory, limitedQty, mainReward, pickup, pointPolicy, points, product, store, won, pt } from '../data';

/** 3D 과정의 단계. 3D 모듈을 불러오기 전에도 화면 문구를 보여 줄 수 있도록 three와 분리해 둡니다. */
export interface ProcessStep {
  key: string;
  label: string;
  headline: string;
  desc: string;
  /** 자동 재생 시 머무는 시간(ms) */
  duration: number;
}

export const processSteps: ProcessStep[] = [
  {
    key: 'forecast',
    label: '수요예측',
    headline: `남을 예상 ${limitedQty}개`,
    desc: `${store.checkTime}, 수요예측이 ${store.saleEnd}까지 정상가로 팔릴 ${product.name}을 ${inventory.expectedRegularSales}개로 봅니다. 재고 ${inventory.onHand}개에서 확정 주문 ${inventory.confirmedOrders}개, 안전재고 ${inventory.safetyStock}개를 빼면 ${limitedQty}개가 남을 것으로 예상됩니다.`,
    duration: 6500,
  },
  {
    key: 'approve',
    label: '점주 승인',
    headline: `${limitedQty}개 판매 공개`,
    desc: `점주는 추천된 상품과 수량을 확인하고 승인만 합니다. 승인된 ${limitedQty}개가 Wasteoff 사이트에 한정 판매로 올라갑니다.`,
    duration: 6000,
  },
  {
    key: 'browse',
    label: '사이트 확인',
    headline: '마감 상품 확인',
    desc: `고객은 Wasteoff 사이트에서 ${store.name}의 오늘 마감 상품과 남은 수량, 주문·픽업 마감 시간을 확인합니다.`,
    duration: 6000,
  },
  {
    key: 'pay',
    label: 'QR 결제',
    headline: won(finalAmount),
    desc: `전날까지 쌓인 ${pt(points.used)}를 쓰면 ${won(finalAmount)}이 남고, 사이트에 뜬 결제 QR을 간편결제 앱으로 스캔해 선결제합니다.`,
    duration: 7500,
  },
  {
    key: 'pickup',
    label: '주문번호 픽업',
    headline: pickup.number,
    desc: `직원이 도시락을 카운터에 꺼내 두고, 고객은 픽업 번호로 ${product.pickupDeadline}까지 받아 갑니다.`,
    duration: 6500,
  },
  {
    key: 'reward',
    label: '포인트 적립',
    headline: `+${pt(points.earned)}`,
    desc: `포인트는 상품별 재고와 수요예측으로 정해집니다. ${product.name}은 계산값 ${pt(Math.round(mainReward.raw))}이지만 상한 ${pt(pointPolicy.maxPoints)}가 적용되고, 오늘 적립분은 내일부터 쓸 수 있습니다.`,
    duration: 5500,
  },
];
