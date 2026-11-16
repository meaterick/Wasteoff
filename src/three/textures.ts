import { drawQr } from '../qr';
import { finalAmount, payment, pickup, product, site, store, won, pt } from '../data';

/** 3D 장면 안 캔버스 텍스처를 그리는 함수들 (휴대폰 화면, QR 포스터, 간판) */

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
    '한정 개 원 도시락 간편식 오늘 마감 화면 예시 잔액 적립',
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

export type ScreenKind = 'scan' | 'scanFound' | 'product' | 'pay' | 'done';

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

function button(ctx: CanvasRenderingContext2D, label: string) {
  rr(ctx, 30, PHONE_H - 132, PHONE_W - 60, 88, 22);
  ctx.fillStyle = C.green;
  ctx.fill();
  text(ctx, label, PHONE_W / 2, PHONE_H - 75, 30, '#ffffff', 800, 'center');
}

function row(ctx: CanvasRenderingContext2D, y: number, label: string, value: string, valueColor = C.ink, size = 30) {
  text(ctx, label, 56, y, 25, C.ink2, 600);
  text(ctx, value, PHONE_W - 56, y, size, valueColor, 800, 'right');
}

function qrViewfinder(ctx: CanvasRenderingContext2D) {
  // 카메라 화면: 어두운 배경 위 포스터 일부
  const g = ctx.createLinearGradient(0, 0, 0, PHONE_H);
  g.addColorStop(0, '#26332c');
  g.addColorStop(1, '#121a16');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PHONE_W, PHONE_H);
  // 포스터 종이
  ctx.save();
  ctx.translate(PHONE_W / 2, 470);
  ctx.rotate(-0.04);
  rr(ctx, -200, -250, 400, 520, 18);
  ctx.fillStyle = '#f3ecdb';
  ctx.fill();
  ctx.fillStyle = C.green;
  ctx.fillRect(-200, -250, 400, 70);
  text(ctx, '마감 한정 판매', 0, -203, 30, '#ffffff', 800, 'center');
  drawQr(ctx, -150, -150, 300);
  text(ctx, '휴대폰 카메라로 스캔하세요', 0, 205, 23, C.ink2, 700, 'center');
  ctx.restore();
  // 스캔 가이드 모서리
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  const x0 = PHONE_W / 2 - 175;
  const y0 = 470 - 175 - 30;
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

