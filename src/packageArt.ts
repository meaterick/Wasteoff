import classic from './assets/package-labels.webp';
import assortment from './assets/assortment-labels.webp';

export function packageArt(art: number) {
  if (art < 0) return undefined;
  const original = art < 12;
  const columns = original ? 4 : 5;
  const rows = original ? 3 : 4;
  const index = original ? art : art - 12;
  return { url: original ? classic : assortment, columns, rows, x: index % columns, y: Math.floor(index / columns) };
}
