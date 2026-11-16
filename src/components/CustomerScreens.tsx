import dosirak from '../assets/dosirak-1440.jpg';
import { finalAmount, payment, pickup, points, product, pt, recommendations, site, store, won } from '../data';
import { QrCode } from './QrCode';
import { Icon } from './ui';

const TOTAL = 4;

function AppBar({ title, step }: { title: string; step?: number }) {
  return (
    <>
      <div className="urlbar">
        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="5" y="10.5" width="14" height="10" rx="2" fill="currentColor" />
          <path d="M8 10.5V8a4 4 0 018 0v2.5" fill="none" stroke="currentColor" strokeWidth="2.6" />
        </svg>
        {site.name}
      </div>
      <div className="appbar">
        <span className="appbar__title">{title}</span>
        {step && (
          <span className="appbar__step">
            {step}/{TOTAL}
          </span>
        )}
      </div>
    </>
  );
}

/** 1. 사이트에서 마감 상품 확인 */
export function ProductScreen() {
  const main = recommendations[0];
  const others = recommendations.filter((r) => !r.main);
  return (
    <div className="screen">
      <AppBar title="오늘 마감 상품" step={1} />
      <div className="screen__body screen__body--tight">
        <div className="feature">
          <div className="feature__photo">
            <img src={dosirak} alt="편의점 제육 도시락" width={1440} height={810} loading="lazy" />
            <span className="limit-chip limit-chip--on-photo">한정 {product.limitedQty}개</span>
          </div>
          <div className="feature__row">
            <h4 className="product-head__name">{product.name}</h4>
            <p className="product-price">{won(product.price)}</p>
          </div>
          <span className="pt-chip">수령 후 +{pt(main.reward.points)}</span>
          <p className="feature__deadline">
            <Icon name="clock" size={14} /> 주문 마감 <b>{product.orderDeadline}</b>
            <span aria-hidden="true">·</span>
            픽업 마감 <b>{product.pickupDeadline}</b>
          </p>
        </div>
        <ul className="mini-list">
          {others.map((r) => (
            <li key={r.name}>
              <span className="mini-list__name">{r.name}</span>
              <span className="mini-list__meta">
                {won(r.price)} · <b>+{pt(r.reward.points)}</b>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="screen__cta">
        <span className="fake-btn">{product.name} 1개 담기</span>
      </div>
    </div>
  );
}

/** 2. 포인트 사용, 결제 수단 선택 */
export function PaymentScreen() {
  return (
    <div className="screen">
      <AppBar title="주문 · 포인트 사용" step={2} />
      <div className="screen__body">
        <div className="order-line">
          <span>{product.name} × 1</span>
          <span>{won(product.price)}</span>
        </div>
        <div className="points-box">
          <div className="points-box__row">
            <span>사용 가능 포인트</span>
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
        <p className="earn-note">
          수령 후 <b>+{pt(points.earned)}</b> 적립 예정 · 내일부터 사용
        </p>
        <p className="screen__label">QR 결제 앱</p>
        <ul className="pay-methods pay-methods--row">
          {payment.methods.map((m) => (
            <li key={m} className={m === payment.selectedMethod ? 'is-selected' : undefined}>
              <span className="radio" aria-hidden="true" />
              {m}
            </li>
          ))}
        </ul>
      </div>
      <div className="screen__cta">
        <span className="fake-btn">결제 QR 만들기</span>
      </div>
    </div>
  );
}

/** 3. 사이트에 뜬 결제 QR */
export function QrPayScreen() {
  return (
    <div className="screen">
      <AppBar title="QR 결제" step={3} />
      <div className="screen__body screen__body--center">
        <p className="qrpay__amount-label">결제 금액</p>
        <strong className="hl-amount">{won(finalAmount)}</strong>
        <p className="qrpay__sub">
          {product.name} {won(product.price)} − 포인트 {pt(payment.pointsUsed)}
        </p>
        <div className="qrpay__code">
          <QrCode size={150} label="결제 QR 예시 (시연용: 스캔하면 이 시연 페이지가 열립니다)" />
        </div>
        <p className="qrpay__hint">
          <b>{payment.selectedMethod}</b> 앱으로 QR을 스캔하세요
        </p>
        <p className="qrpay__wait">결제가 끝나면 픽업 번호가 바로 나옵니다</p>
      </div>
    </div>
  );
}

/** 4. 픽업 안내 */
export function PickupScreen() {
  return (
    <div className="screen">
      <AppBar title="주문 완료" step={4} />
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
        <p className="pickup-hint">
          카운터에서 픽업 번호를 말씀해 주세요.
          <br />
          수령 후 +{pt(points.earned)} 적립 · 내일부터 사용
        </p>
      </div>
    </div>
  );
}
