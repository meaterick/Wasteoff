import * as THREE from 'three';
import surfacesUrl from '../assets/market-materials.webp';

type Kind = 'floor' | 'ceiling' | 'wood' | 'steel' | 'street' | 'paint';
const settings: Record<Kind, { index: number; fallback: string; x: number; y: number }> = {
  floor: { index: 0, fallback: '#e2dfd5', x: 12, y: 12 },
  ceiling: { index: 1, fallback: '#ece9df', x: 9, y: 9 },
  wood: { index: 2, fallback: '#b58958', x: 1, y: 1 },
  steel: { index: 3, fallback: '#b7bfbe', x: 1, y: 1 },
  street: { index: 4, fallback: '#44474b', x: 31, y: 17 },
  paint: { index: 5, fallback: '#b8b9b3', x: 2, y: 2 },
};

export function loadSurfaces(keep: <T extends { dispose(): void }>(resource: T) => T, repaint: () => void) {
  const textureAtlas = new Image();
  const maps = new Map<Kind, { texture: THREE.CanvasTexture; ctx: CanvasRenderingContext2D }>();
  let loaded = false;

  function paint(kind: Kind, ctx: CanvasRenderingContext2D) {
    const { index, fallback } = settings[kind];
    const edge = ctx.canvas.width;
    if (!loaded) {
      ctx.fillStyle = fallback;
      ctx.fillRect(0, 0, edge, edge);
      return;
    }
    const ax = textureAtlas.width / 3;
    const ay = textureAtlas.height / 2;
    const sourceX = index % 3 * ax + 2;
    const sourceY = Math.floor(index / 3) * ay + 2;
    if (kind !== 'floor') {
      ctx.drawImage(textureAtlas, sourceX, sourceY, ax - 4, ay - 4, 0, 0, edge, edge);
      return;
    }
    const tile = edge / 2;
    ctx.fillStyle = '#b6b2aa';
    ctx.fillRect(0, 0, edge, edge);
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.translate((i % 2 + .5) * tile, (Math.floor(i / 2) + .5) * tile);
      ctx.rotate(i * Math.PI / 2);
      ctx.drawImage(textureAtlas, sourceX, sourceY, ax - 4, ay - 4, -tile / 2 + 1.2, -tile / 2 + 1.2, tile - 2.4, tile - 2.4);
      ctx.fillStyle = i % 2 ? '#7a705209' : '#e7eee313';
      ctx.fillRect(-tile / 2 + 1, -tile / 2 + 1, tile - 2, tile - 2);
      ctx.restore();
    }
  }

  textureAtlas.onload = () => {
    loaded = true;
    for (const [kind, { texture, ctx }] of maps) {
      paint(kind, ctx);
      texture.needsUpdate = true;
    }
    repaint();
  };
  textureAtlas.src = surfacesUrl;

  return (kind: Kind) => {
    const existing = maps.get(kind);
    if (existing) return existing.texture;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = kind === 'floor' ? 768 : 384;
    const ctx = canvas.getContext('2d')!;
    paint(kind, ctx);
    const texture = keep(new THREE.CanvasTexture(canvas));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(settings[kind].x, settings[kind].y);
    texture.anisotropy = 4;
    maps.set(kind, { texture, ctx });
    return texture;
  };
}
