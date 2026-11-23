import { useEffect, useRef, type CSSProperties } from 'react';
import { ArrowRight, Clock3, Plus, X } from 'lucide-react';
import {
  approvedQuantity, availableQuantity, closingTime, pendingOrder, points, products, rewardPoints, won,
  type Product, type ProductId, type Store,
} from './model';

export function PackArt({ product }: { product: Product }) {
  return (
    <div className={'pack-art pack-art--' + product.id} style={{ '--food': product.color } as CSSProperties} aria-hidden="true">
      <span className="pack">
        <span className="pack-paper"><b>WO.</b><small>{product.label}</small></span>
        <span className="pack-food" />
      </span>
    </div>
  );
}

export function ShopItems({ store, stock, disabled, onAdd, onSelect }: {
  store: Store;
  stock: Record<ProductId, number>;
  disabled: boolean;
  onAdd: (id: ProductId) => void;
  onSelect: (id: ProductId) => void;
}) {
  return (
    <section className="shelf" aria-labelledby="shelf-title">
      <div className="shelf-heading">
        <h2 id="shelf-title">마감 진열</h2>
        <span><Clock3 size={14} aria-hidden="true" /> {closingTime} 판매 종료</span>
      </div>
      <div className="product-grid">
        {products.map(product => {
          const left = stock[product.id] - store.cart[product.id];
          return (
            <article className="product-card" key={product.id}>
              <button className="product-detail-button" type="button" onClick={() => onSelect(product.id)}
                aria-label={product.name + ' 상품 정보'}>
                <PackArt product={product} />
                <span className="product-name">{product.name}</span>
              </button>
              <div className="product-price"><strong>{won(product.price)}</strong><span>{left > 0 ? left + '개 담을 수 있음' : '담기 마감'}</span></div>
              <div className="product-actions">
                <span className="point-tag">+{points(rewardPoints(store.scenario, product))}</span>
                <button className="add-button" type="button" disabled={disabled || left <= 0}
                  onClick={() => onAdd(product.id)} aria-label={product.name + ' 담기'}>
                  <Plus size={18} aria-hidden="true" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function ProductDialog({ product, store, onClose, onAdd }: {
  product: Product;
  store: Store;
  onClose: () => void;
  onAdd: (id: ProductId) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const left = availableQuantity(store, product) - store.cart[product.id];
  const reward = rewardPoints(store.scenario, product);
  const pickingUp = Boolean(pendingOrder(store));

  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => { element.close(); };
  }, []);

  return (
    <dialog className="product-dialog" ref={dialog} aria-labelledby="product-title"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="dialog-inner">
        <button type="button" className="icon-button dialog-close" aria-label="상품 정보 닫기" onClick={onClose}><X size={20} /></button>
        <PackArt product={product} />
        <div className="dialog-body">
          <p className="eyebrow">{product.category}</p>
          <h2 id="product-title">{product.name}</h2>
          <strong className="dialog-price">{won(product.price)}</strong>
          <dl className="details-grid">
            <div><dt>판매 승인 수량</dt><dd>{approvedQuantity(store.scenario, product)}개</dd></div>
            <div><dt>담을 수 있는 수량</dt><dd>{left}개</dd></div>
            <div><dt>픽업 마감</dt><dd>{closingTime}</dd></div>
            <div><dt>수령 후 적립</dt><dd>+{points(reward)}</dd></div>
          </dl>
          <button type="button" className="button button-primary button-wide" disabled={left <= 0 || pickingUp}
            onClick={() => { onAdd(product.id); onClose(); }}>
            {pickingUp ? '수령 대기 주문이 있어요' : left > 0 ? '장바구니에 담기' : '현재 담을 수 없어요'}
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
    </dialog>
  );
}
