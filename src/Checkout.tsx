import type { Dispatch, RefObject } from 'react';
import { ArrowRight, Check, CircleCheck, Coins, LogIn, Minus, Plus, ReceiptText, ScanBarcode, ShoppingBasket } from 'lucide-react';
import {
  budgetBalance, cartSummary, closingStep, closingTime, getProduct, pendingOrder, points, pointsBalance, won,
  type Action, type ProductId, type Store,
} from './model';

export function Checkout({ store, stock, host, dispatch, onAdd, onResults, signedIn, onLogin }: {
  store: Store;
  stock: Record<ProductId, number>;
  host: RefObject<HTMLElement>;
  dispatch: Dispatch<Action>;
  onAdd: (id: ProductId) => void;
  onResults: () => void;
  signedIn: boolean;
  onLogin: () => void;
}) {
  const cart = cartSummary(store);
  const balance = pointsBalance(store);
  const budget = budgetBalance(store);
  const overBudget = cart.cash > budget;
  const order = pendingOrder(store);
  const latest = store.orders[store.orders.length - 1];
  const closed = store.step >= closingStep;

  return (
    <section className="checkout-panel" aria-labelledby="cart-title" tabIndex={-1} ref={host}>
      <div className="cart-heading">
        <span className="cart-icon"><ShoppingBasket size={21} aria-hidden="true" /></span>
        <div><h2 id="cart-title">{order ? '계산대' : '장바구니'}</h2><p>{order ? '픽업 확인' : '마감 상품 주문'}</p></div>
        <span className="cart-count" aria-label={'장바구니 ' + cart.count + '개'}>{cart.count}</span>
      </div>

      {order ? (
        <div className="receipt" aria-live="polite">
          <div className="receipt-header"><CircleCheck size={17} aria-hidden="true" /> 가상 결제 완료</div>
          <div className="pickup-number">
            <span>픽업 번호</span>
            <strong>{order.number}</strong>
          </div>
          <dl className="receipt-summary">
            <div><dt>픽업 마감</dt><dd>{closingTime}</dd></div>
            <div><dt>가상 결제액</dt><dd>{won(order.cash)}</dd></div>
            <div><dt>수령 후 적립</dt><dd>+{points(order.reward)}</dd></div>
          </dl>
          <button type="button" className="button button-primary button-wide" onClick={() => dispatch({ type: 'pickup' })}>
            <ScanBarcode size={18} aria-hidden="true" /> 계산대에서 수령하기
          </button>
          <button type="button" className="button receipt-cancel" onClick={() => dispatch({ type: 'cancel' })}>주문 취소</button>
        </div>
      ) : (
        <>
          {cart.count ? (
            <ul className="cart-list" aria-label="담은 상품">
              {cart.lines.map(line => {
                const product = getProduct(line.id);
                return (
                  <li key={line.id}>
                    <span className="cart-product" style={{ borderColor: product.color }}>
                      <strong>{product.name}</strong>
                      <small>{won(product.price * line.quantity)}</small>
                    </span>
                    <div className="quantity-control" role="group" aria-label={product.name + ' 수량'}>
                      <button type="button" aria-label={product.name + ' 한 개 빼기'} onClick={() => dispatch({ type: 'remove', id: line.id })}><Minus size={14} /></button>
                      <span>{line.quantity}</span>
                      <button type="button" aria-label={product.name + ' 한 개 더 담기'} disabled={line.quantity >= stock[line.id]}
                        onClick={() => onAdd(line.id)}><Plus size={14} /></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : latest?.status === 'pickedUp' ? (
            <div className="cart-state cart-state--done">
              <span className="cart-state-icon"><Check size={27} strokeWidth={1.65} aria-hidden="true" /></span>
              <strong>수령을 마쳤어요</strong>
              <p>{latest.number} · {points(latest.reward)} 적립<br />적립한 포인트는 다음 날 쓸 수 있어요.</p>
              <button type="button" className="button button-quiet" onClick={onResults}>효과 확인 <ArrowRight size={15} /></button>
            </div>
          ) : latest?.status === 'cancelled' ? (
            <div className="cart-state">
              <span className="cart-state-icon"><ReceiptText size={27} strokeWidth={1.55} aria-hidden="true" /></span>
              <strong>주문이 취소됐어요</strong>
              <p>{latest.number} · {won(latest.cash)} 반환{latest.usedPoints > 0 && <><br />{points(latest.usedPoints)} 복원</>}</p>
            </div>
          ) : (
            <div className="cart-state">
              <span className="cart-state-icon"><ShoppingBasket size={27} strokeWidth={1.55} aria-hidden="true" /></span>
              <strong>{closed ? '오늘 판매가 끝났어요' : '아직 담은 상품이 없어요'}</strong>
              <p>{closed ? '비교 화면에서 마감 결과를 확인하세요.' : '매장이나 진열 목록에서 상품을 골라보세요.'}</p>
            </div>
          )}
          {!signedIn && (
            <div className="cart-footer">
              <button type="button" className="button button-primary button-wide" onClick={onLogin}>
                <LogIn size={17} aria-hidden="true" /> 로그인하고 장보기
              </button>
            </div>
          )}
          {signedIn && !closed && (
            <div className="cart-footer">
              {cart.count > 0 && balance > 0 && (
                <button type="button" className="use-points" role="switch" aria-checked={store.usePoints}
                  onClick={() => dispatch({ type: 'points', use: !store.usePoints })}>
                  <span><Coins size={16} aria-hidden="true" /> {points(balance)} 사용</span>
                  <span className="points-toggle" aria-hidden="true" />
                </button>
              )}
              <div className="cart-total"><span>가상 결제 금액</span><strong>{won(cart.cash)}</strong></div>
              {overBudget && <p className="budget-warning" role="status">남은 예산보다 {won(cart.cash - budget)} 많아요. 상품을 빼거나 포인트를 사용하세요.</p>}
              <button type="button" className="button button-primary button-wide" disabled={!cart.count || overBudget} onClick={() => dispatch({ type: 'checkout' })}>
                가상 결제하기 <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          )}
          {signedIn && closed && (
            <div className="cart-footer">
              <button type="button" className="button button-primary button-wide" onClick={onResults}>
                마감 결과 보기 <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
