import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, ArrowUpRight, BarChart3, BottleWine, ChevronRight, Clock3, DoorOpen, Flame, Leaf, LogIn, LogOut,
  Microwave, Minus, Package, ScanLine, ShoppingBasket, Snowflake, Store as StoreIcon, Wallet,
} from 'lucide-react';
import { departments, getItem, items, type Department, type Destination, type Item } from './catalog';
import {
  budgetBalance, canRestart, closingStep, newStore, pendingOrder, registerState, registerTotals, scenarios, shelfStock, times, won,
  type Action, type ScenarioId,
} from './model';
import { applyParticipantAction, restoreSignIn, signOut, type SignIn } from './participants';
import { Results } from './Results';
import { SignInDialog } from './SignInDialog';
import { ItemDialog, Packaging, PosDialog, ServiceDialog, ShelfDialog } from './StoreDialogs';
import { useStoreSound } from './storeSound';
import type { Navigation } from './WalkStage';
import type { CameraMode } from './market/view';
import type { Target } from './market/world';

const WalkStage = lazy(() => import('./WalkStage'));
const guest = newStore('typical');
const departmentIcon = { fresh: Snowflake, rescue: Leaf, snacks: Package, noodles: Flame, drinks: BottleWine, freezer: Snowflake };

type Panel = { kind: 'shelf'; department: Department } | { kind: 'item'; item: Item } | { kind: 'pos' } | { kind: 'service' };

