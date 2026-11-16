import { useMemo } from 'react';
import { site, store } from '../data';
import { qrMatrix } from '../qr';
import { Icon } from './ui';

/** QR 코드를 SVG로 그립니다. */
export function QrCode({ size = 132 }: { size?: number }) {
  const matrix = useMemo(() => qrMatrix(), []);
  const n = matrix.length;
  const q = 2;
  const d = matrix
    .flatMap((row, r) => row.map((on, c) => (on ? `M${c + q} ${r + q}h1v1h-1z` : '')))
    .join('');
  return (
    <svg
      className="qr"
      width={size}
      height={size}
      viewBox={`0 0 ${n + q * 2} ${n + q * 2}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label="시연 페이지로 연결되는 QR 코드"
    >
      <rect width="100%" height="100%" fill="#fff" />
      <path d={d} fill="#1b2a22" />
    </svg>
  );
}

/** 매장 QR → 자체 주문 사이트 → 결제 */
export function QrStrip() {
  const steps = [
    { icon: 'qr' as const, title: '매장 QR 스캔', desc: '매장 앞 포스터와 진열대의 QR을 휴대폰 카메라로 찍습니다.' },
    { icon: 'unlock' as const, title: '자체 주문 사이트 열림', desc: `앱 설치나 회원 가입 없이 ${site.name} 페이지가 바로 열립니다.` },
    { icon: 'card' as const, title: '사이트 안에서 결제', desc: '상품 선택부터 포인트 사용, 간편결제까지 같은 사이트에서 끝냅니다.' },
  ];
  return (
    <div className="qr-strip" data-reveal>
      <figure className="qr-poster">
        <span className="qr-poster__head">마감 한정 판매</span>
        <QrCode />
        <figcaption>
          <b>{store.name}</b> · 휴대폰 카메라로 스캔
        </figcaption>
      </figure>
      <ol className="qr-steps">
        {steps.map((s, i) => (
          <li key={s.title}>
            <span className="qr-steps__icon">
              <Icon name={s.icon} size={22} />
            </span>
            <div>
              <strong>
                {i + 1}. {s.title}
              </strong>
              <p>{s.desc}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="qr-strip__note">이 QR을 찍으면 지금 보고 있는 시연 페이지가 열립니다.</p>
    </div>
  );
}