export function drawScreen(kind: ScreenKind, photo: HTMLImageElement): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = PHONE_W;
  cv.height = PHONE_H;
  const ctx = cv.getContext('2d')!;

  if (kind === 'scan' || kind === 'scanFound') {
    qrViewfinder(ctx);
    statusBar(ctx, '22:12', true);
    mockBadge(ctx, PHONE_W - 26, 84, true);
    if (kind === 'scan') {
      text(ctx, 'QR 코드를 화면 안에 맞춰 주세요', PHONE_W / 2, 860, 26, '#ffffff', 700, 'center');
    } else {
      // 스캔 결과 시트
      rr(ctx, 22, 780, PHONE_W - 44, 290, 30);
      ctx.fillStyle = C.paper;
      ctx.fill();
      ctx.fillStyle = C.green;
      rr(ctx, 50, 812, 64, 64, 16);
      ctx.fill();
      ctx.fillStyle = C.orange;
      rr(ctx, 64, 830, 18, 28, 4);
      ctx.fill();
      text(ctx, site.name, 132, 840, 28, C.ink, 800);
      text(ctx, `${store.name} 마감 상품 · 앱 설치 없이`, 132, 874, 21, C.ink3, 600);
      rr(ctx, 50, 930, PHONE_W - 100, 96, 22);
      ctx.fillStyle = C.green;
      ctx.fill();
      text(ctx, '웹 주문 페이지 열기', PHONE_W / 2, 990, 30, '#ffffff', 800, 'center');
    }
    return cv;
  }

  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, PHONE_W, PHONE_H);
  statusBar(ctx, kind === 'product' ? '22:14' : kind === 'pay' ? '22:16' : '22:17');
  browserBar(ctx);
  mockBadge(ctx, PHONE_W - 26, 156);

  if (kind === 'product') {
    text(ctx, `${store.name} 마감 상품`, 40, 186, 30, C.ink, 800);
    ctx.save();
    rr(ctx, 30, 214, PHONE_W - 60, 300, 26);
    ctx.clip();
    cover(ctx, photo, 30, 214, PHONE_W - 60, 300);
    ctx.restore();
    text(ctx, product.name, 40, 580, 40, C.ink, 800);
    rr(ctx, PHONE_W - 190, 544, 150, 50, 25);
    ctx.fillStyle = C.orange;
    ctx.fill();
    text(ctx, `한정 ${product.limitedQty}개`, PHONE_W - 115, 579, 26, '#ffffff', 800, 'center');
    text(ctx, won(product.price), 40, 640, 44, C.green, 800);
    rr(ctx, 30, 676, PHONE_W - 60, 170, 22);
    ctx.fillStyle = C.ivory;
    ctx.fill();
    row(ctx, 742, '주문 마감', product.orderDeadline);
    ctx.fillStyle = C.line;
    ctx.fillRect(56, 762, PHONE_W - 112, 2);
    row(ctx, 816, '픽업 마감', product.pickupDeadline);
    button(ctx, '1개 선결제하기');
  } else if (kind === 'pay') {
    text(ctx, '선결제', 40, 192, 34, C.ink, 800);
    row(ctx, 262, `${product.name} × 1`, won(product.price), C.ink, 28);
    ctx.fillStyle = C.line;
    ctx.fillRect(40, 288, PHONE_W - 80, 2);
    rr(ctx, 30, 312, PHONE_W - 60, 140, 22);
    ctx.fillStyle = C.greenSoft;
    ctx.fill();
    row(ctx, 370, '보유 포인트', pt(payment.pointsOwned), C.ink, 28);
    row(ctx, 424, `${pt(payment.pointsUsed)} 모두 사용`, `−${won(payment.pointsUsed)}`, C.green, 28);
    text(ctx, '최종 결제액', 40, 512, 26, C.ink2, 700);
    text(ctx, won(finalAmount), 36, 592, 82, C.orangeDeep, 900);
    text(ctx, '결제 수단', 40, 656, 23, C.ink3, 700);
    payment.methods.forEach((m, i) => {
      const y = 680 + i * 84;
      const sel = m === payment.selectedMethod;
      rr(ctx, 30, y, PHONE_W - 60, 70, 18);
      ctx.fillStyle = sel ? C.greenSoft : C.paper;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = sel ? C.green : C.line;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(68, y + 35, 12, 0, Math.PI * 2);
      ctx.lineWidth = sel ? 9 : 3;
      ctx.strokeStyle = sel ? C.green : C.ink3;
      ctx.stroke();
      text(ctx, m, 98, y + 45, 27, C.ink, 700);
    });
    button(ctx, `${won(finalAmount)} 결제하기`);
  } else {
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

/** 매장 앞 QR 포스터 */
export function drawPoster(): HTMLCanvasElement {
  const W = 600;
  const H = 860;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.green;
  ctx.fillRect(0, 0, W, 132);
  text(ctx, '마감 한정 판매', W / 2, 62, 46, '#ffffff', 800, 'center');
  text(ctx, `주문 마감 ${product.orderDeadline} · 픽업 마감 ${product.pickupDeadline}`, W / 2, 108, 24, '#cfe2d6', 600, 'center');
  text(ctx, product.name, 48, 196, 38, C.ink, 800);
  rr(ctx, W - 210, 158, 162, 54, 27);
  ctx.fillStyle = C.orange;
  ctx.fill();
  text(ctx, `한정 ${product.limitedQty}개`, W - 129, 196, 28, '#ffffff', 800, 'center');
  drawQr(ctx, 130, 236, 340);
  text(ctx, '휴대폰 카메라로 스캔하세요', W / 2, 630, 32, C.ink, 800, 'center');
  text(ctx, '앱 설치 없이 바로 결제', W / 2, 676, 27, C.green, 700, 'center');
  ctx.fillStyle = C.line;
  ctx.fillRect(48, 712, W - 96, 2);
  text(ctx, `${store.name} · ${site.name}`, W / 2, 764, 24, C.ink3, 600, 'center');
  text(ctx, '화면 예시', W / 2, 816, 22, C.orangeDeep, 800, 'center');
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

