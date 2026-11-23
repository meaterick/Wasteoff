import { useEffect, useId, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, BadgeCheck, Barcode, Check, CircleAlert, Coffee, CreditCard, Download, Droplets, Microwave, Minus, Plus, ReceiptText, ScanLine, Search, ShoppingBasket, Tag, Wallet, X } from 'lucide-react';
import { departments, findItems, getItem, itemBundle, preparations, type Department, type Item, type Preparation } from './catalog';
import { packageArt } from './packageArt';
import {
  budgetBalance, canRefundReceipt, closingStep, eligiblePreparations, pendingOrder, pointReward, points, pointsBalance, registerState, registerTotals, shelfStock, won,
  type Action, type Payment, type Receipt, type Store,
} from './model';
import type { StoreCue } from './storeSound';

export type Act = (action: Action) => Promise<boolean>;
type Totals = ReturnType<typeof registerTotals>;

export function Packaging({ item, className = '' }: { item: Item; className?: string }) {
  const art = packageArt(item.art);
  const style = {
    '--food': item.color,
    backgroundImage: art ? `url("${art.url}")` : undefined,
    backgroundPosition: art ? `${art.x / (art.columns - 1) * 100}% ${art.y / (art.rows - 1) * 100}%` : undefined,
    backgroundSize: art ? `${art.columns * 100}% ${art.rows * 100}%` : undefined,
  } as CSSProperties;
  return <span className={'packaging ' + className} style={style} aria-hidden="true">{!art && item.label}</span>;
}

function StoreDialog({ title, detail, icon, onClose, children, wide = false, back, backLabel = '진열대로 돌아가기' }: {
  title: string;
  detail?: string;
  icon: ReactNode;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  back?: () => void;
  backLabel?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useId();

  useEffect(() => {
    const element = ref.current!;
    element.showModal();
    element.querySelector<HTMLElement>('[data-dialog-focus]')?.focus({ preventScroll: true });
    return () => element.close();
  }, []);

  return (
    <dialog ref={ref} className={'store-dialog' + (wide ? ' store-dialog--wide' : '')} aria-labelledby={heading}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.currentTarget === event.target) onClose(); }}>
      <div className="store-dialog-frame">
        <div className="dialog-title">
          {back && <button type="button" className="icon-button" aria-label={backLabel} onClick={back}><ArrowLeft size={17} /></button>}
          <span className="dialog-icon">{icon}</span>
          <div><h2 id={heading}>{title}</h2>{detail && <p>{detail}</p>}</div>
          <button type="button" className="icon-button dialog-dismiss" aria-label="창 닫기" onClick={onClose}><X size={20} /></button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

type ProductActions = {
  store: Store;
  onInspect: (item: Item) => void;
  onAdd: (item: Item) => void;
};

function ProductRows({ products, store, onInspect, onAdd }: ProductActions & { products: Item[] }) {
  const { basket } = registerState(store);
  return (
    <div className="shelf-items">
        {products.map(item => {
          const inBasket = basket[item.sku] ?? 0;
          const stock = Math.max(0, shelfStock(store, item) - inBasket);
          const availability = item.rescue && store.step >= closingStep ? '판매 종료' : stock ? '재고 ' + stock + '개' : '진열 재고 없음';
          return (
            <article className="shelf-item" key={item.sku}>
              <button className="shelf-item-info" type="button" aria-label={item.name + ' 상품 정보'} onClick={() => onInspect(item)}>
                <Packaging item={item} />
                <span>
                  <strong>{item.name}</strong>
                  <small>{won(item.price)} <span>· {availability}</span>{!!inBasket && <span className="in-basket"> · 담음 {inBasket}개</span>}</small>
                </span>
              </button>
              {item.offer && <span className="offer-tag">{item.offer}</span>}
              {itemBundle(item.sku) && <span className="offer-tag offer-tag--bundle">세트</span>}
              {!!item.rescue && stock > 0 && <span className="offer-tag offer-tag--rescue">+{points(pointReward(store, item))}</span>}
              <button type="button" className="add-item" aria-label={item.name + ' 담기'} disabled={!stock} onClick={() => onAdd(item)}>
                <Plus size={19} aria-hidden="true" />
              </button>
            </article>
          );
        })}
      </div>
  );
}

