export type RenderMode = 'auto' | 'smooth' | 'detail';

export function renderRatio(width: number, height: number, deviceRatio: number, touch: boolean, mode: RenderMode, scale = 1) {
  const density = mode === 'smooth' ? .93 : mode === 'detail' ? 1.8 : touch ? 1.25 : 1.60;
  const pixelBudget = mode === 'smooth' ? 660_000 : mode === 'detail' ? 2_100_000 : touch ? 840_000 : 1_550_000;
  const ratio = Math.min(deviceRatio, density, Math.sqrt(pixelBudget / Math.max(1, width * height)));
  return (mode === 'auto' ? scale : 1) * ratio;
}
