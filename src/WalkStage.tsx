import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Box, Camera, ChevronRight, Crosshair, Hand, Keyboard, Map,
  Maximize2, Minimize2, Mouse, Search, Settings2, Store as StoreIcon, UserRound, Volume2, VolumeX,
} from 'lucide-react';
import { getItem, type Destination, type Preparation } from './catalog';
import { won } from './model';
import type { StoreCue } from './storeSound';
import { counter, destinations, fixtures, room, service, type Pose } from './market/layout';
import type { RenderMode } from './market/quality';
import { aimLabel, mountWorld, type CameraMode, type Movement, type ViewPreferences } from './market/view';
import type { Target } from './market/world';

export type Navigation = { destination: Destination; sequence: number };
type Props = {
  mode: CameraMode;
  onMode: (mode: CameraMode) => void;
  onInspect: (target: Target) => void;
  inventory: Record<string, number>;
  basket: Record<string, number>;
  clock: string;
  paused: boolean;
  sound: boolean;
  onSound: () => void;
  onCue: (cue: StoreCue) => void;
  scanned: number;
  count: number;
  charge: number;
  preparation?: Preparation;
  onSearch: () => void;
  navigation?: Navigation;
};
const pad = [
  { id: 'forward', label: '앞으로 이동', Icon: ArrowUp },
  { id: 'left', label: '왼쪽으로 이동', Icon: ArrowLeft },
  { id: 'back', label: '뒤로 이동', Icon: ArrowDown },
  { id: 'right', label: '오른쪽으로 이동', Icon: ArrowRight },
] as const;

const controlsPreferenceKey = 'wasteoff-controls';
function loadPreferences(): ViewPreferences {
  const defaults: ViewPreferences = { sensitivity: 1, fov: 62, reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches, graphics: 'auto' };
  try {
    const data = JSON.parse(localStorage.getItem(controlsPreferenceKey) ?? 'null') as Partial<ViewPreferences> | null;
    return {
      sensitivity: typeof data?.sensitivity === 'number' && data.sensitivity >= .45 && data.sensitivity <= 1.8 ? data.sensitivity : defaults.sensitivity,
      fov: typeof data?.fov === 'number' && data.fov >= 54 && data.fov <= 76 ? data.fov : defaults.fov,
      reduceMotion: typeof data?.reduceMotion === 'boolean' ? data.reduceMotion : defaults.reduceMotion,
      graphics: data?.graphics === 'smooth' || data?.graphics === 'detail' ? data.graphics : defaults.graphics,
    };
  } catch {
    return defaults;
  }
}

