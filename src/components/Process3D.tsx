import { useEffect, useRef, useState } from 'react';
import { processSteps } from '../three/steps';
import type { SceneController } from '../three/scene';
import { Icon } from './ui';

type Status = 'idle' | 'loading' | 'ready' | 'error';

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 3D로 보는 실제 과정: 수요예측부터 포인트 적립까지 */
export function Process3D() {
  const stageRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<SceneController | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(() => !reduceMotion());
  const [inView, setInView] = useState(false);

  // 화면 가까이 오면 three.js를 불러와 장면을 만듭니다.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    let disposed = false;
    const near = new IntersectionObserver(
      async (entries) => {
        if (!entries.some((e) => e.isIntersecting) || ctrlRef.current || disposed) return;
        near.disconnect();
        setStatus('loading');
        try {
          const { createScene } = await import('../three/scene');
          if (disposed) return;
          const ctrl = await createScene(el, { reducedMotion: reduceMotion() });
          if (disposed) {
            ctrl.dispose();
            return;
          }
          ctrlRef.current = ctrl;
          setStatus('ready');
        } catch (err) {
          console.error(err);
          if (!disposed) setStatus('error');
        }
      },
      { rootMargin: '600px 0px' },
    );
    near.observe(el);

    const visible = new IntersectionObserver((entries) => setInView(entries[0]?.isIntersecting ?? false), {
      threshold: 0.35,
    });
    visible.observe(el);

    return () => {
      disposed = true;
      near.disconnect();
      visible.disconnect();
      ctrlRef.current?.dispose();
      ctrlRef.current = null;
    };
  }, []);

  useEffect(() => {
    ctrlRef.current?.setActive(inView);
  }, [inView, status]);

  useEffect(() => {
    ctrlRef.current?.setStep(step);
  }, [step, status]);

  // 자동 재생: 화면에 보일 때만 다음 단계로 넘어갑니다.
  const running = playing && inView && status === 'ready';
  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => setStep((s) => (s + 1) % processSteps.length), processSteps[step].duration);
    return () => window.clearTimeout(id);
  }, [running, step]);

  const go = (i: number) => setStep((i + processSteps.length) % processSteps.length);
  const current = processSteps[step];

  return (
    <div className="process3d">
      <div className="stage3d">
        <div className="stage3d__view" ref={stageRef}>
          {status !== 'ready' && (
            <div className="stage3d__placeholder" role="status">
              {status === 'error'
                ? '이 기기에서는 3D 화면을 표시할 수 없습니다. 단계 설명으로 과정을 확인해 주세요.'
                : '3D 매장을 불러오는 중…'}
            </div>
          )}
          <span className="stage3d__badge">예시 데이터 · 3D 시각화</span>
        </div>

        <div className="stage3d__caption" aria-live="polite">
          <span className="stage3d__step">
            {step + 1}/{processSteps.length} · {current.label}
          </span>
          <strong className="stage3d__headline">{current.headline}</strong>
          <p>{current.desc}</p>
        </div>
      </div>

      <div className="stage3d__controls">
        <div className="stage3d__buttons">
          <button type="button" className="icon-btn" onClick={() => go(step - 1)} aria-label="이전 단계">
            <Icon name="arrow" size={20} />
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--primary"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? '자동 재생 멈춤' : '자동 재생'}
          >
            {playing ? (
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
                <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 5l12 7-12 7z" fill="currentColor" />
              </svg>
            )}
          </button>
          <button type="button" className="icon-btn" onClick={() => go(step + 1)} aria-label="다음 단계">
            <Icon name="arrow" size={20} />
          </button>
        </div>
        <ol className="stage3d__steps">
          {processSteps.map((s, i) => (
            <li key={s.key}>
              <button
                type="button"
                className={`stage3d__chip${i === step ? ' is-current' : ''}${i < step ? ' is-done' : ''}`}
                onClick={() => go(i)}
                aria-current={i === step ? 'step' : undefined}
              >
                <span className="stage3d__chip-num">{i + 1}</span>
                {s.label}
                {i === step && (
                  <span
                    key={`${step}-${running}`}
                    className="stage3d__progress"
                    style={{ animationDuration: `${s.duration}ms`, animationPlayState: running ? 'running' : 'paused' }}
                  />
                )}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
