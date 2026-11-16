import { drawQr } from '../qr';
import { finalAmount, payment, pickup, points, pointPolicy, product, recommendations, site, store, won, pt } from '../data';

/** 3D 장면 안 캔버스 텍스처를 그리는 함수들 (노트북 속 사이트 화면, 휴대폰 결제 앱 화면, 간판) */

const FONT = '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';
const C = {
  ivory: '#faf6ec',
  paper: '#fffdf8',
  green: '#1f4d3a',
  greenSoft: '#dfeadf',
  orange: '#ee7418',
  orangeDeep: '#c95a06',
  orangeSoft: '#fde6d1',
  ink: '#1b2a22',
  ink2: '#4c5a51',
  ink3: '#7b857d',
  line: '#e2d8c3',
};

/** 캔버스에 쓰는 모든 글자. 폰트 하위 집합을 미리 받아 두기 위해 사용 */
export const ALL_TEXT =
  '0123456789,.:·−-+×→ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' +
  [
    site.name,
    site.path,
    store.name,
    product.name,
    '마감 한정 판매 상품 선택 선결제하기 결제하기 주문 마감 픽업 마감 보유 포인트 모두 사용 최종 결제액 결제 수단',
    '토스페이 네이버페이 카카오페이 결제 완료 픽업 번호 수령 매장 수령 시간 까지 수령 카운터에서 픽업 번호를 말씀해 주세요',
    '휴대폰 카메라로 스캔하세요 앱 설치 없이 바로 결제 QR 코드를 화면 안에 맞춰 주세요 열기 웹 주문 페이지',
    '한정 개 원 도시락 간편식 오늘 마감 화면 예시 잔액 적립 예정 내일부터 사용 가능 결제 QR 만들기 앱으로 스캔 금액',
    '참치마요 삼각김밥 햄치즈 샌드위치 상한 남을 예상 다음 날부터 포인트는 당일 사용 불가 결제가 끝나면',
  ].join(' ');

export async function loadFonts() {
  if (!('fonts' in document)) return;
  try {
    await Promise.all([
      document.fonts.load(`800 40px ${FONT}`, ALL_TEXT),
      document.fonts.load(`600 40px ${FONT}`, ALL_TEXT),
    ]);
  } catch {
    /* 폰트를 못 받으면 시스템 글꼴로 그립니다 */
  }
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  size: number,
  color: string,
  weight = 700,
  align: CanvasTextAlign = 'left',
) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s;
  const sh = h / s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

export const PHONE_W = 540;
export const PHONE_H = 1100;

export type ScreenKind = 'scan' | 'done';

function mockBadge(ctx: CanvasRenderingContext2D, x: number, y: number, dark = false) {
  ctx.save();
  ctx.setLineDash([7, 5]);
  ctx.lineWidth = 2.5;
  rr(ctx, x - 118, y, 118, 40, 20);
  ctx.fillStyle = dark ? 'rgba(0,0,0,0.35)' : 'rgba(255,253,248,0.95)';
  ctx.fill();
  ctx.strokeStyle = dark ? '#ffd2ad' : C.orangeDeep;
  ctx.stroke();
  ctx.restore();
  text(ctx, '화면 예시', x - 59, y + 28, 19, dark ? '#ffd2ad' : C.orangeDeep, 800, 'center');
}

function statusBar(ctx: CanvasRenderingContext2D, time: string, dark = false) {
  const col = dark ? '#ffffff' : C.ink;
  text(ctx, time, 52, 52, 24, col, 700);
  ctx.fillStyle = '#15221b';
  rr(ctx, PHONE_W / 2 - 70, 22, 140, 38, 19);
  ctx.fill();
  ctx.fillStyle = col;
  [10, 16, 22].forEach((h, i) => ctx.fillRect(PHONE_W - 90 + i * 11, 54 - h, 7, h));
}

