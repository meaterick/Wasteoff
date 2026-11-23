import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, Focus, Hand, ScanBarcode, Store } from 'lucide-react';
import { products, type ProductId } from './model';
import { mountMarket } from './three/view';
import type { Target } from './three/market';

export function SceneMessage({ loading }: { loading: boolean }) {
  return (
    <div className="scene-message" role="status">
      <Store aria-hidden="true" size={30} strokeWidth={1.55} />
      <strong>{loading ? '매장을 준비하고 있어요' : '이 기기에서 3D 매장을 열 수 없어요'}</strong>
      {!loading && <span>아래 상품 진열에서 장보기를 계속할 수 있어요.</span>}
    </div>
  );
}

type Props = {
  stock: Record<ProductId, number>;
  onSelect: (target: Target) => void;
  waitingForPickup: boolean;
};

export default function StoreScene({ stock, onSelect, waitingForPickup }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pins = useRef<Partial<Record<Target, HTMLButtonElement>>>({});
  const market = useRef<ReturnType<typeof mountMarket>>();
  const select = useRef(onSelect);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => { select.current = onSelect; }, [onSelect]);

  useEffect(() => {
    function contextLost() {
      market.current?.dispose();
      market.current = undefined;
      setUnavailable(true);
    }
    try {
      market.current = mountMarket({
        canvas: canvas.current!,
        viewport: viewport.current!,
        select: target => select.current(target),
        contextLost,
        movePin(target, x, y) {
          const pin = pins.current[target];
          if (pin) {
            pin.style.left = x + 'px';
            pin.style.top = y + 'px';
            pin.dataset.projected = 'true';
          }
        },
      });
    } catch {
      contextLost();
    }
    return () => {
      market.current?.dispose();
      market.current = undefined;
    };
  }, []);

  useEffect(() => { market.current?.setStock(stock); }, [stock]);

  return (
    <div className="stage-viewport" ref={viewport}>
      <canvas aria-hidden="true" className="store-canvas" ref={canvas} hidden={unavailable} />
      {unavailable ? <SceneMessage loading={false} /> : (
        <>
          <div className="store-pins">
            {products.map(product => (
              <button
                type="button" className="store-pin" key={product.id}
                ref={element => { if (element) pins.current[product.id] = element; }}
                style={{ '--pin': product.color } as CSSProperties}
                onClick={() => onSelect(product.id)}
                aria-label={product.name + ' 자세히 보기'} data-quantity={stock[product.id]}
              >
                <span className="pin-dot" />{product.short}
              </button>
            ))}
            <button
              type="button" className={'store-pin register-pin' + (waitingForPickup ? ' register-pin--ready' : '')}
              ref={element => { if (element) pins.current.register = element; }}
              onClick={() => onSelect('register')}
            >
              <ScanBarcode size={13} aria-hidden="true" /> 계산대
            </button>
          </div>
          <div className="orbit-bar">
            <span className="orbit-hint"><Hand size={14} aria-hidden="true" />드래그해서 둘러보기</span>
            <div className="orbit-controls" role="group" aria-label="매장 시점">
              <button type="button" aria-label="시점 왼쪽으로 회전" title="시점 왼쪽으로 회전"
                onClick={() => market.current?.rotate(-1)}><ChevronLeft size={17} /></button>
              <button type="button" aria-label="시점 초기화" title="시점 초기화"
                onClick={() => market.current?.reset()}><Focus size={16} /></button>
              <button type="button" aria-label="시점 오른쪽으로 회전" title="시점 오른쪽으로 회전"
                onClick={() => market.current?.rotate(1)}><ChevronRight size={17} /></button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