export function ShelfDialog({ department, onClose, ...actions }: ProductActions & { department: Department; onClose: () => void }) {
  const category = departments.find(zone => zone.id === department)!;
  return (
    <StoreDialog title={category.name} detail={department === 'rescue' ? '오늘 23:00까지 판매 · 수령 포인트 적립' : category.label}
      icon={<ShoppingBasket size={20} />} onClose={onClose}>
      <ProductRows products={findItems('', department)} {...actions} />
    </StoreDialog>
  );
}

export type ProductFilters = { query: string; department?: Department; onSale: boolean };

export function CatalogDialog({ filters, onFilters, onClose, ...actions }: ProductActions & {
  filters: ProductFilters; onFilters: (filters: ProductFilters) => void; onClose: () => void;
}) {
  const { query, department, onSale } = filters;
  const products = findItems(query, department, onSale);
  return (
    <StoreDialog title="상품 검색" icon={<Search size={21} />} onClose={onClose} wide>
      <div className="catalog-filters">
        <label className="catalog-query"><Search size={18} aria-hidden="true" />
          <span className="sr-only">상품 이름 또는 바코드</span>
          <input data-dialog-focus type="search" enterKeyHint="search" placeholder="상품 이름 또는 바코드" value={query}
            onChange={event => onFilters({ ...filters, query: event.target.value })} />
          {query && <button className="icon-button" type="button" aria-label="검색어 지우기" onClick={() => onFilters({ ...filters, query: '' })}><X size={16} /></button>}
        </label>
        <div className="catalog-controls">
          <select aria-label="상품 코너" value={department ?? ''} onChange={event => onFilters({ ...filters, department: (event.target.value || undefined) as Department | undefined })}>
            <option value="">전체 코너</option>
            {departments.map(zone => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
          </select>
          <button type="button" className="button button-secondary sale-filter" aria-pressed={onSale} onClick={() => onFilters({ ...filters, onSale: !onSale })}>
            <Tag size={16} aria-hidden="true" /> 행사 상품만
          </button>
        </div>
        <p className="catalog-count" role="status">상품 {products.length}개</p>
      </div>
      {products.length ? <div className="catalog-results"><ProductRows products={products} {...actions} /></div>
        : <p className="empty-results">검색 결과가 없어요. 다른 검색어나 코너를 선택해 보세요.</p>}
    </StoreDialog>
  );
}

export function ItemDialog({ item, store, onClose, onAdd, onBack, fromSearch }: {
  item: Item;
  store: Store;
  onClose: () => void;
  onAdd: (item: Item) => void;
  onBack: () => void;
  fromSearch?: boolean;
}) {
  const inBasket = registerState(store).basket[item.sku] ?? 0;
  const stock = Math.max(0, shelfStock(store, item) - inBasket);
  const bundle = itemBundle(item.sku);
  return (
    <StoreDialog title={item.name} detail={item.label} icon={<Barcode size={20} />} onClose={onClose} back={onBack}
      backLabel={fromSearch ? '검색 결과로 돌아가기' : '진열대로 돌아가기'}>
      <div className="item-details">
        <div className="item-photo"><Packaging item={item} />{item.offer && <span className="offer-tag">{item.offer} 행사</span>}</div>
        <div className="item-description">
          <strong className="item-price">{won(item.price)}</strong>
          {item.description && <p className="product-description">{item.description}</p>}
          <dl>
            <div><dt>내용량</dt><dd>{item.size}</dd></div>
            <div><dt>진열 재고</dt><dd>{stock}개</dd></div>
            {!!inBasket && <div><dt>장바구니</dt><dd>{inBasket}개</dd></div>}
            {item.preparation && <div><dt>셀프 코너</dt><dd>{preparations[item.preparation].label}</dd></div>}
            <div><dt>{item.date.startsWith('다음 날') || item.rescue ? '소비기한' : '이용 안내'}</dt><dd>{item.date}</dd></div>
            {!!item.rescue && <div><dt>수령 후 적립</dt><dd>+{points(pointReward(store, item))}</dd></div>}
            <div className="item-barcode"><dt><Barcode size={16} aria-hidden="true" /> 바코드</dt><dd>{item.barcode}</dd></div>
          </dl>
          {bundle && <p className="bundle-callout"><Tag size={16} aria-hidden="true" /> {bundle.name} 구매 시 {won(bundle.discount)} 할인</p>}
          <button type="button" className="button button-primary button-wide" disabled={!stock} onClick={() => onAdd(item)}>
            <ShoppingBasket size={16} /> 장바구니에 담기
          </button>
        </div>
      </div>
    </StoreDialog>
  );
}

export function BasketItems({ totals, store, onAction }: { totals: Totals; store: Store; onAction: Act }) {
  if (!totals.count) return <div className="basket-empty">
    <span className="basket-glyph"><ShoppingBasket size={23} strokeWidth={1.65} /></span><strong>장바구니가 비어 있어요</strong>
  </div>;
  return <ul className="rail-basket">
    {totals.lines.map(({ item, quantity }) => <li key={item.sku}>
      <Packaging item={item} /><span><strong>{item.name}</strong><small>{won(item.price)} × {quantity}</small></span>
      <div className="basket-stepper">
        <button type="button" className="icon-button" aria-label={item.name + ' 장바구니에서 1개 빼기'}
          onClick={() => void onAction({ type: 'basket-remove', sku: item.sku })}><Minus size={15} /></button>
        <button type="button" className="icon-button" aria-label={item.name + ' 장바구니에 1개 더 담기'} disabled={quantity >= shelfStock(store, item)}
          onClick={() => void onAction({ type: 'basket-add', sku: item.sku })}><Plus size={15} /></button>
      </div>
    </li>)}
  </ul>;
}

export function BasketDiscounts({ totals }: { totals: Totals }) {
  if (!totals.discount) return null;
  return <div className="basket-discounts">
    <span><Tag size={14} aria-hidden="true" /> 행사 할인</span><strong>−{won(totals.discount)}</strong>
    {totals.bundles.map(bundle => <small key={bundle.id}>{bundle.name} × {bundle.count}</small>)}
  </div>;
}

export function BasketDialog({ store, onAction, onCheckout, onClose }: { store: Store; onAction: Act; onCheckout: () => void; onClose: () => void }) {
  const totals = registerTotals(store);
  return <StoreDialog title="장바구니" detail={totals.count + '개 · 잔액 ' + won(budgetBalance(store))} icon={<ShoppingBasket size={20} />} onClose={onClose}>
    <div className="basket-dialog-content">
      <BasketItems totals={totals} store={store} onAction={onAction} />
      <BasketDiscounts totals={totals} />
      <div className="basket-total"><span>결제 예정</span><strong>{won(totals.charged)}</strong></div>
      <button type="button" className="button button-primary button-wide" onClick={onCheckout}><ScanLine size={17} /> 계산대로 이동</button>
    </div>
  </StoreDialog>;
}

const paymentName = { card: '카드', cash: '현금' };

function downloadReceipt(receipt: Receipt) {
  const data = [
    'WASTEOFF MART 캠퍼스점', receipt.number + ' / ' + receipt.time + ' / ' + paymentName[receipt.method],
    ...receipt.lines.map(line => {
      const item = getItem(line.sku)!;
      return item.name + ' × ' + line.quantity + '   ' + won(line.price * line.quantity - line.discount);
    }),
    ...Object.entries(receipt.prepared ?? {}).map(([sku, count]) => '셀프 코너   ' + getItem(sku)?.name + ' × ' + count),
    ...(receipt.bundles ?? []).map(bundle => bundle.name + ' × ' + bundle.count + '   −' + won(bundle.discount)),
    '상품 합계   ' + won(receipt.subtotal), '행사 할인   ' + won(receipt.discount),
    '포인트 사용   ' + points(receipt.usedPoints), '결제 금액   ' + won(receipt.charged),
    ...(receipt.method === 'cash' ? ['받은 금액   ' + won(receipt.tendered), '거스름돈   ' + won(receipt.change)] : []),
    '적립 예정   ' + points(receipt.reward), receipt.refunded ? '결제 취소됨' : '가상 결제 영수증',
  ];
  const url = URL.createObjectURL(new Blob([data.join('\n')], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = receipt.number + '.txt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ReceiptView({ store, receipt, onAction, onShop }: {
  store: Store; receipt: Receipt; onAction: Act; onShop: () => void;
}) {
  const canRefund = canRefundReceipt(store, receipt);
  const prepared = Object.values(receipt.prepared ?? {}).reduce((sum, count) => sum + count, 0);
  return (
    <div className="receipt-layout">
      <section className="receipt-paper" aria-label="영수증">
        <div className="paper-head">
          <ReceiptText size={24} aria-hidden="true" />
          <strong>WASTEOFF MART</strong>
          <span>캠퍼스점 · {receipt.time}</span>
        </div>
        <div className="paper-items">
          {receipt.lines.map(line => <div key={line.sku}>
            <span>{getItem(line.sku)?.name} × {line.quantity}</span><strong>{won(line.price * line.quantity - line.discount)}</strong>
          </div>)}
        </div>
        <dl className="paper-total">
          <div><dt>영수증 번호</dt><dd>{receipt.number}</dd></div>
          <div><dt>결제 방법</dt><dd>{paymentName[receipt.method]}</dd></div>
          {!!prepared && <div><dt>셀프 코너 이용</dt><dd>{prepared}개</dd></div>}
          {receipt.discount > 0 && <div><dt>행사 할인</dt><dd>−{won(receipt.discount)}</dd></div>}
          {receipt.bundles?.map(bundle => <div className="bundle-line" key={bundle.id}><dt>{bundle.name} × {bundle.count}</dt><dd>−{won(bundle.discount)}</dd></div>)}
          {receipt.usedPoints > 0 && <div><dt>포인트 사용</dt><dd>−{points(receipt.usedPoints)}</dd></div>}
          {receipt.method === 'cash' && <><div><dt>받은 금액</dt><dd>{won(receipt.tendered)}</dd></div><div><dt>거스름돈</dt><dd>{won(receipt.change)}</dd></div></>}
          <div className="paper-charged"><dt>결제 금액</dt><dd>{won(receipt.charged)}</dd></div>
        </dl>
      </section>
      <div className="receipt-actions">
        <span className="receipt-confirm">{receipt.refunded ? <CircleAlert size={22} /> : <BadgeCheck size={25} />}
          <strong>{receipt.refunded ? '결제를 취소했어요' : '결제를 마쳤어요'}</strong>
        </span>
        <p>{receipt.refunded ? '예산과 사용 포인트를 복원했어요.' : '결제한 상품을 계산대에서 받아 가세요.'}</p>
        {!!receipt.reward && !receipt.refunded && <p className="reward-copy">다음 날 사용 가능 · +{points(receipt.reward)}</p>}
        <button type="button" className="button button-primary button-wide" onClick={onShop}><ShoppingBasket size={17} /> 장보기 계속</button>
        <button type="button" className="button button-secondary button-wide" onClick={() => downloadReceipt(receipt)}><Download size={17} /> 영수증 저장</button>
        {canRefund && <button type="button" className="text-button" onClick={() => void onAction({ type: 'pos-refund', number: receipt.number })}>결제 승인 취소</button>}
      </div>
    </div>
  );
}

export function PosDialog({ store, signedIn, onAction, onClose, onLogin, onCue }: {
  store: Store;
  signedIn: boolean;
  onAction: Act;
  onClose: () => void;
  onLogin: () => void;
  onCue: (sound: StoreCue) => void;
}) {
  const [method, setMethod] = useState<Payment>('card');
  const [cash, setCash] = useState('');
  const [barcode, setBarcode] = useState('');
  const [feedback, setFeedback] = useState('');
  const [receiptSelection, setReceiptSelection] = useState<string | null>(null);
  const [scanFlash, setScanFlash] = useState({ kind: 'none', sequence: 0 });
  const [paying, setPaying] = useState(false);
  const register = registerState(store);
  const lastReceipt = register.receipts[register.receipts.length - 1];
  const receipt = receiptSelection === 'recent' ? lastReceipt
    : register.receipts.find(previous => previous.number === receiptSelection);
  const hold = pendingOrder(store);
  const totals = registerTotals(store);
  const next = totals.lines.find(line => line.scanned < line.quantity);
  const balance = budgetBalance(store);
  const onHand = pointsBalance(store);
  const tendered = method === 'cash' && cash ? Number(cash) : totals.charged;
  const cashValid = Number.isInteger(tendered) && tendered >= totals.charged && tendered <= balance;
  const allScanned = totals.scanCount === totals.count;
  const canPay = !!totals.count && allScanned && cashValid && !paying;

  async function scan(code: string) {
    if (!signedIn) { onLogin(); return; }
    const found = await onAction({ type: 'pos-scan', barcode: code });
    setScanFlash(previous => ({ kind: found ? 'ok' : 'error', sequence: previous.sequence + 1 }));
    onCue(found ? 'scan' : 'deny');
    setFeedback(found ? '상품을 스캔했어요.' : '장바구니에서 스캔할 수 있는 상품 코드를 확인해 주세요.');
  }

  function submitScan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void scan(barcode);
    setBarcode('');
  }

  async function pay() {
    if (!signedIn) { onLogin(); return; }
    setPaying(true);
    try {
      const paid = await onAction({ type: 'pos-pay', method, tendered });
      if (paid) {
        setReceiptSelection('recent');
        onCue('paid');
      } else {
        setFeedback('스캔 수량과 결제 금액을 확인해 주세요.');
        onCue('deny');
      }
    } finally {
      setPaying(false);
    }
  }

  return (
    <StoreDialog title="계산대" detail="캠퍼스점 · 상품 바코드를 스캔해 주세요" icon={<ScanLine size={21} />} onClose={onClose} wide>
      {receipt ? <>
        <div className="receipt-history">
          <button type="button" className="text-button" onClick={() => setReceiptSelection(null)}><ArrowLeft size={16} /> 계산대로</button>
          <label>거래 내역<select value={receipt.number} onChange={event => setReceiptSelection(event.target.value)}>
            {[...register.receipts].reverse().map(previous => <option key={previous.number} value={previous.number}>
              {previous.number} · {previous.time} · {previous.refunded ? '승인 취소' : won(previous.charged)}
            </option>)}
          </select></label>
        </div>
        <ReceiptView receipt={receipt} store={store} onAction={onAction} onShop={onClose} />
      </> : (
        <>
          {hold && <div className="pos-hold">
            <span>수령 대기 주문 <strong>{hold.number}</strong></span>
            <button type="button" className="button button-secondary" onClick={() => void onAction({ type: 'cancel' })}>주문 취소</button>
            <button type="button" className="button button-primary" onClick={() => void onAction({ type: 'pickup' })}>상품 수령</button>
          </div>}
          <div className="pos-grid">
            <section className="pos-scan" aria-label="바코드 스캔">
              <div className="terminal-display">
                <span className={'scan-flash scan-flash--' + scanFlash.kind} key={scanFlash.sequence} aria-hidden="true" />
                <div><span className="terminal-dot" /> BARCODE SCANNER</div>
                <strong>{totals.scanCount}<span>/{totals.count}</span></strong>
                <small>{totals.count ? allScanned ? '스캔 완료' : '스캔 대기' : '장바구니가 비어 있어요'}</small>
              </div>
              <form className="scan-form" onSubmit={submitScan}>
                <label className="sr-only" htmlFor="item-barcode">상품 바코드</label>
                <input id="item-barcode" inputMode="numeric" pattern="[0-9]{13}" maxLength={13} value={barcode}
                  placeholder="바코드 13자리" onChange={event => setBarcode(event.target.value)} />
                <button type="submit" className="button button-secondary" disabled={barcode.length !== 13}>등록</button>
              </form>
              <div className="pos-lines">
                {totals.lines.map(({ item, scanned, quantity }) => (
                  <div className="pos-line" key={item.sku}>
                    <Packaging item={item} /><span><strong>{item.name}</strong><small>{item.barcode}</small></span>
                    <button type="button" className="scan-single" disabled={scanned >= quantity}
                      aria-label={item.name + ' 스캔'} onClick={() => void scan(item.barcode)}>
                      {scanned >= quantity ? <Check size={15} /> : <ScanLine size={15} />} {scanned}/{quantity}
                    </button>
                  </div>
                ))}
              </div>
              <div className="pos-inline-actions">
                {next && <button type="button" className="button button-secondary" onClick={() => void scan(next.item.barcode)}>
                  <Barcode size={17} /> 다음 상품 스캔
                </button>}
                {totals.scanCount > 0 && <button type="button" className="text-button" onClick={() => { void onAction({ type: 'pos-clear' }); setFeedback('스캔 내역을 지웠어요.'); }}>스캔 초기화</button>}
                {lastReceipt && <button type="button" className="text-button" onClick={() => setReceiptSelection('recent')}>최근 영수증</button>}
              </div>
              <p className="scan-message" role="status">{feedback}</p>
            </section>
            <section className="pos-pay" aria-label="결제">
              <h3>결제 금액</h3>
              <dl className="pos-amount">
                <div><dt>상품 합계</dt><dd>{won(totals.subtotal)}</dd></div>
                <div><dt>행사 할인</dt><dd>{totals.discount ? '−' : ''}{won(totals.discount)}</dd></div>
                {totals.bundles.map(bundle => <div className="bundle-line" key={bundle.id}><dt>{bundle.name} × {bundle.count}</dt><dd>−{won(bundle.discount)}</dd></div>)}
                {totals.rescueSubtotal > 0 && onHand > 0 && <div>
                  <dt><button type="button" className="points-switch" role="switch" aria-checked={register.usePoints}
                    onClick={() => void onAction({ type: 'pos-points', use: !register.usePoints })}>{points(onHand)} 사용</button></dt>
                  <dd>−{won(totals.usedPoints)}</dd>
                </div>}
                <div className="pos-total"><dt>결제할 금액</dt><dd>{won(totals.charged)}</dd></div>
              </dl>
              <div className="tender-group" role="group" aria-label="결제 방법">
                <button type="button" aria-pressed={method === 'card'} onClick={() => setMethod('card')}><CreditCard size={17} /> 카드</button>
                <button type="button" aria-pressed={method === 'cash'} onClick={() => setMethod('cash')}><Wallet size={17} /> 현금</button>
              </div>
              {method === 'cash' && <label className="cash-label">받은 금액
                <input type="number" inputMode="numeric" min={0} max={balance} value={cash}
                  placeholder={String(totals.charged)} onChange={event => setCash(event.target.value)} />
                <small>거스름돈 {won(Math.max(0, tendered - totals.charged))}</small>
              </label>}
              {totals.charged > balance && <p className="pos-warning" role="status">남은 예산보다 {won(totals.charged - balance)} 많아요.</p>}
              {totals.charged <= balance && method === 'cash' && !cashValid && <p className="pos-warning">받은 금액을 결제액과 예산 사이로 입력해 주세요.</p>}
            </section>
          </div>
          <div className="pos-footer">
            <div><small>{totals.count > 0 ? `스캔 ${totals.scanCount}/${totals.count}` : '결제 예정'}</small><strong>{won(totals.charged)}</strong></div>
            <button type="button" className="button button-primary" disabled={signedIn && !canPay}
              onClick={() => void pay()}>{signedIn ? '가상 결제하기' : '로그인하고 장보기'}</button>
          </div>
        </>
      )}
    </StoreDialog>
  );
}

const serviceControls = {
  microwave: { title: '전자레인지', Icon: Microwave },
  'hot-water': { title: '온수', Icon: Droplets },
  coffee: { title: '커피', Icon: Coffee },
};
const serviceMethods = Object.keys(preparations) as Preparation[];

export function ServiceDialog({ store, onAction, onClose }: {
  store: Store;
  onAction: Act;
  onClose: () => void;
}) {
  const station = registerState(store).preparation;
  const eligible = eligiblePreparations(store);
  const [choice, setChoice] = useState('');
  const [machineChoice, setMachineChoice] = useState<Preparation>();
  const [time, setTime] = useState(Date.now);
  const [message, setMessage] = useState('');
  const wasRunning = useRef(false);
  const runningItem = station ? getItem(station.sku) : undefined;
  const method = runningItem?.preparation ?? machineChoice ?? eligible[0]?.method ?? 'microwave';
  const options = eligible.filter(option => option.method === method);
  const selected = options.find(option => option.receipt + ':' + option.item.sku === choice) ?? options[0];
  const machine = preparations[method];
  const { Icon: Machine } = serviceControls[method];
  const seconds = station ? Math.max(0, Math.ceil((station.ends - time) / 1000)) : 0;
  const progress = station ? Math.min(1, Math.max(0, (time - station.started) / (station.ends - station.started))) : 0;

  useEffect(() => {
    if (!station) {
      if (wasRunning.current) setMessage('준비가 끝났어요. 상품을 가져가세요.');
      wasRunning.current = false;
      return;
    }
    wasRunning.current = true;
    setTime(Date.now());
    const timer = window.setInterval(() => setTime(Date.now()), 120);
    return () => window.clearInterval(timer);
  }, [station?.started, station?.ends]);

  async function start() {
    if (!selected || station) return;
    setMessage('');
    const started = await onAction({ type: 'service-start', receipt: selected.receipt, sku: selected.item.sku, now: Date.now() });
    if (!started) setMessage('이미 이용 중이거나 선택한 상품을 처리할 수 없어요.');
  }

  return (
    <StoreDialog title="셀프 코너" detail="결제한 간편식, 컵라면과 원두커피를 준비하세요." icon={<Machine size={22} />} onClose={onClose}>
      <div className="service-content">
        <div className="service-switcher" role="group" aria-label="셀프 코너 기기">
          {serviceMethods.map(id => {
            const { title, Icon } = serviceControls[id];
            return <button className="button button-secondary" type="button" key={id} aria-pressed={method === id} disabled={!!station}
              onClick={() => { setMachineChoice(id); setChoice(''); setMessage(''); }}><Icon size={16} /> {title}</button>;
          })}
        </div>
        <div className="service-machine">
          <span><Machine size={24} /> {machine.label}</span>
          <strong>{station ? '00:' + String(seconds).padStart(2, '0') : '대기'}</strong>
          <div className="service-track" aria-hidden="true"><span style={{ width: progress * 100 + '%' }} /></div>
          {station && <small>{runningItem?.name} 준비 중</small>}
        </div>
        {station ? <p className="service-copy">창을 닫아도 준비가 계속돼요.</p> : selected ? (
          <>
            <label className="service-choice">준비할 상품
              <select value={selected.receipt + ':' + selected.item.sku} onChange={event => setChoice(event.target.value)}>
                {options.map(option => <option key={option.receipt + option.item.sku} value={option.receipt + ':' + option.item.sku}>
                  {option.item.name} · {option.remaining}개 · {option.receipt}
                </option>)}
              </select>
            </label>
            <button className="button button-primary button-wide" type="button" onClick={() => void start()}>
              <Machine size={17} /> {machine.action}
            </button>
          </>
        ) : <p className="service-copy">이 기기에서 준비할 수 있는 구매 상품이 없어요.</p>}
        {message && <p className="service-status" role="status">{message}</p>}
      </div>
    </StoreDialog>
  );
}