/** 자체 주문 사이트의 주소창 */
function browserBar(ctx: CanvasRenderingContext2D) {
  rr(ctx, 26, 80, PHONE_W - 52, 58, 29);
  ctx.fillStyle = C.ivory;
  ctx.fill();
  // 자물쇠 아이콘
  ctx.strokeStyle = C.green;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(64, 103, 8, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = C.green;
  rr(ctx, 53, 103, 22, 17, 3);
  ctx.fill();
  text(ctx, site.name, 88, 119, 23, C.ink, 700);
}

function row(ctx: CanvasRenderingContext2D, y: number, label: string, value: string, valueColor = C.ink, size = 30) {
  text(ctx, label, 56, y, 25, C.ink2, 600);
  text(ctx, value, PHONE_W - 56, y, size, valueColor, 800, 'right');
}

function qrViewfinder(ctx: CanvasRenderingContext2D) {
  // 결제 앱 카메라 화면: 어두운 배경 위 노트북 화면 일부
  const g = ctx.createLinearGradient(0, 0, 0, PHONE_H);
  g.addColorStop(0, '#26332c');
  g.addColorStop(1, '#121a16');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PHONE_W, PHONE_H);
  // 노트북 화면에 뜬 결제 QR
  ctx.save();
  ctx.translate(PHONE_W / 2, 470);
  ctx.rotate(-0.04);
  rr(ctx, -210, -230, 420, 470, 18);
  ctx.fillStyle = '#f3f4f2';
  ctx.fill();
  drawQr(ctx, -150, -170, 300);
  text(ctx, `결제 금액 ${won(finalAmount)}`, 0, 190, 26, C.ink, 800, 'center');
  ctx.restore();
  // 스캔 가이드 모서리
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  const x0 = PHONE_W / 2 - 175;
  const y0 = 470 - 175 - 45;
  const s = 350;
  const L = 54;
  const corners: [number, number, number, number][] = [
    [x0, y0, 1, 1],
    [x0 + s, y0, -1, 1],
    [x0, y0 + s, 1, -1],
    [x0 + s, y0 + s, -1, -1],
  ];
  corners.forEach(([x, y, dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(x, y + dy * L);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * L, y);
    ctx.stroke();
  });
}

export function drawScreen(kind: ScreenKind): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = PHONE_W;
  cv.height = PHONE_H;
  const ctx = cv.getContext('2d')!;

  if (kind === 'scan') {
    // 간편결제 앱의 QR 스캔 화면 (노트북에 뜬 결제 QR을 찍는 중)
    qrViewfinder(ctx);
    statusBar(ctx, '22:16', true);
    mockBadge(ctx, PHONE_W - 26, 84, true);
    text(ctx, `${payment.selectedMethod} · QR 결제`, PHONE_W / 2, 150, 30, '#ffffff', 800, 'center');
    rr(ctx, 22, 820, PHONE_W - 44, 250, 30);
    ctx.fillStyle = C.paper;
    ctx.fill();
    text(ctx, `${site.name} · ${store.name}`, PHONE_W / 2, 880, 24, C.ink3, 600, 'center');
    text(ctx, won(finalAmount), PHONE_W / 2, 960, 64, C.orangeDeep, 900, 'center');
    text(ctx, `${product.name} · 포인트 ${pt(payment.pointsUsed)} 사용`, PHONE_W / 2, 1010, 22, C.ink2, 600, 'center');
    return cv;
  }

  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, PHONE_W, PHONE_H);
  statusBar(ctx, '22:17');
  browserBar(ctx);
  mockBadge(ctx, PHONE_W - 26, 156);

  {
    ctx.fillStyle = C.green;
    ctx.beginPath();
    ctx.arc(PHONE_W / 2, 260, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(PHONE_W / 2 - 24, 262);
    ctx.lineTo(PHONE_W / 2 - 6, 280);
    ctx.lineTo(PHONE_W / 2 + 26, 244);
    ctx.stroke();
    text(ctx, '결제 완료', PHONE_W / 2, 368, 38, C.green, 800, 'center');
    ctx.save();
    ctx.setLineDash([12, 8]);
    rr(ctx, 30, 404, PHONE_W - 60, 270, 28);
    ctx.fillStyle = C.orangeSoft;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#f2b07a';
    ctx.stroke();
    ctx.restore();
    text(ctx, '픽업 번호', PHONE_W / 2, 462, 26, C.orangeDeep, 700, 'center');
    text(ctx, pickup.number, PHONE_W / 2, 590, 118, C.ink, 900, 'center');
    text(ctx, `${product.name} ${pickup.quantity}개 · ${won(finalAmount)}`, PHONE_W / 2, 642, 24, C.ink2, 600, 'center');
    row(ctx, 750, '수령 매장', store.name);
    ctx.fillStyle = C.line;
    ctx.fillRect(56, 772, PHONE_W - 112, 2);
    row(ctx, 830, '수령 시간', `${product.pickupDeadline}까지`, C.green);
    text(ctx, '카운터에서 픽업 번호를 말씀해 주세요', PHONE_W / 2, PHONE_H - 70, 22, C.ink3, 600, 'center');
  }
  return cv;
}

/** 매장 간판 */
export function drawSign(label: string, w = 1024, h = 200): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = C.green;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = C.orange;
  rr(ctx, 40, h / 2 - 36, 72, 72, 16);
  ctx.fill();
  text(ctx, label, 140, h / 2 + 30, 84, '#ffffff', 800);
  return cv;
}

