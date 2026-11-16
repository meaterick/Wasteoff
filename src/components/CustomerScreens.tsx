import dosirak from '../assets/dosirak-1440.jpg';
import { finalAmount, payment, pickup, product, pt, store, won } from '../data';
import { Icon } from './ui';

function AppBar({ title, step }: { title: string; step?: string }) {
  return (
    <div className="appbar">
      <span className="appbar__title">{title}</span>
      {step && <span className="appbar__step">{step}</span>}
    </div>
  );
}

/** 1. 마감 상품 선택 */
export function ProductScreen() {
  return (
    <div className="screen">
      <AppBar title={`${store.name} 마감 상품`} step="1/3" />
      <div className="screen__photo">
        <img src={dosirak} alt="편의점 제육 도시락" width={1440} height={810} loading="lazy" />
        <span className="screen__photo-tag">오늘 마감</span>
      </div>
      <div className="screen__body">
        <div className="product-head">
          <h4 className="product-head__name">{product.name}</h4>
          <span className="limit-chip">한정 {product.limitedQty}개</span>
        </div>
        <p className="product-price">{won(product.price)}</p>
        <dl className="deadline-list">
          <div>
            <dt>
              <Icon name="clock" size={16} /> 주문 마감
            </dt>
            <dd>{product.orderDeadline}</dd>
          </div>
          <div>
            <dt>
              <Icon name="bag" size={16} /> 픽업 마감
            </dt>
            <dd>{product.pickupDeadline}</dd>
          </div>
        </dl>
      </div>
      <div className="screen__cta">
        <span className="fake-btn">1개 선결제하기</span>
      </div>
    </div>
  );
}

/** 2. 웹 선결제 */
export function PaymentScreen() {
  return (
    <div className="screen">
      <AppBar title="선결제" step="2/3" />
      <div className="screen__body">
        <div className="order-line">
          <span>{product.name} × 1</span>
          <span>{won(product.price)}</span>
        </div>
        <div className="points-box">
          <div className="points-box__row">
            <span>보유 포인트</span>
            <strong>{pt(payment.pointsOwned)}</strong>
          </div>
          <div className="points-box__row points-box__row--use">
            <span className="toggle" aria-hidden="true">
              <i />
            </span>
            <span>{pt(payment.pointsUsed)} 모두 사용</span>
            <strong>−{won(payment.pointsUsed)}</strong>
          </div>
        </div>
        <div className="final-amount">
          <span>최종 결제액</span>
          <strong className="hl-amount">{won(finalAmount)}</strong>
        </div>
        <p className="screen__label">결제 수단</p>
        <ul className="pay-methods">
          {payment.methods.map((m) => (
            <li key={m} className={m === payment.selectedMethod ? 'is-selected' : undefined}>
              <span className="radio" aria-hidden="true" />
              {m}
            </li>
          ))}
        </ul>
      </div>
      <div className="screen__cta">
        <span className="fake-btn">{won(finalAmount)} 결제하기</span>
      </div>
    </div>
  );
}

/** 3. 픽업 안내 */
export function PickupScreen() {
  return (
    <div className="screen">
      <AppBar title="주문 완료" step="3/3" />
      <div className="screen__body screen__body--center">
        <span className="done-icon">
          <Icon name="check" size={30} />
        </span>
        <p className="done-title">결제 완료</p>
        <div className="pickup-ticket">
          <span className="pickup-ticket__label">픽업 번호</span>
          <strong className="hl-code">{pickup.number}</strong>
          <span className="pickup-ticket__item">
            {product.name} {pickup.quantity}개 · {won(finalAmount)}
          </span>
        </div>
        <dl className="pickup-info">
          <div>
            <dt>
              <Icon name="pin" size={16} /> 수령 매장
            </dt>
            <dd>{store.name}</dd>
          </div>
          <div>
            <dt>
              <Icon name="clock" size={16} /> 수령 시간
            </dt>
            <dd>
              <b>{product.pickupDeadline}까지</b> 수령
            </dd>
          </div>
        </dl>
        <p className="pickup-hint">카운터에서 픽업 번호를 말씀해 주세요.</p>
      </div>
    </div>
  );
}
