import * as THREE from 'three';
import { itemBundle, type Item } from '../catalog';

export function canvasMap(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d')!);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

export function signMap(title: string, subtitle: string, back: string, ink: string, ratio = 4) {
  return canvasMap(Math.round(172 * ratio), 172, ctx => {
    const width = ctx.canvas.width;
    ctx.fillStyle = back;
    ctx.fillRect(0, 0, width, 172);
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ink;
    ctx.font = '850 68px "Pretendard Variable", "Noto Sans KR", system-ui, sans-serif';
    ctx.fillText(title, 26, subtitle ? 68 : 90, width - 52);
    if (subtitle) {
      ctx.font = '680 28px "Pretendard Variable", "Noto Sans KR", system-ui, sans-serif';
      ctx.globalAlpha = 0.82;
      ctx.fillText(subtitle, 30, 132, width - 60);
    }
  });
}

export function priceMap(item: Item) {
  return canvasMap(384, 150, ctx => {
    ctx.fillStyle = item.rescue ? '#f8e7b2' : '#f1f1e9';
    ctx.fillRect(0, 0, 384, 150);
    ctx.fillStyle = '#29362c';
    ctx.fillRect(0, 0, 7, 150);
    ctx.font = '700 36px "Noto Sans KR", sans-serif';
    ctx.fillText(item.name, 19, 48, 337);
    ctx.font = '850 55px system-ui, sans-serif';
    ctx.fillText(item.price.toLocaleString('ko-KR'), 19, 118);
    const offer = item.offer ?? (itemBundle(item.sku) ? 'SET' : '');
    if (offer) {
      ctx.fillStyle = '#3c6348';
      ctx.fillRect(258, 68, 107, 57);
      ctx.fillStyle = '#fffdef';
      ctx.font = '800 40px system-ui, sans-serif';
      ctx.fillText(offer, 273, 111);
    }
  });
}

export function repeatedSurface(kind: 'porcelain' | 'pavement' | 'asphalt') {
  const colors = {
    porcelain: ['#bcbab0', '#d8d8cf', '#e1e0d6', '#ddddd3'],
    pavement: ['#42494b', '#7d8279', '#858980', '#777d76'],
    asphalt: ['#343a3e', '#353b3f', '#353a3e', '#383c3e'],
  }[kind];
  const map = canvasMap(512, 512, ctx => {
    ctx.fillStyle = colors[0];
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 4; i++) {
      const x = i % 2 * 256;
      const y = Math.floor(i / 2) * 256;
      ctx.fillStyle = colors[1 + i % 3];
      ctx.fillRect(x + 2, y + 2, 253, 253);
      for (let j = 0; j < 760; j++) {
        ctx.fillStyle = j % 3 ? '#171b1410' : '#ffffff15';
        ctx.fillRect(x + (j * 193 + j * j * 41) % 251 + 2, y + (j * 83 + j * j * 7) % 251 + 2, 1 + j % 3, 1 + j % 2);
      }
    }
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return map;
}

export function labelMap(item: Item) {
  return canvasMap(384, 280, ctx => {
    const gradient = ctx.createLinearGradient(0, 0, 384, 280);
    gradient.addColorStop(0, item.color);
    gradient.addColorStop(1, '#f3ead3');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 384, 280);
    ctx.fillStyle = '#f5eddb';
    ctx.fillRect(21, 25, 342, 228);
    ctx.fillStyle = '#223d32';
    ctx.font = '850 23px system-ui, sans-serif';
    ctx.fillText('W / 24', 42, 67);
    ctx.font = '900 45px system-ui, sans-serif';
    ctx.fillText(item.label, 42, 129, 302);
    ctx.font = '650 26px "Noto Sans KR", sans-serif';
    ctx.fillText(item.name, 42, 174, 302);
    ctx.fillStyle = item.color;
    ctx.fillRect(42, 205, 176, 8);
    ctx.fillStyle = '#355346';
    for (let i = 0; i < 22; i++) if ((7 * i + 3) % 5) ctx.fillRect(252 + 4 * i, 199, 1 + (i % 3), 29);
  });
}