/** 바닥 타일 */
export function drawTile(): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 256;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#efe7d6';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#e1d6bf';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, 256, 256);
  return cv;
}


export const LAPTOP_W = 1280;
export const LAPTOP_H = 800;
export type LaptopKind = 'list' | 'checkout' | 'qr' | 'done';

function laptopChrome(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, LAPTOP_W, LAPTOP_H);
  ctx.fillStyle = '#ece6d8';
  ctx.fillRect(0, 0, LAPTOP_W, 70);
  ['#e36b3a', '#f2c14e', '#7aa05a'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(34 + i * 30, 35, 9, 0, Math.PI * 2);
    ctx.fill();
  });
  rr(ctx, 150, 14, 760, 42, 21);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  text(ctx, `${site.name} · ${store.name}`, 176, 44, 24, C.ink2, 600);
  mockBadge(ctx, LAPTOP_W - 30, 15);
  // 사이트 머리
  ctx.fillStyle = C.green;
  ctx.fillRect(0, 70, LAPTOP_W, 80);
  ctx.fillStyle = C.orange;
  rr(ctx, 40, 92, 36, 36, 8);
  ctx.fill();
  text(ctx, 'Wasteoff', 92, 122, 34, '#ffffff', 800);
  text(ctx, `${store.name} 오늘 마감 상품`, LAPTOP_W - 40, 122, 26, '#cfe2d6', 600, 'right');
}

function pointChip(ctx: CanvasRenderingContext2D, x: number, y: number, label: string) {
  ctx.font = `800 22px ${FONT}`;
  const w = ctx.measureText(label).width + 28;
  rr(ctx, x, y, w, 38, 19);
  ctx.fillStyle = C.greenSoft;
  ctx.fill();
  text(ctx, label, x + 14, y + 27, 22, C.green, 800);
}