export default function App() {
  const [account, setAccount] = useState<SignIn>();
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<'shop' | 'results'>('shop');
  const [mode, setMode] = useState<CameraMode>('first');
  const [panel, setPanel] = useState<Panel>();
  const [auth, setAuth] = useState<'create' | 'signIn'>();
  const [navigation, setNavigation] = useState<Navigation>();
  const [notice, setNotice] = useState('');
  const notices = useRef<number>();
  const operations = useRef<Promise<unknown>>(Promise.resolve());
  const leaving = useRef(false);
  const stage = useRef<HTMLElement>(null);
  const sound = useStoreSound();
  const store = account?.store ?? guest;
  const { basket, preparation: cooking } = useMemo(() => registerState(store), [store]);
  const totals = registerTotals(store);
  const clock = times[store.step];
  const inventory = useMemo(() => Object.fromEntries(
    items.map(item => [item.sku, Math.max(0, shelfStock(store, item) - (basket[item.sku] ?? 0))]),
  ), [store, basket]);

  useEffect(() => {
    let active = true;
    async function resume() {
      try {
        const restored = await restoreSignIn();
        if (active) setAccount(restored);
      } catch {
        if (active) setNotice('참가 기록을 불러오지 못했어요.');
      } finally {
        if (active) setReady(true);
      }
    }
    void resume();
    window.addEventListener('focus', resume);
    return () => {
      active = false;
      window.removeEventListener('focus', resume);
      window.clearTimeout(notices.current);
    };
  }, []);

  function notify(message: string) {
    setNotice(message);
    window.clearTimeout(notices.current);
    notices.current = window.setTimeout(() => setNotice(''), 2700);
  }

  function act(action: Action) {
    if (!account || leaving.current) {
      if (ready && !leaving.current) setAuth('create');
      return Promise.resolve(false);
    }
    const operation = operations.current.then(async () => {
      try {
        const result = await applyParticipantAction(action);
        setAccount(result?.account);
        if (!result) {
          setAuth('signIn');
          return false;
        }
        if (result.changed && action.type === 'basket-add') {
          notify(getItem(action.sku)?.name + '을(를) 담았어요.');
          sound.play('bag');
        } else if (result.changed && action.type === 'service-finish') {
          notify('셀프 코너에서 상품 준비를 마쳤어요.');
          sound.play('ready');
        }
        return result.changed;
      } catch {
        notify('변경을 저장하지 못했어요. 다시 시도해 주세요.');
        return false;
      }
    });
    operations.current = operation;
    return operation;
  }

  useEffect(() => {
    if (!account || !cooking) return;
    const timer = window.setTimeout(() => void act({ type: 'service-finish', now: Date.now() }),
      Math.max(0, cooking.ends - Date.now()) + 25);
    return () => window.clearTimeout(timer);
  }, [account?.id, cooking?.started, cooking?.ends, sound.play]);

  async function exit() {
    if (leaving.current) return;
    leaving.current = true;
    try {
      await operations.current;
      await signOut();
      setAccount(undefined);
      setPanel(undefined);
      notify('로그아웃했어요.');
    } catch {
      setAccount(undefined);
      notify('로그아웃 상태를 저장하지 못했어요.');
    } finally {
      leaving.current = false;
    }
  }

  function navigate(next: typeof view) {
    setView(next);
    setPanel(undefined);
    window.scrollTo({ top: 0 });
  }

  function go(destination: Destination) {
    setNavigation(previous => ({ destination, sequence: (previous?.sequence ?? 0) + 1 }));
  }

  function visit(destination: Destination) {
    go(destination);
    if (destination === 'register') setPanel({ kind: 'pos' });
    else if (destination === 'service') setPanel({ kind: 'service' });
    else if (destination !== 'entrance') setPanel({ kind: 'shelf', department: destination });
  }

  const inspect = useCallback((target: Target) => {
    if (target.type === 'item') {
      const item = getItem(target.sku);
      if (item) setPanel({ kind: 'item', item });
    } else if (target.id === 'register') {
      setPanel({ kind: 'pos' });
    } else if (target.id === 'service') {
      setPanel({ kind: 'service' });
    } else if (target.id !== 'entrance') {
      setPanel({ kind: 'shelf', department: target.id });
    }
  }, []);

  function closePanel() {
    setPanel(undefined);
    requestAnimationFrame(() => stage.current?.querySelector('canvas')?.focus({ preventScroll: true }));
  }

  const add = (item: Item) => { void act({ type: 'basket-add', sku: item.sku }); };
  const showShop = view === 'shop';

  return (
    <>
      <a href="#main" className="skip-link">본문으로 건너뛰기</a>
      <header className="masthead">
        <div className="shell masthead-inner">
          <button type="button" className="wordmark" onClick={() => navigate('shop')} aria-label="Wasteoff 매장으로">
            <span className="logo-tile"><Leaf size={21} strokeWidth={2.3} aria-hidden="true" /></span><span>Wasteoff<span>.</span></span>
          </button>
          <nav className="nav-mode" aria-label="실험 화면">
            <button type="button" aria-current={showShop ? 'page' : undefined} onClick={() => navigate('shop')}><StoreIcon size={17} /> 매장 체험</button>
            <button type="button" aria-current={!showShop ? 'page' : undefined} onClick={() => navigate('results')}><BarChart3 size={17} /> 운영·비교</button>
          </nav>
          <div className="masthead-account">
            {account ? (
              <><span className="participant-name">{account.name}</span>
                <button type="button" className="icon-button" title="로그아웃" aria-label="로그아웃" onClick={() => void exit()}><LogOut size={17} /></button></>
            ) : <button className="button button-secondary" type="button" disabled={!ready} onClick={() => setAuth('signIn')}><LogIn size={16} /> 로그인</button>}
          </div>
        </div>
      </header>

      <main className="shell main" id="main">
        <div className="page-head">
          <div>
            <h1>{showShop ? '편의점 체험' : '매장 운영과 마감 효과'}</h1>
            <p>{showShop ? '진열대를 둘러보고, 상품을 골라 계산대에서 결제하세요.' : '마감 간편식의 재고와 일반 판매 대비 효과를 확인하세요.'}</p>
          </div>
          <div className="status-cards">
            <div className="status-capsule"><Clock3 size={18} /><span>매장 시각<strong>{clock}</strong></span></div>
            <div className="status-capsule status-capsule--balance"><Wallet size={19} /><span>{account ? '남은 예산' : '가상 시작 예산'}<strong>{won(budgetBalance(store))}</strong></span></div>
          </div>
        </div>

        <div className="store-layout" hidden={!showShop}>
          <section className="viewport" aria-label="3D 편의점" ref={stage}>
            <Suspense fallback={<div className="walk-stage scene-unavailable" role="status"><StoreIcon size={26} /> 매장에 입장하는 중…</div>}>
              <WalkStage mode={mode} onMode={setMode} onInspect={inspect} inventory={inventory}
                basket={basket} clock={clock} paused={!showShop || !!panel || !!auth} navigation={navigation}
                sound={sound.enabled} onSound={() => void sound.toggle()} onCue={sound.play}
                scanned={totals.scanCount} count={totals.count} charge={totals.charged} />
            </Suspense>
          </section>

          <aside className="store-rail" aria-label="매장 안내와 장바구니">
            <section className="rail-section" aria-labelledby="guide-heading">
              <div className="rail-title"><h2 id="guide-heading">매장 안내</h2>
                <button type="button" className="icon-button entry-button" title="입구로 이동" aria-label="입구로 이동" onClick={() => visit('entrance')}><DoorOpen size={16} /></button>
              </div>
              <div className="map-buttons">
                {departments.map(({ id, name }) => {
                  const Icon = departmentIcon[id];
                  return <button type="button" key={id} className={id === 'rescue' ? 'map-rescue' : ''} onClick={() => visit(id)}>
                    <Icon size={16} aria-hidden="true" />{name}<ChevronRight size={14} aria-hidden="true" />
                  </button>;
                })}
              </div>
              <button type="button" className="service-shortcut" onClick={() => visit('service')}>
                <Microwave size={17} aria-hidden="true" /><span>셀프 코너</span><small>{cooking ? '준비 중' : '전자레인지 · 온수'}</small><ChevronRight size={15} aria-hidden="true" />
              </button>
            </section>
            <section className="rail-section basket-panel" aria-labelledby="basket-heading">
              <div className="rail-title"><ShoppingBasket size={18} aria-hidden="true" /><h2 id="basket-heading">장바구니</h2><span className="count-badge">{totals.count}</span></div>
              {totals.count === 0 ? (
                <div className="basket-empty"><span className="basket-glyph"><ShoppingBasket size={23} strokeWidth={1.65} /></span>
                  <strong>장바구니가 비어 있어요</strong>
                  <span>매장에서 상품을 골라 담아보세요.</span>
                </div>
              ) : (
                <ul className="rail-basket">
                  {totals.lines.map(({ item, quantity }) => <li key={item.sku}>
                    <Packaging item={item} /><span><strong>{item.name}</strong><small>{won(item.price)} × {quantity}</small></span>
                    <button type="button" className="icon-button" aria-label={item.name + ' 장바구니에서 1개 빼기'}
                      onClick={() => void act({ type: 'basket-remove', sku: item.sku })}><Minus size={15} /></button>
                  </li>)}
                </ul>
              )}
              {pendingOrder(store) && <p className="held-order">계산대에서 수령할 주문이 있어요.</p>}
              <div className="basket-total"><span>결제 예정</span><strong>{won(totals.charged)}</strong></div>
              <button className="button button-primary button-wide" type="button" onClick={() => visit('register')}>
                <ScanLine size={18} aria-hidden="true" /> 계산대로 이동 <ArrowUpRight size={16} aria-hidden="true" />
              </button>
            </section>
            {!account && <button type="button" className="button button-secondary signup" disabled={!ready} onClick={() => setAuth('create')}>
              참가자 계정 만들기 <ArrowRight size={16} aria-hidden="true" />
            </button>}
          </aside>
        </div>

        {!showShop && (
          <>
            <section className="ops" aria-label="실험 조건">
              <label>일반 손님 수요<select value={store.scenario} disabled={!account || store.step !== 0 || totals.count > 0 || !canRestart(store)}
                onChange={event => void act({ type: 'reset', scenario: event.target.value as ScenarioId })}>
                {Object.entries(scenarios).map(([id, scenario]) => <option value={id} key={id}>{scenario.name}</option>)}
              </select></label>
              <p>23:00에 임박 간편식 판매가 끝납니다. 일반 상품은 계속 구매할 수 있어요.</p>
              {store.step < closingStep && <button className="button button-secondary" type="button" onClick={() => void act({ type: 'advance' })}>
                <Clock3 size={17} /> 15분 진행
              </button>}
            </section>
            <Results store={store} participant={account?.name} onShop={() => navigate('shop')}
              onClose={() => void act({ type: 'close' })} onReset={() => void act({ type: 'reset', scenario: store.scenario })} />
          </>
        )}
        <footer className="footer"><span>WASTEOFF MART</span><span>가상 재고와 예산으로 진행하는 편의점 체험</span></footer>
      </main>

      {panel?.kind === 'shelf' && <ShelfDialog department={panel.department} store={store} onClose={closePanel} onAdd={add}
        onInspect={item => setPanel({ kind: 'item', item })} />}
      {panel?.kind === 'item' && <ItemDialog item={panel.item} store={store} onClose={closePanel} onAdd={add}
        onBack={() => setPanel({ kind: 'shelf', department: panel.item.department })} />}
      {panel?.kind === 'pos' && <PosDialog store={store} onAction={act} signedIn={!!account}
        onClose={closePanel} onLogin={() => setAuth('create')} onCue={sound.play} />}
      {panel?.kind === 'service' && <ServiceDialog store={store} onAction={act} onClose={closePanel} />}
      {auth && <SignInDialog create={auth === 'create'} onClose={() => setAuth(undefined)}
        onSignIn={signedIn => { setAccount(signedIn); setAuth(undefined); notify(signedIn.name + '님으로 입장했어요.'); }} />}
      <span className={'notice' + (notice ? ' notice--shown' : '')} role="status">{notice}</span>
    </>
  );
}
