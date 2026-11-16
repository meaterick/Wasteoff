import { forecastBasis, inventory, limitedQty, product, recommendations, store } from '../data';
import { Icon, MockBadge } from './ui';

type Kind = 'order' | 'regular' | 'safety' | 'open';

const segments: { kind: Kind; label: string; qty: number }[] = [
  { kind: 'order', label: '기존 확정 주문', qty: inventory.confirmedOrders },
  { kind: 'regular', label: '수요예측 정상가 판매', qty: inventory.expectedRegularSales },
  { kind: 'safety', label: '안전재고', qty: inventory.safetyStock },
  { kind: 'open', label: '한정 판매', qty: limitedQty },
];

/** 실물 재고 12칸을 용도별로 나눈 가로 막대 */
export function StockBar({ compact = false }: { compact?: boolean }) {
  let index = 0;
  return (
    <div className={`stockbar${compact ? ' stockbar--compact' : ''}`}>
      <div
        className="stockbar__track"
        role="img"
        aria-label={`실물 재고 ${inventory.onHand}개 중 기존 확정 주문 ${inventory.confirmedOrders}개, 예상 정상가 판매 ${inventory.expectedRegularSales}개, 안전재고 ${inventory.safetyStock}개, 한정 판매 ${limitedQty}개`}
      >
        {segments.map((s) => (
          <div key={s.kind} className={`stockbar__seg stockbar__seg--${s.kind}`} style={{ flexGrow: s.qty }}>
            {Array.from({ length: s.qty }, () => {
              const i = index++;
              return <span key={i} className="stockbar__cell" style={{ transitionDelay: `${i * 60}ms` }} />;
            })}
          </div>
        ))}
      </div>
      {!compact && (
        <ul className="stockbar__legend" aria-hidden="true">
          {segments.map((s) => (
            <li key={s.kind} className={`stockbar__seg--${s.kind}`}>
              <span className="stockbar__swatch" />
              {s.label}
              <b>{s.qty}개</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** 숫자 카드 수식: 12 − 1 − 5 − 2 = 4 */
export function Equation() {
  const terms: { op: string; kind: string; label: string; qty: number; tag?: string }[] = [
    { op: '', kind: 'stock', label: '실물 재고', qty: inventory.onHand },
    { op: '−', kind: 'order', label: '기존 확정 주문', qty: inventory.confirmedOrders },
    { op: '−', kind: 'regular', label: '수요예측 정상가 판매', qty: inventory.expectedRegularSales, tag: '23:00까지' },
    { op: '−', kind: 'safety', label: '안전재고', qty: inventory.safetyStock },
  ];
  return (
    <ol className="equation">
      {terms.map((t, i) => (
        <li key={t.kind} className="equation__item" data-reveal style={{ transitionDelay: `${i * 90}ms` }}>
          {t.op && (
            <span className="equation__op" aria-label="빼기">
              {t.op}
            </span>
          )}
          <div className={`num-card num-card--${t.kind}`}>
            <span className="num-card__label">
              {t.label}
              {t.tag && <em className="num-card__tag">{t.tag}</em>}
            </span>
            <span className="num-card__value">
              {t.qty}
              <small>개</small>
            </span>
          </div>
        </li>
      ))}
      <li className="equation__item" data-reveal style={{ transitionDelay: '360ms' }}>
        <span className="equation__op" aria-label="같음">
          =
        </span>
        <div className="num-card num-card--open">
          <span className="num-card__label">남을 예상 · 한정 판매</span>
          <span className="num-card__value">
            {limitedQty}
            <small>개</small>
          </span>
        </div>
      </li>
    </ol>
  );
}

/** 첫 화면용 점주 재고 요약 카드 */
export function OwnerMiniPanel() {
  return (
    <div className="owner-mini">
      <div className="owner-mini__head">
        <span className="owner-mini__store">
          {store.name} · 점주
        </span>
        <MockBadge />
      </div>
      <p className="owner-mini__time">{store.checkTime} 수요예측 추천 도착</p>
      <div className="owner-mini__item">
        <span className="owner-mini__name">{product.name}</span>
        <span className="owner-mini__meta">{store.saleEnd} 판매 마감</span>
      </div>
      <dl className="owner-mini__grid">
        <div>
          <dt>실물 재고</dt>
          <dd>{inventory.onHand}</dd>
        </div>
        <div>
          <dt>예측 판매</dt>
          <dd>{inventory.expectedRegularSales}</dd>
        </div>
        <div>
          <dt>주문·안전</dt>
          <dd>{inventory.confirmedOrders + inventory.safetyStock}</dd>
        </div>
      </dl>
      <StockBar compact />
      <div className="owner-mini__result">
        <span className="owner-mini__approve">
          <Icon name="check" size={16} /> 점주 승인
        </span>
        <span>한정 판매</span>
        <strong>{limitedQty}개</strong>
      </div>
    </div>
  );
}

/** 수요예측 근거 */
export function ForecastBasis() {
  return (
    <div className="basis">
      <span className="basis__title">
        <Icon name="chart" size={16} /> 수요예측 근거
      </span>
      <ul>
        {forecastBasis.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

/** 점주 승인 목록: 수요예측이 추천한 오늘 남을 상품과 수량 */
export function ApprovalList() {
  const total = recommendations.reduce((a, r) => a + r.expectedLeft, 0);
  return (
    <div className="approval">
      <div className="approval__head">
        <strong>오늘 남을 상품 추천</strong>
        <span>점주는 승인만</span>
      </div>
      <table className="approval__table">
        <thead>
          <tr>
            <th scope="col">상품</th>
            <th scope="col">재고</th>
            <th scope="col">추천 수량</th>
            <th scope="col">승인</th>
          </tr>
        </thead>
        <tbody>
          {recommendations.map((r) => (
            <tr key={r.name} className={r.main ? 'is-main' : undefined}>
              <th scope="row">
                {r.name}
                <small>{r.saleEnd} 판매 마감</small>
              </th>
              <td>{r.stock}</td>
              <td className="approval__qty">{r.expectedLeft}개</td>
              <td>
                <span className="approval__check" aria-label="승인됨">
                  <Icon name="check" size={16} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="approval__foot">
        <span>
          {recommendations.length}개 상품 · 총 {total}개
        </span>
        <span className="approval__done">
          <Icon name="check" size={16} /> 승인 완료
        </span>
      </div>
    </div>
  );
}
