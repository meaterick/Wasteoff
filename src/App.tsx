import { useEffect, useState } from 'react';
import dosirak from './assets/dosirak-1440.jpg';
import { PaymentScreen, PickupScreen, ProductScreen } from './components/CustomerScreens';
import { ApprovalList, Equation, ForecastBasis, OwnerMiniPanel, StockBar } from './components/Inventory';
import { Process3D } from './components/Process3D';
import { QrStrip } from './components/QrStrip';
import { Icon, MockBadge, Phone } from './components/ui';
import { finalAmount, flowSteps, inventory, limitedQty, pickup, points, product, pt, store, won } from './data';

const sections = [
  { id: 'process', label: '3D 과정' },
  { id: 'owner', label: '점주 승인' },
  { id: 'customer', label: '고객 화면' },
  { id: 'done', label: '수령 완료' },
] as const;

/** 스크롤 시 [data-reveal] 요소를 부드럽게 등장시키고, 현재 섹션을 추적합니다. */
function useScrollEffects() {
  const [active, setActive] = useState<string>('');

  useEffect(() => {
    const revealTargets = document.querySelectorAll<HTMLElement>('[data-reveal]');
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );
    revealTargets.forEach((el) => revealObserver.observe(el));

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    document.querySelectorAll('section[id]').forEach((el) => sectionObserver.observe(el));

    return () => {
      revealObserver.disconnect();
      sectionObserver.disconnect();
    };
  }, []);

  return active;
}

