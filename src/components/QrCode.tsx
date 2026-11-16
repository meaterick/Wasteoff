import { useMemo } from 'react';
import { qrMatrix } from '../qr';

/** QR 코드를 SVG로 그립니다. 내용은 이 시연 페이지 주소입니다. */
export function QrCode({ size = 132, label }: { size?: number; label: string }) {
  const matrix = useMemo(() => qrMatrix(), []);
  const n = matrix.length;
  const q = 2;
  const d = matrix.flatMap((row, r) => row.map((on, c) => (on ? `M${c + q} ${r + q}h1v1h-1z` : ''))).join('');
  return (
    <svg
      className="qr"
      width={size}
      height={size}
      viewBox={`0 0 ${n + q * 2} ${n + q * 2}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
    >
      <rect width="100%" height="100%" fill="#fff" />
      <path d={d} fill="#1b2a22" />
    </svg>
  );
}
