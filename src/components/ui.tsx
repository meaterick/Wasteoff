import type { ReactNode } from 'react';

/** 모의 화면임을 알리는 표시 */
export function MockBadge({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  return <span className={`mock-badge mock-badge--${tone}`}>화면 예시</span>;
}

/** 휴대폰 프레임 */
export function Phone({ children, label, time }: { children: ReactNode; label: string; time: string }) {
  return (
    <figure className="phone" aria-label={label}>
      <div className="phone__screen">
        <div className="phone__status" aria-hidden="true">
          <span>{time}</span>
          <span className="phone__notch" />
          <span className="phone__icons">
            <i />
            <i />
            <i />
          </span>
        </div>
        <MockBadge />
        {children}
      </div>
    </figure>
  );
}

type IconName = 'qr' | 'check' | 'clock' | 'pin' | 'arrow' | 'chart' | 'unlock' | 'card' | 'bag' | 'gift' | 'down';

const paths: Record<IconName, ReactNode> = {
  qr: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 19v1M19 14h1" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  arrow: <path d="M5 12h13M13 6l6 6-6 6" />,
  down: <path d="M12 5v13M6 13l6 6 6-6" />,
  chart: <path d="M4 19h16M7 16v-5M12 16V6M17 16v-8" />,
  unlock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 016.8-1.2" />
    </>
  ),
  card: (
    <>
      <rect x="3.5" y="6" width="17" height="12" rx="2" />
      <path d="M3.5 10h17M7 14.5h4" />
    </>
  ),
  bag: (
    <>
      <path d="M5.5 8.5h13l-1 11.5h-11z" />
      <path d="M9 8.5V7a3 3 0 016 0v1.5" />
    </>
  ),
  gift: (
    <>
      <rect x="4" y="9" width="16" height="11" rx="1.5" />
      <path d="M12 9v11M4 13h16M12 9c-1.5-3-5-3.5-5-1.5S10 9 12 9zm0 0c1.5-3 5-3.5 5-1.5S14 9 12 9z" />
    </>
  ),
};

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
