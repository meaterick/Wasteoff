import * as THREE from 'three';
import type { Product } from '../model';

function texture(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d')!);
  const result = new THREE.CanvasTexture(canvas);
  result.colorSpace = THREE.SRGBColorSpace;
  result.anisotropy = 4;
  return result;
}

export function sign(title: string, note: string, background: string, foreground: string, width = 768) {
  return texture(width, 128, ctx => {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, 128);
    ctx.fillStyle = foreground;
    ctx.fillRect(23, 23, 5, 82);
    ctx.font = '800 54px system-ui, sans-serif';
    ctx.fillText(title, 47, note ? 72 : 84, width - 75);
    if (note) {
      ctx.font = '600 19px system-ui, sans-serif';
      ctx.fillText(note, 49, 101, width - 75);
    }
  });
}

export function floorTiles() {
  const map = texture(256, 256, ctx => {
    ctx.fillStyle = '#d0cdbd';
    ctx.fillRect(0, 0, 256, 256);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const x = 64 * col;
        const y = 64 * row;
        ctx.fillStyle = ['#e5e2d4', '#e1dfd1', '#e8e5d7', '#e4e0d0'][(row * 5 + col * 7) % 4];
        ctx.fillRect(x + 1, y + 1, 62, 62);
        for (let i = 0; i < 25; i++) {
          const opacity = (i % 5 + 1) / 150;
          ctx.fillStyle = `rgba(76, 72, 58, ${opacity})`;
          ctx.fillRect(x + (i * 31 + 3) % 59 + 2, y + (i * 17 + 5) % 59 + 2, 2, 1);
        }
      }
    }
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(4.5, 3);
  return map;
}

export function nightWindow() {
  return texture(512, 256, ctx => {
    const sky = ctx.createLinearGradient(0, 0, 0, 256);
    sky.addColorStop(0, '#142e3b');
    sky.addColorStop(0.66, '#29515b');
    sky.addColorStop(1, '#52716c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#d4e2c0';
    ctx.beginPath();
    ctx.arc(384, 58, 15, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 19; i++) {
      const x = i * 28;
      const y = 135 + (i * 37) % 79;
      ctx.fillStyle = i % 2 ? '#142b32' : '#193239';
      ctx.fillRect(x, y, 27, 256 - y);
      for (let j = y + 12; j < 245; j += 19) {
        ctx.fillStyle = (j + i) % 4 > 1 ? '#d0b881' : '#43595a';
        ctx.fillRect(x + 6, j, 4, 5);
        ctx.fillRect(x + 15, j, 4, 5);
      }
    }
  });
}

export function dropShadow() {
  return texture(128, 128, ctx => {
    const shade = ctx.createRadialGradient(64, 64, 5, 64, 64, 64);
    shade.addColorStop(0, '#000c07');
    shade.addColorStop(0.66, '#000c07d9');
    shade.addColorStop(1, '#000c0700');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, 128, 128);
  });
}

export function packageLabel(product: Product) {
  return texture(256, 192, ctx => {
    ctx.fillStyle = product.id === 'kimbap' ? '#faf3e3' : '#fbf6e9';
    ctx.fillRect(0, 0, 256, 192);
    ctx.fillStyle = product.color;
    ctx.fillRect(0, 0, 256, 67);
    ctx.fillStyle = '#172d26';
    ctx.font = '900 23px system-ui, sans-serif';
    ctx.fillText('WO / FRESH', 12, 28);
    ctx.font = '750 24px system-ui, sans-serif';
    ctx.fillText(product.label, 12, 57, 228);

    if (product.id === 'dosirak') {
      ctx.fillStyle = '#f3e6bb';
      ctx.roundRect(12, 77, 105, 99, 12);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = '#a64934';
      ctx.roundRect(123, 77, 121, 99, 12);
      ctx.fill();
      for (let i = 0; i < 54; i++) {
        ctx.fillStyle = i % 3 ? '#f8e9c8' : '#d8c896';
        ctx.fillRect(19 + (i * 27) % 89, 85 + (i * 29) % 77, 6, 2);
        ctx.fillStyle = ['#b85636', '#d27644', '#6b382b', '#83952e'][i % 4];
        ctx.fillRect(134 + (i * 21) % 100, 86 + (i * 12) % 77, 12, 5);
      }
    } else if (product.id === 'sandwich') {
      for (const [i, color] of ['#deb784', '#eccaac', '#75aa62', '#e69c89', '#f5dda6'].entries()) {
        ctx.beginPath();
        ctx.moveTo(128, 76 + i * 8);
        ctx.lineTo(212, 145 + i * 8);
        ctx.lineTo(44, 145 + i * 8);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      }
    } else if (product.id === 'onigiri') {
      ctx.fillStyle = '#f1dfbc';
      ctx.beginPath();
      ctx.moveTo(128, 76);
      ctx.lineTo(208, 172);
      ctx.lineTo(48, 172);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#253c2e';
      ctx.fillRect(97, 126, 62, 46);
    } else {
      for (let i = 0; i < 3; i++) {
        const x = 60 + i * 67;
        for (const [radius, color] of [[28, '#304438'], [23, '#f1dfb9'], [12, '#bc724d'], [5, '#789450']] as const) {
          ctx.beginPath();
          ctx.fillStyle = color;
          ctx.arc(x, 126 + (i % 2) * 8, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  });
}
