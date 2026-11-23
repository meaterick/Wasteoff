import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, BarChart3, Box, Check, ChevronDown, Clock3, Leaf, LogIn, LogOut, ShoppingBasket, Store as StoreIcon, Wallet,
} from 'lucide-react';
import { Checkout } from './Checkout';
import { Results } from './Results';
import { ProductDialog, ShopItems } from './ShopItems';
import { SignInDialog } from './SignInDialog';
import { applyParticipantAction, restoreSignIn, signOut, type SignIn } from './participants';
import {
  budgetBalance, cartSummary, closingStep, closingTime, getProduct, newStore, offerStock,
  openingBudget, pendingOrder, scenarios, times, won,
  type Action, type ProductId, type ScenarioId,
} from './model';

const StoreScene = lazy(() => import('./StoreScene'));
const guestStore = newStore('typical');

export default function App() {
  const [account, setAccount] = useState<SignIn>();
  const [restoring, setRestoring] = useState(true);
  const [view, setView] = useState<'shop' | 'results'>('shop');
  const [selected, setSelected] = useState<ProductId>();
  const [auth, setAuth] = useState<'create' | 'signIn'>();
  const [notice, setNotice] = useState('');
  const noticeTimer = useRef<number>();
  const actions = useRef(Promise.resolve());
  const leaving = useRef(false);
  const cart = useRef<HTMLElement>(null);

  const store = account?.store ?? guestStore;
  const closed = store.step === closingStep;
  const order = pendingOrder(store);
  const cartCount = cartSummary(store).count;
  const stock = useMemo(() => offerStock(store), [store]);

  useEffect(() => {
    let mounted = true;
    async function resume() {
      try {
        const restored = await restoreSignIn();
        if (mounted) setAccount(restored);
      } catch {
        if (mounted) setNotice('브라우저의 참가 기록을 불러오지 못했어요.');
      } finally {
        if (mounted) setRestoring(false);
      }
    }
    void resume();
    window.addEventListener('focus', resume);
    return () => {
      mounted = false;
      window.removeEventListener('focus', resume);
      window.clearTimeout(noticeTimer.current);
    };
  }, []);

  function announce(message: string) {
    setNotice(message);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(''), 3000);
  }

  function dispatch(action: Action) {
    if (!account || leaving.current) return;
    actions.current = actions.current.then(async () => {
      try {
        const result = await applyParticipantAction(action);
        setAccount(result?.account);
        if (!result) {
          announce('다시 로그인해 주세요.');
          setAuth('signIn');
        } else if (action.type === 'add' && result.changed) {
          announce(getProduct(action.id).name + '을(를) 담았어요.');
        } else if (action.type === 'checkout' && !result.changed) {
          announce('잔액과 담은 수량을 확인해 주세요.');
        }
      } catch {
        announce('변경 내용을 저장하지 못했어요. 다시 시도해 주세요.');
      }
    });
  }

  async function exit() {
    if (leaving.current) return;
    leaving.current = true;
    try {
      await actions.current;
      await signOut();
      setAccount(undefined);
      setView('shop');
      announce('로그아웃했어요.');
    } catch {
      setAccount(undefined);
      announce('브라우저의 로그인 상태를 정리하지 못했어요.');
    } finally {
      leaving.current = false;
    }
  }

  function navigate(next: typeof view) {
    if (next === view) return;
    setView(next);
    setSelected(undefined);
    window.scrollTo({ top: 0 });
  }

  function showCart() {
    cart.current?.scrollIntoView({ block: 'nearest' });
    cart.current?.focus({ preventScroll: true });
  }

  function add(id: ProductId) {
    if (!account) {
      setSelected(undefined);
      setAuth('create');
    } else {
      dispatch({ type: 'add', id });
    }
  }

  const resultView = view === 'results';

  return (
    <>
      <a href="#main" className="skip-link">본문으로 건너뛰기</a>
      <header className="header">
        <div className="shell header-inner">
          <button type="button" className="brand" aria-label="Wasteoff 매장 체험" onClick={() => navigate('shop')}>
            <span className="brand-icon"><Leaf size={20} strokeWidth={2.2} aria-hidden="true" /></span>
            <span>Wasteoff<span className="brand-period">.</span></span>
          </button>
          <nav className="view-nav" aria-label="실험 화면">
            <button type="button" aria-current={resultView ? undefined : 'page'} onClick={() => navigate('shop')}>
              <StoreIcon size={17} aria-hidden="true" /> 매장 체험
            </button>
            <button type="button" aria-current={resultView ? 'page' : undefined} onClick={() => navigate('results')}>
              <BarChart3 size={17} aria-hidden="true" /> 효과 비교
            </button>
          </nav>
          <div className="header-actions">
            {!resultView && <button type="button" className="header-cart icon-button" aria-label={`장바구니 보기 (${cartCount}개)`} onClick={showCart}>
              <ShoppingBasket size={19} aria-hidden="true" />
              {cartCount > 0 && <span className="basket-badge">{cartCount}</span>}
            </button>}
            {account ? (
              <div className="account-menu">
                <span className="account-name">{account.name}</span>
                <button type="button" className="icon-button" title="로그아웃" aria-label="로그아웃" onClick={() => void exit()}><LogOut size={17} /></button>
              </div>
            ) : (
              <button type="button" className="button button-secondary header-login" disabled={restoring} onClick={() => setAuth('signIn')}>
                <LogIn size={16} aria-hidden="true" /> 로그인
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="shell main" id="main">
        <div className="intro">
          <div className="intro-copy">
            <p className="eyebrow"><span /> WASTEOFF STORE LAB</p>
            <h1>{resultView ? '마감 판매의 효과' : '마감 한 시간 전'}<span>.</span></h1>
            <p>{resultView
              ? '같은 재고와 손님 수요로 일반 판매와 Wasteoff의 마감 결과를 비교해요.'
              : '3D 편의점을 둘러보고, 한정된 예산으로 오늘 남을 상품을 골라보세요.'}</p>
          </div>
          <div className="run-tools">
            <div className="balance-card">
              <span className="balance-icon"><Wallet size={19} aria-hidden="true" /></span>
              <div><span>{account ? '남은 가상 예산' : '참가자 시작 예산'}</span><strong>{won(account ? budgetBalance(store) : openingBudget)}</strong></div>
            </div>
            {!resultView && (
              <div className="time-card">
                <Clock3 size={19} aria-hidden="true" />
                <div><span>매장 시각</span><strong>{times[store.step]}</strong></div>
                {closed ? <span className="closed-label">마감</span> : (
                  <button className="advance" type="button" onClick={() => account ? dispatch({ type: 'advance' }) : setAuth('create')}>
                    {store.step === closingStep - 1 ? '마감하기' : '15분 진행'} <ArrowRight size={14} aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {resultView ? (
          <Results store={store} participant={account?.name} onShop={() => navigate('shop')}
            onClose={() => dispatch({ type: 'close' })} onReset={() => dispatch({ type: 'reset', scenario: store.scenario })} />
        ) : (
          <div className="shop-layout">
            <section className="market-stage" aria-label="3D 편의점">
              <div className="stage-top">
                <span className="stage-label"><Box size={16} aria-hidden="true" /> 3D 편의점</span>
                <span className={'stage-status' + (closed ? ' stage-status--closed' : '')}>
                  <span className="status-dot" /> {closed ? '판매 종료' : closingTime + ' 픽업 마감'}
                </span>
              </div>
              <Suspense fallback={<div className="scene-message" role="status"><StoreIcon size={30} /><strong>매장을 준비하고 있어요</strong></div>}>
                <StoreScene stock={stock} waitingForPickup={Boolean(order)}
                  onSelect={target => { if (target === 'register') showCart(); else setSelected(target); }} />
              </Suspense>
            </section>

            <div className="shop-side">
              <Checkout store={store} stock={stock} host={cart} dispatch={dispatch} onAdd={add}
                onResults={() => navigate('results')} signedIn={Boolean(account)} onLogin={() => setAuth('create')} />
              <div className="scenario-control">
                <label htmlFor="scenario">일반 손님 수요</label>
                <div className="select-shell">
                  <select id="scenario" value={store.scenario} disabled={!account || closed || store.step !== 0 || store.orders.length > 0 || cartCount > 0}
                    onChange={event => dispatch({ type: 'reset', scenario: event.target.value as ScenarioId })}>
                    {Object.entries(scenarios).map(([id, scenario]) => <option key={id} value={id}>{scenario.name}</option>)}
                  </select>
                  <ChevronDown size={16} aria-hidden="true" />
                </div>
              </div>
            </div>

            <ShopItems store={store} stock={stock} disabled={Boolean(order) || restoring}
              onAdd={add} onSelect={setSelected} />
          </div>
        )}

        <footer className="footer">
          <span><Leaf size={14} aria-hidden="true" /> Wasteoff</span>
          <span>실험용 상품과 가상 예산을 사용합니다.</span>
        </footer>
      </main>

      {selected && <ProductDialog product={getProduct(selected)} store={store}
        onClose={() => setSelected(undefined)} onAdd={add} />}
      {auth && <SignInDialog create={auth === 'create'} onClose={() => setAuth(undefined)}
        onSignIn={signedIn => { setAccount(signedIn); setAuth(undefined); announce(signedIn.name + '님으로 입장했어요.'); }} />}
      <div className={'notice' + (notice ? ' notice--shown' : '')} role="status">
        {notice && <><Check size={16} aria-hidden="true" />{notice}</>}
      </div>
    </>
  );
}