export function drawLaptop(kind: LaptopKind, photo: HTMLImageElement): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = LAPTOP_W;
  cv.height = LAPTOP_H;
  const ctx = cv.getContext('2d')!;
  laptopChrome(ctx);
  const main = recommendations[0];

  if (kind === 'list') {
    text(ctx, '수요예측으로 오늘 남을 상품만 한정 판매합니다', 40, 205, 30, C.ink, 800);
    const cardW = 380;
    recommendations.forEach((r, i) => {
      const x = 40 + i * (cardW + 20);
      const y = 236;
      rr(ctx, x, y, cardW, 470, 24);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = r.main ? 6 : 2;
      ctx.strokeStyle = r.main ? C.orange : C.line;
      ctx.stroke();
      ctx.save();
      rr(ctx, x + 16, y + 16, cardW - 32, 200, 16);
      ctx.clip();
      if (r.main) cover(ctx, photo, x + 16, y + 16, cardW - 32, 200);
      else {
        ctx.fillStyle = i === 1 ? '#efe7d6' : '#f4ead9';
        ctx.fillRect(x + 16, y + 16, cardW - 32, 200);
        ctx.fillStyle = i === 1 ? '#2a2a2a' : '#e9c88a';
        ctx.beginPath();
        ctx.moveTo(x + cardW / 2, y + 50);
        ctx.lineTo(x + cardW / 2 + 90, y + 190);
        ctx.lineTo(x + cardW / 2 - 90, y + 190);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = i === 1 ? '#ffffff' : '#f6e7b8';
        ctx.fillRect(x + cardW / 2 - 50, y + 150, 100, 30);
      }
      ctx.restore();
      text(ctx, r.name, x + 22, y + 262, 32, C.ink, 800);
      text(ctx, won(r.price), x + 22, y + 310, 34, C.green, 800);
      rr(ctx, x + cardW - 150, y + 280, 128, 42, 21);
      ctx.fillStyle = C.orange;
      ctx.fill();
      text(ctx, `한정 ${r.expectedLeft}개`, x + cardW - 86, y + 309, 22, '#ffffff', 800, 'center');
      pointChip(ctx, x + 22, y + 340, `수령 후 +${pt(r.reward.points)}`);
      text(ctx, `${r.saleEnd} 판매 마감`, x + 22, y + 420, 22, C.ink3, 600);
      if (r.main) text(ctx, `주문 ${product.orderDeadline} · 픽업 ${product.pickupDeadline}`, x + 22, y + 452, 22, C.ink2, 700);
    });
    text(ctx, `포인트는 상품별 재고와 수요예측에 따라 달라지고 1개당 최대 ${pt(pointPolicy.maxPoints)}입니다.`, 40, 760, 22, C.ink3, 600);
  } else if (kind === 'checkout') {
    ctx.save();
    rr(ctx, 40, 190, 520, 300, 24);
    ctx.clip();
    cover(ctx, photo, 40, 190, 520, 300);
    ctx.restore();
    text(ctx, `${main.name} × 1`, 40, 550, 36, C.ink, 800);
    text(ctx, won(main.price), 40, 600, 34, C.green, 800);
    pointChip(ctx, 40, 630, `수령 후 +${pt(points.earned)} 적립 예정`);
    text(ctx, '오늘 적립된 포인트는 내일부터 쓸 수 있어요', 40, 712, 22, C.ink3, 600);
    const x = 620;
    rr(ctx, x, 190, 620, 150, 22);
    ctx.fillStyle = C.greenSoft;
    ctx.fill();
    text(ctx, '사용 가능 포인트', x + 28, 245, 26, C.ink2, 600);
    text(ctx, pt(payment.pointsOwned), x + 592, 245, 28, C.ink, 800, 'right');
    text(ctx, `${pt(payment.pointsUsed)} 모두 사용`, x + 28, 305, 28, C.ink, 800);
    text(ctx, `−${won(payment.pointsUsed)}`, x + 592, 305, 28, C.green, 800, 'right');
    text(ctx, '최종 결제액', x, 400, 26, C.ink2, 700);
    text(ctx, won(finalAmount), x, 480, 80, C.orangeDeep, 900);
    text(ctx, 'QR 결제 앱', x, 540, 22, C.ink3, 700);
    payment.methods.forEach((m, i) => {
      const bx = x + i * 210;
      const sel = m === payment.selectedMethod;
      rr(ctx, bx, 556, 196, 60, 16);
      ctx.fillStyle = sel ? C.greenSoft : '#ffffff';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = sel ? C.green : C.line;
      ctx.stroke();
      text(ctx, m, bx + 98, 595, 24, C.ink, 700, 'center');
    });
    rr(ctx, x, 650, 620, 80, 20);
    ctx.fillStyle = C.green;
    ctx.fill();
    text(ctx, '결제 QR 만들기', x + 310, 702, 30, '#ffffff', 800, 'center');
  } else if (kind === 'qr') {
    rr(ctx, 120, 180, 480, 560, 28);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = C.green;
    ctx.stroke();
    drawQr(ctx, 160, 220, 400);
    text(ctx, '결제 QR', 360, 690, 30, C.green, 800, 'center');
    const x = 680;
    text(ctx, 'QR 결제', x, 240, 30, C.ink2, 700);
    text(ctx, won(finalAmount), x, 340, 96, C.orangeDeep, 900);
    text(ctx, `${main.name} ${won(main.price)} − 포인트 ${pt(payment.pointsUsed)}`, x, 395, 24, C.ink2, 600);
    rr(ctx, x, 440, 520, 120, 22);
    ctx.fillStyle = C.greenSoft;
    ctx.fill();
    text(ctx, `${payment.selectedMethod} 앱으로`, x + 28, 490, 30, C.ink, 800);
    text(ctx, 'QR을 스캔하세요', x + 28, 535, 30, C.ink, 800);
    text(ctx, '결제가 끝나면 픽업 번호가 바로 나옵니다', x, 620, 24, C.ink3, 600);
  } else {
    ctx.fillStyle = C.green;
    ctx.beginPath();
    ctx.arc(LAPTOP_W / 2, 240, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(LAPTOP_W / 2 - 24, 242);
    ctx.lineTo(LAPTOP_W / 2 - 6, 260);
    ctx.lineTo(LAPTOP_W / 2 + 26, 224);
    ctx.stroke();
    text(ctx, 'QR 결제 완료', LAPTOP_W / 2, 345, 40, C.green, 800, 'center');
    rr(ctx, LAPTOP_W / 2 - 300, 380, 600, 230, 28);
    ctx.fillStyle = C.orangeSoft;
    ctx.fill();
    text(ctx, '픽업 번호', LAPTOP_W / 2, 432, 28, C.orangeDeep, 700, 'center');
    text(ctx, pickup.number, LAPTOP_W / 2, 545, 120, C.ink, 900, 'center');
    text(ctx, `${main.name} 1개 · ${won(finalAmount)}`, LAPTOP_W / 2, 590, 26, C.ink2, 600, 'center');
    text(ctx, `${store.name} · ${product.pickupDeadline}까지 수령`, LAPTOP_W / 2, 668, 30, C.ink, 800, 'center');
    text(ctx, `수령 후 +${pt(points.earned)} 적립 · 내일부터 사용 가능`, LAPTOP_W / 2, 720, 26, C.green, 700, 'center');
  }
  return cv;
}
