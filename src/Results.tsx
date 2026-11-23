import { ArrowDownRight, ArrowRight, BarChart3, CircleHelp, Coins, Download, RotateCcw, ShoppingBasket, Trash2, type LucideIcon } from 'lucide-react';
import {
  approvedQuantity, budgetBalance, canRestart, closingStep, closingTime, compare, disposalCostPerUnit, openingBudget, pendingOrder, scenarios, won,
  type Store,
} from './model';

const unit = (amount: number) => amount + '개';
const signed = (amount: number, format: (value: number) => string) => (amount > 0 ? '+' : '') + format(amount);

function Metric({ label, value, change, trend, icon: Icon }: {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'flat';
  icon: LucideIcon;
}) {
  return (
    <article className="metric">
      <span className="metric-icon"><Icon size={20} aria-hidden="true" /></span>
      <div className="metric-label">{label}</div>
      <strong className="metric-value">{value}</strong>
      <span className={'metric-change metric-change--' + trend}>{change}</span>
    </article>
  );
}

function downloadResults(store: Store, participant: string) {
  const { control, wasteoff, rows } = compare(store);
  const data = [
    ['참가자', '시나리오', '시작 예산(원)', '남은 예산(원)'],
    [participant, scenarios[store.scenario].name, openingBudget, budgetBalance(store)],
    [],
    ['판매 방식', '정상가 판매', '마감 수령', '폐기 수량', '결제액(원)', '추정 이익(원)'],
    ['일반 판매', control.regular, control.rescued, control.waste, control.cash, control.contribution],
    ['Wasteoff', wasteoff.regular, wasteoff.rescued, wasteoff.waste, wasteoff.cash, wasteoff.contribution],
    [],
    ['상품', '초기 재고', '예측', '승인', '수령', '일반 폐기', 'Wasteoff 폐기'],
    ...rows.map(({ product, rescued, controlWaste, waste }) => [
      product.name, product.stock, scenarios[store.scenario].forecast[product.id],
      approvedQuantity(store.scenario, product), rescued, controlWaste, waste,
    ]),
  ];
  const csv = data.map(row => row.map(value => '"' + String(value).replace(/"/g, '""') + '"').join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
  const download = document.createElement('a');
  download.href = url;
  download.download = 'wasteoff-' + store.scenario + '.csv';
  download.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Results({ store, participant, onShop, onClose, onReset }: {
  store: Store;
  participant?: string;
  onShop: () => void;
  onClose: () => void;
  onReset: () => void;
}) {
  const { rows, control, wasteoff } = compare(store);
  const completed = store.step === closingStep;
  const wasteSaved = control.waste - wasteoff.waste;
  const regularDifference = wasteoff.regular - control.regular;
  const contributionDifference = wasteoff.contribution - control.contribution;
  const pickup = pendingOrder(store);
  const chart = [
    { label: '폐기 수량', before: control.waste, after: wasteoff.waste },
    { label: '정상가 판매', before: control.regular, after: wasteoff.regular },
    { label: '마감 수령', before: control.rescued, after: wasteoff.rescued },
  ];
  const max = Math.max(1, ...chart.flatMap(row => [row.before, row.after]));

  return (
    <div className="results">
      <div className="results-bar">
        <div className="result-status">
          <span className="status-dot" /> {completed ? '마감 결과' : '마감 예상 결과'} <span>· {scenarios[store.scenario].name}</span>
        </div>
        <div className="results-actions">
          {participant && canRestart(store) && <button type="button" className="button button-secondary" onClick={onReset}><RotateCcw size={15} /> 다시 시작</button>}
          {participant && completed && <button type="button" className="button button-secondary" onClick={() => downloadResults(store, participant)}><Download size={16} /> 결과 CSV</button>}
          {participant && !completed && <button type="button" className="button button-primary" onClick={onClose}>
            {closingTime} 마감 처리 <ArrowRight size={16} aria-hidden="true" />
          </button>}
        </div>
      </div>
      {pickup && <p className="result-note">수령 대기 중인 {pickup.number} 주문은 마감까지 수령하지 않으면 취소돼요.</p>}
      {!wasteoff.rescued && !completed && (
        <p className="result-note result-note--action">
          매장에서 상품을 구매하고 수령하면 결과에 반영돼요.
          <button className="text-button" type="button" onClick={onShop}>매장으로 이동 <ArrowRight size={15} /></button>
        </p>
      )}

      <div className="metrics">
        <Metric icon={Trash2} label="마감 폐기" value={unit(wasteoff.waste)}
          change={wasteSaved > 0 ? unit(wasteSaved) + ' 감소' : wasteSaved < 0 ? unit(-wasteSaved) + ' 증가' : '변화 없음'}
          trend={wasteSaved > 0 ? 'up' : wasteSaved < 0 ? 'down' : 'flat'} />
        <Metric icon={ShoppingBasket} label="정상가 판매" value={unit(wasteoff.regular)}
          change={regularDifference ? signed(regularDifference, unit) + ' 변화' : '변화 없음'}
          trend={regularDifference > 0 ? 'up' : regularDifference < 0 ? 'down' : 'flat'} />
        <Metric icon={Coins} label="점포 추정 이익" value={won(wasteoff.contribution)}
          change={contributionDifference ? signed(contributionDifference, won) + ' 변화' : '변화 없음'}
          trend={contributionDifference > 0 ? 'up' : contributionDifference < 0 ? 'down' : 'flat'} />
      </div>

      <div className="result-grid">
        <section className="result-panel" aria-labelledby="comparison-title">
          <div className="result-panel-title">
            <BarChart3 size={19} aria-hidden="true" />
            <h2 id="comparison-title">판매 방식 비교</h2>
          </div>
          <div className="chart-legend"><span><i /> 일반 판매</span><span><i /> Wasteoff</span></div>
          <dl className="comparison-chart">
            {chart.map(row => (
              <div className="chart-row" key={row.label}>
                <dt>{row.label}</dt>
                <dd>
                  <div className="bar-row">
                    <span className="sr-only">일반 판매 </span>
                    <div className="bar-track" aria-hidden="true"><span style={{ width: row.before / max * 100 + '%' }} /></div>
                    <strong>{unit(row.before)}</strong>
                  </div>
                  <div className="bar-row bar-row--wasteoff">
                    <span className="sr-only">Wasteoff </span>
                    <div className="bar-track" aria-hidden="true"><span style={{ width: row.after / max * 100 + '%' }} /></div>
                    <strong>{unit(row.after)}</strong>
                  </div>
                </dd>
              </div>
            ))}
          </dl>
          <table className="money-table">
            <thead><tr><td /><th scope="col">일반 판매</th><th scope="col">Wasteoff</th></tr></thead>
            <tbody>
              <tr><th scope="row">결제액 합계</th><td>{won(control.cash)}</td><td>{won(wasteoff.cash)}</td></tr>
              <tr><th scope="row">점포 추정 이익</th><td>{won(control.contribution)}</td><td>{won(wasteoff.contribution)}</td></tr>
            </tbody>
          </table>
        </section>

        <section className="result-panel" aria-labelledby="product-results-title">
          <div className="result-panel-title">
            <ArrowDownRight size={19} aria-hidden="true" />
            <h2 id="product-results-title">상품별 재고와 폐기</h2>
          </div>
          <div className="table-scroll" tabIndex={0} role="region" aria-label="상품별 재고와 폐기 표">
            <table className="product-results">
              <thead>
                <tr><th scope="col">상품</th><th scope="col">초기</th><th scope="col">예측</th><th scope="col">승인</th><th scope="col">수령</th><th scope="col">폐기 변화</th></tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.product.id}>
                    <th scope="row">{row.product.name}</th>
                    <td>{row.product.stock}</td><td>{scenarios[store.scenario].forecast[row.product.id]}</td>
                    <td>{approvedQuantity(store.scenario, row.product)}</td><td>{row.rescued}</td>
                    <td><span className={row.controlWaste > row.waste ? 'saved-amount' : undefined}>{row.controlWaste} → {row.waste}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details className="method">
            <summary><CircleHelp size={17} aria-hidden="true" /> 비교 기준</summary>
            <ul>
              <li>시나리오별로 정한 초기 재고와 15분마다의 일반 손님 수요를 두 방식에 동일하게 적용합니다.</li>
              <li>예측은 마감까지의 일반 수요 가정값입니다. 마감에 여는 수량은 초기 재고에서 예측과 안전재고를 뺀 값으로 제한합니다.</li>
              <li>마감 주문은 추가 수요로 가정합니다. 결제하면 재고를 확보하고, 마감까지 수령을 마친 주문만 집계합니다.</li>
              <li>추정 이익은 결제액에서 초기 재고의 원가, 수령 적립금과 폐기 비용(개당 {won(disposalCostPerUnit)})을 뺀 값입니다. 1P는 1원으로 계산합니다.</li>
            </ul>
            <p>가상 재고와 수요를 사용한 결과입니다. 실제 매장의 폐기 감소나 수익은 현장 데이터로 검증해야 합니다.</p>
          </details>
        </section>
      </div>
    </div>
  );
}