function Joystick({ paused, onDirection, onStick }: {
  paused: boolean;
  onDirection: (direction: Movement, held: boolean) => void;
  onStick: (x: number, z: number) => void;
}) {
  const active = useRef<number>();
  const knob = useRef<HTMLSpanElement>(null);

  function track(event: PointerEvent<HTMLDivElement>) {
    if (paused || active.current !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const radius = rect.width * .36;
    const x = (event.clientX - rect.left - rect.width / 2) / radius;
    const y = (event.clientY - rect.top - rect.height / 2) / radius;
    const length = Math.max(1, Math.hypot(x, y));
    knob.current?.style.setProperty('--stick-x', x / length * radius * .72 + 'px');
    knob.current?.style.setProperty('--stick-y', y / length * radius * .72 + 'px');
    onStick(x, -y);
  }

  function stop(event: PointerEvent<HTMLDivElement>) {
    if (active.current !== event.pointerId) return;
    active.current = undefined;
    knob.current?.style.setProperty('--stick-x', '0px');
    knob.current?.style.setProperty('--stick-y', '0px');
    onStick(0, 0);
  }

  return (
    <div className="movement-pad" role="group" aria-label="이동 조이스틱"
      onPointerDown={event => {
        if (paused || active.current !== undefined) return;
        event.preventDefault();
        active.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        track(event);
      }}
      onPointerMove={track} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}>
      <span className="stick-knob" ref={knob} aria-hidden="true" />
      {pad.map(({ id, label, Icon }) => (
        <button key={id} type="button" className={'move-' + id} aria-label={label} disabled={paused}
          onKeyDown={event => {
            if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); onDirection(id, true); }
          }}
          onKeyUp={event => {
            if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); onDirection(id, false); }
          }}
          onBlur={() => onDirection(id, false)}>
          <Icon size={15} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

const mapWidth = room.right - room.left;
const mapDepth = room.pavement - room.rear;
const mapPercent = {
  x: (x: number) => (x - room.left) * 100 / mapWidth + '%',
  z: (z: number) => (z - room.rear) * 100 / mapDepth + '%',
};

export default function WalkStage({
  mode, onMode, onInspect, inventory, basket, clock, paused, navigation, sound, onSound, onCue, scanned, count, charge, preparation, onSearch,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const world = useRef<ReturnType<typeof mountWorld>>();
  const mapCursor = useRef<HTMLSpanElement>(null);
  const poseRef = useRef<Pose>(destinations.entrance);
  const inspect = useRef(onInspect);
  const cue = useRef(onCue);
  const toggle = useRef(() => onMode(mode === 'first' ? 'third' : 'first'));
  const [aim, setAim] = useState<Target | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [help, setHelp] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [locked, setLocked] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [preferences, setPreferences] = useState(loadPreferences);

  useEffect(() => { inspect.current = onInspect; }, [onInspect]);
  useEffect(() => { cue.current = onCue; }, [onCue]);
  useEffect(() => { toggle.current = () => onMode(mode === 'first' ? 'third' : 'first'); }, [mode, onMode]);
  useEffect(() => {
    function lost() {
      world.current?.dispose();
      world.current = undefined;
      setFailed(true);
    }
    try {
      world.current = mountWorld({
        canvas: canvas.current!, viewport: viewport.current!, onAim: setAim,
        onInspect: target => inspect.current(target), onMode: () => toggle.current(),
        onReady: () => setReady(true), onLost: lost, onLock: setLocked, onCue: channel => cue.current(channel),
        onPose: pose => {
          poseRef.current = pose;
          const mark = mapCursor.current;
          if (mark) {
            mark.style.left = mapPercent.x(pose.x);
            mark.style.top = mapPercent.z(pose.z);
            mark.style.setProperty('--heading', pose.yaw + 'rad');
          }
        },
      });
    } catch {
      lost();
    }
    return () => {
      world.current?.dispose();
      world.current = undefined;
    };
  }, []);

  useEffect(() => { world.current?.changeCamera(mode); }, [mode]);
  useEffect(() => { world.current?.setInventory(inventory, basket); }, [inventory, basket]);
  useEffect(() => { world.current?.setRegister(scanned, count, charge); }, [scanned, count, charge]);
  useEffect(() => { world.current?.setPreparation(preparation); }, [preparation]);
  useEffect(() => { world.current?.setPaused(paused || help); }, [paused, help]);
  useEffect(() => {
    world.current?.setPreferences(preferences);
    try { localStorage.setItem(controlsPreferenceKey, JSON.stringify(preferences)); } catch { /* Session keeps control choices. */ }
  }, [preferences]);
  useEffect(() => {
    if (navigation) world.current?.go(navigation.destination);
  }, [navigation]);
  useEffect(() => {
    if (!expanded) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; };
  }, [expanded]);
  useEffect(() => {
    if (!expanded || paused || locked || help) return;
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !event.defaultPrevented) setExpanded(false);
    }
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [expanded, paused, locked, help]);
  useEffect(() => { if (failed) setExpanded(false); }, [failed]);

  function focus() {
    canvas.current?.focus({ preventScroll: true });
  }

  const targetName = aimLabel(aim);
  const item = aim?.type === 'item' ? getItem(aim.sku) : undefined;
  const targetStock = item ? inventory[item.sku] ?? 0 : 0;
  const SoundIcon = sound ? Volume2 : VolumeX;
  const ScreenIcon = expanded ? Minimize2 : Maximize2;
  const screenLabel = expanded ? '전체 화면 닫기' : '전체 화면';

  return (
    <div className={'walk-stage' + (expanded ? ' walk-stage--expanded' : '')} ref={viewport}
      data-camera={mode} data-ready={ready} data-graphics={preferences.graphics}>
      <canvas className="walk-canvas" tabIndex={failed ? -1 : 0} ref={canvas} hidden={failed}
        aria-label="3D 매장. WASD로 이동하고 E로 상품이나 계산대를 열어요." />
      <div className="scene-head">
        <div className="scene-location">
          <span className="location-icon"><StoreIcon size={18} aria-hidden="true" /></span>
          <span><strong>캠퍼스점</strong><small><i /> {clock} · 24시간 영업</small></span>
        </div>
        <div className="camera-group" role="group" aria-label="카메라 시점">
          <button type="button" aria-pressed={mode === 'first'} disabled={failed || !ready}
            onClick={() => { onMode('first'); focus(); }}><Camera size={16} /> 1인칭</button>
          <button type="button" aria-pressed={mode === 'third'} disabled={failed || !ready}
            onClick={() => { onMode('third'); focus(); }}><UserRound size={16} /> 3인칭</button>
        </div>
      </div>
      {failed ? (
        <div className="scene-unavailable" role="status">
          <Box size={32} aria-hidden="true" />
          <strong>3D 화면을 열 수 없어요</strong>
          <span>매장 안내에서 진열대를 열어 장보기를 계속할 수 있어요.</span>
        </div>
      ) : (
        <>
          {!ready && <div className="scene-unavailable scene-loading" role="status"><StoreIcon size={27} /> 매장을 준비하고 있어요…</div>}
          <span className={'reticle' + (aim ? ' reticle--active' : '')} aria-hidden="true" />
          {!!targetName && !paused && !help && <button className="aim-action" type="button" onClick={() => world.current?.interact()}>
            <kbd>E</kbd><span><strong>{targetName}</strong>{item && <small>{won(item.price)} · {targetStock ? '재고 ' + targetStock + '개' : '진열 재고 없음'}</small>}</span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>}
          <Joystick paused={paused || help || !ready}
            onDirection={(direction, held) => world.current?.move(direction, held)}
            onStick={(x, z) => world.current?.setJoystick(x, z)} />
          {showMap && <div className="scene-map">
            <strong>매장 지도</strong>
            <div className="scene-map-plan" role="img" aria-label="매장 평면도와 현재 위치">
              <span className="scene-map-doorsill" style={{ top: mapPercent.z(room.front) }} />
              {Object.entries({ ...fixtures, register: counter, service }).map(([id, box]) => (
                <span key={id} className={'map-fixture map-fixture--' + id} style={{
                  left: mapPercent.x(box.x), top: mapPercent.z(box.z),
                  width: box.width / mapWidth * 100 + '%', height: box.depth / mapDepth * 100 + '%',
                }} />
              ))}
              <span ref={mapCursor} className="map-visitor" style={{
                left: mapPercent.x(poseRef.current.x), top: mapPercent.z(poseRef.current.z), '--heading': poseRef.current.yaw + 'rad',
              } as CSSProperties} />
            </div>
          </div>}
          <div className="scene-foot">
            <div className="key-legend"><Keyboard size={17} aria-hidden="true" />
              <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 이동</span><span><kbd>E</kbd> 선택</span>
              {locked && <span><kbd>Esc</kbd> 커서</span>}
            </div>
            <div className="scene-tools">
              <button type="button" className="lock-button" onClick={() => void world.current?.lock()}
                aria-pressed={locked} title="마우스 고정 · Esc로 해제" aria-label="마우스 고정"><Crosshair size={17} /></button>
              <button type="button" aria-pressed={sound} onClick={onSound} title="매장 소리" aria-label="매장 소리"><SoundIcon size={17} /></button>
              <button type="button" aria-expanded={showMap} onClick={() => setShowMap(!showMap)} title="매장 지도" aria-label="매장 지도"><Map size={17} /></button>
              {expanded && <button type="button" onClick={onSearch} title="상품 검색" aria-label="전체 화면에서 상품 검색"><Search size={17} /></button>}
              <button type="button" onClick={() => { setExpanded(!expanded); focus(); }} disabled={!ready}
                aria-pressed={expanded} title={screenLabel} aria-label={screenLabel}><ScreenIcon size={17} /></button>
              <button type="button" aria-expanded={help} onClick={() => setHelp(!help)}><Settings2 size={16} /> 조작</button>
            </div>
          </div>
          {help && <section className="scene-help" aria-label="조작 설정">
            <strong>조작 설정</strong>
            <p><Keyboard size={15} /> WASD·방향키 이동 · Shift 달리기 · E 선택 · V 시점 전환</p>
            <p><Mouse size={15} /> 마우스 드래그 또는 고정으로 둘러보기 · 3인칭에서 Q로 어깨 전환</p>
            <p><Hand size={15} /> 왼손으로 조이스틱을 움직이고, 오른손으로 화면을 밀어 시선을 돌려요.</p>
            <label>시점 감도 <output>{Math.round(preferences.sensitivity * 100)}%</output>
              <input aria-label="시점 감도" type="range" min=".45" max="1.8" step=".05" value={preferences.sensitivity}
                onChange={event => setPreferences({ ...preferences, sensitivity: Number(event.target.value) })} />
            </label>
            <label>시야각 <output>{preferences.fov}°</output>
              <input aria-label="시야각" type="range" min="54" max="76" step="1" value={preferences.fov}
                onChange={event => setPreferences({ ...preferences, fov: Number(event.target.value) })} />
            </label>
            <label className="motion-toggle">카메라 흔들림 줄이기
              <input type="checkbox" checked={preferences.reduceMotion}
                onChange={event => setPreferences({ ...preferences, reduceMotion: event.target.checked })} />
            </label>
            <label className="quality-setting">그래픽 품질
              <select value={preferences.graphics} onChange={event => setPreferences({ ...preferences, graphics: event.target.value as RenderMode })}>
                <option value="auto">자동 조절</option><option value="smooth">부드러운 화면</option><option value="detail">선명한 화면</option>
              </select>
            </label>
            <button type="button" onClick={() => { setHelp(false); focus(); }}>매장으로 돌아가기</button>
          </section>}
        </>
      )}
    </div>
  );
}