function Header({ active }: { active: string }) {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <a href="#top" className="brand">
          <span className="brand__mark" aria-hidden="true" />
          Wasteoff
        </a>
        <nav aria-label="섹션 이동">
          <ul className="site-nav">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className={active === s.id ? 'is-active' : undefined}>
                  <span className="site-nav__num">{i + 1}</span>
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="container hero__grid">
        <div className="hero__copy">
          <p className="eyebrow">편의점 수요예측 기반 마감 판매</p>
          <h1 id="hero-title" className="hero__title">
            마감 1시간 전,
            <br />
            <em>남을 상품만</em>
            <br />
            한정 판매
          </h1>
          <p className="hero__lead">
            오늘 남을 도시락을 미리 판매합니다. 수요예측이 남을 상품과 수량을 찾고 점주는 승인만 합니다. 고객은 매장
            QR로 접속해 자체 사이트에서 선결제하고, 주문번호로 픽업한 뒤 포인트를 받습니다.
          </p>
          <div className="hero__actions">
            <a href="#process" className="btn btn--primary">
              판매 흐름 보기 <Icon name="down" size={18} />
            </a>
            <span className="hero__note">
              {store.name} · {product.name} · {store.checkTime} 기준 시연
            </span>
          </div>
        </div>

        <div className="hero__visual">
          <div className="hero__photo">
            <img src={dosirak} alt="편의점 제육 도시락. 밥, 제육볶음, 소시지볶음, 계란말이, 햄, 김치가 칸마다 담겨 있다." width={1440} height={810} />
          </div>
          <div className="hero__screens">
            <div className="hero__screen hero__screen--phone">
              <span className="hero__screen-label">고객용 · 모바일 주문</span>
              <Phone label="고객용 마감 상품 선택 화면 예시" time="22:14">
                <ProductScreen />
              </Phone>
            </div>
            <div className="hero__screen hero__screen--owner">
              <span className="hero__screen-label">점주용 · 재고 화면</span>
              <OwnerMiniPanel />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProcessSection() {
  return (
    <section className="section section--process" id="process" aria-labelledby="process-title">
      <div className="container">
        <div className="section-head" data-reveal>
          <p className="step-tag">한눈에 보기 · 3D</p>
          <h2 id="process-title">3D로 보는 실제 과정</h2>
          <p>
            {store.name}의 마감 1시간을 따라갑니다. 수요예측과 점주 승인, QR 접속과 자체 사이트 결제, 주문번호 픽업과
            포인트 적립까지 이어집니다.
          </p>
        </div>
        <Process3D />
      </div>
    </section>
  );
}

function OwnerSection() {
  return (
    <section className="section section--owner" id="owner" aria-labelledby="owner-title">
      <div className="container">
        <div className="section-head" data-reveal>
          <p className="step-tag">STEP 1 · 점주 화면</p>
          <h2 id="owner-title">오늘 몇 개를 판매에 열까?</h2>
          <p>
            {store.checkTime}, 수요예측이 {store.name}에서 오늘 남을 상품과 수량을 추천합니다. 점주는 계산하지 않고,
            추천된 한정 판매 상품과 수량을 확인해 승인만 합니다.
          </p>
        </div>

        <div className="dashboard" data-reveal>
          <div className="dashboard__top">
            <div className="dashboard__context">
              <span className="pill pill--green">{store.name}</span>
              <span className="pill">
                <Icon name="clock" size={15} /> 지금 {store.checkTime}
              </span>
              <span className="pill">
                {product.name} · {store.saleEnd} 판매 마감
              </span>
            </div>
            <MockBadge />
          </div>

          <ForecastBasis />
          <p className="dashboard__sub">
            수요예측 결과 · {product.name} ({store.saleEnd} 판매 마감)
          </p>
          <Equation />

          <div className="dashboard__bar">
            <p className="dashboard__bar-title">실물 재고 {inventory.onHand}개를 이렇게 나눕니다</p>
            <StockBar />
          </div>

          <div className="dashboard__result">
            <ApprovalList />
            <div className="open-badge" data-reveal>
              <span className="open-badge__icon">
                <Icon name="unlock" size={36} />
              </span>
              <span className="open-badge__text">
                <strong>{limitedQty}개</strong> 판매 공개
              </span>
            </div>

          </div>
        </div>

        <div className="explain" data-reveal>
          <div className="explain__icon">
            <Icon name="chart" size={26} />
          </div>
          <div>
            <h3>판매에 열리는 수량은 매일 다릅니다</h3>
            <p>
              수요예측이 그날의 실물 재고와 예상 수요로 남을 수량을 다시 계산합니다. 정상가로 팔릴 몫과 안전재고는
              남겨 두고 남을 것으로 보이는 수량만 추천합니다. 같은 12개라도 수요예측 판매가 9개인 날은 추천이
              0개입니다. 주문 마감 {product.orderDeadline}, 픽업 마감 {product.pickupDeadline}.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CustomerSection() {
  const screens = [
    { title: '마감 상품 선택', desc: `한정 ${product.limitedQty}개 · ${won(product.price)}`, time: '22:14', el: <ProductScreen /> },
    { title: '웹 선결제', desc: `포인트 ${pt(points.used)} 사용 → ${won(finalAmount)}`, time: '22:16', el: <PaymentScreen /> },
    { title: '픽업 안내', desc: `픽업 번호 ${pickup.number}`, time: '22:17', el: <PickupScreen /> },
  ];
  return (
    <section className="section section--customer" id="customer" aria-labelledby="customer-title">
      <div className="container">
        <div className="section-head" data-reveal>
          <p className="step-tag">STEP 2 · 고객 화면</p>
          <h2 id="customer-title">휴대폰으로 결제하고 주문번호로 픽업</h2>
          <p>매장 QR로 자체 주문 사이트에 접속해 앱 설치 없이 고르고, 결제하고, 받은 번호로 매장에서 찾아갑니다.</p>
        </div>

        <QrStrip />

        <ol className="phone-flow">
          {screens.map((s, i) => (
            <li key={s.title} className="phone-flow__item" data-reveal style={{ transitionDelay: `${i * 120}ms` }}>
              <div className="phone-flow__caption">
                <span className="phone-flow__num">{i + 1}</span>
                <div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </div>
              <Phone label={`${s.title} 화면 예시`} time={s.time}>
                {s.el}
              </Phone>
              {i < screens.length - 1 && (
                <span className="phone-flow__arrow" aria-hidden="true">
                  <Icon name="arrow" size={26} />
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function DoneSection() {
  const flowIcons = ['chart', 'check', 'qr', 'card', 'bag', 'gift'] as const;
  return (
    <section className="section section--done" id="done" aria-labelledby="done-title">
      <div className="container">
        <div className="section-head" data-reveal>
          <p className="step-tag">STEP 3 · 수령 완료</p>
          <h2 id="done-title">고객과 점주에게 보이는 결과</h2>
          <p>직원이 픽업 번호를 확인해 건네면 주문이 끝나고, 남을 상품을 사 준 고객에게 포인트가 쌓입니다.</p>
        </div>

        <div className="result-grid">
          <div className="staff-card" data-reveal>
            <div className="staff-card__head">
              <span>
                <b>직원 화면</b> · {store.name} 픽업 주문
              </span>
              <MockBadge tone="dark" />
            </div>
            <div className="staff-row">
              <span className="staff-row__code">{pickup.number}</span>
              <span className="staff-row__dot" aria-hidden="true">·</span>
              <span className="staff-row__item">
                {product.name} {pickup.quantity}개
              </span>
              <span className="staff-row__dot" aria-hidden="true">·</span>
              <span className="staff-row__status">
                <Icon name="check" size={20} /> 수령 완료
              </span>
            </div>
            <dl className="staff-meta">
              <div>
                <dt>결제</dt>
                <dd>웹 선결제 {won(finalAmount)}</dd>
              </div>
              <div>
                <dt>판매 구분</dt>
                <dd>마감 한정 판매</dd>
              </div>
              <div>
                <dt>픽업 마감</dt>
                <dd>{product.pickupDeadline}</dd>
              </div>
            </dl>
          </div>

          <div className="points-card" data-reveal style={{ transitionDelay: '120ms' }}>
            <div className="points-card__head">
              <span>
                <b>고객 화면</b> · 포인트 내역
              </span>
              <MockBadge />
            </div>
            <ul className="points-list">
              <li>
                <span>이번 주문 {pt(points.used)} 사용</span>
                <strong className="minus">−{pt(points.used)}</strong>
              </li>
              <li>
                <span>수령 후 {pt(points.earned)} 적립</span>
                <strong className="plus">+{pt(points.earned)}</strong>
              </li>
            </ul>
            <div className="points-card__balance">
              <span>현재 잔액</span>
              <strong>{pt(points.balance)}</strong>
            </div>
          </div>
        </div>

        <h3 className="flow-title" data-reveal>
          전체 흐름
        </h3>
        <ol className="flow" aria-label="전체 흐름">
          {flowSteps.map((s, i) => (
            <li key={s.key} className="flow__step" data-reveal style={{ transitionDelay: `${i * 100}ms` }}>
              <span className="flow__icon">
                <Icon name={flowIcons[i]} size={24} />
              </span>
              <strong>{s.label}</strong>
              <span className="flow__desc">{s.desc}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <p>
          이 페이지는 발표용 시연 페이지입니다. 화면에 나오는 주문, 재고, 결제, 포인트는 모두 고정된 예시 데이터이며
          로그인·실제 결제·POS 연동·데이터 저장은 포함하지 않습니다.
        </p>
        <p className="site-footer__credit">
          도시락 사진: JunHyun Cho, CC0 1.0 (Wikimedia Commons “Convenience store dosirak.jpg”)
        </p>
      </div>
    </footer>
  );
}

export default function App() {
  const active = useScrollEffects();
  return (
    <>
      <a className="skip-link" href="#process">
        시연 구간으로 건너뛰기
      </a>
      <Header active={active} />
      <main>
        <Hero />
        <ProcessSection />
        <OwnerSection />
        <CustomerSection />
        <DoneSection />
      </main>
      <Footer />
    </>
  );
}
