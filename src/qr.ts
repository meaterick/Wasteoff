import qrcode from 'qrcode-generator';

/**
 * 시연용 QR 코드 행렬을 만듭니다.
 * 내용은 지금 보고 있는 이 페이지의 주소입니다. 발표 중 관객이 스캔하면 이 시연 페이지가 열립니다.
 */
export function demoUrl(): string {
  if (typeof window === 'undefined') return 'https://example.com/';
  return window.location.origin + window.location.pathname;
}

export function qrMatrix(text: string = demoUrl()): boolean[][] {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
}

/** 캔버스에 QR을 그립니다. (x, y)부터 size 크기의 정사각형, 흰 여백 포함 */
export function drawQr(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, matrix = qrMatrix()) {
  const n = matrix.length;
  const quiet = 2;
  const cell = size / (n + quiet * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = '#1b2a22';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        ctx.fillRect(x + (c + quiet) * cell, y + (r + quiet) * cell, Math.ceil(cell), Math.ceil(cell));
      }
    }
  }
}
