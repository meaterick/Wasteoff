import { finalAmount, inventory, limitedQty, pickup, points, product, store, won, pt } from '../data';

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
    desc: `점주는 추천된 상품과 수량을 확인하고 승인만 합니다. 승인된 ${limitedQty}개가 한정 판매로 열리고 매장 앞 QR 포스터에 표시됩니다.`,
    duration: 6000,
  },
  {
    key: 'qr',
    label: 'QR 접속',
    headline: 'QR 스캔',
    desc: '고객이 매장 앞 포스터의 QR을 휴대폰 카메라로 찍으면, 앱 설치 없이 자체 주문 사이트가 열립니다.',
    duration: 6500,
  },
  {
    key: 'pay',
    label: '웹 결제',
    headline: won(finalAmount),
    desc: `자체 사이트에서 ${product.name}(${won(product.price)})를 고르고 ${pt(points.used)}를 써서 ${won(finalAmount)}을 선결제합니다.`,
    duration: 7000,
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
    desc: `수령이 끝나면 ${pt(points.earned)}가 적립되어 잔액은 ${pt(points.balance)}가 됩니다.`,
    duration: 5500,
  },
];
