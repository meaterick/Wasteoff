import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Box, Camera, ChevronRight, Crosshair, Hand, Keyboard, Mouse, Store as StoreIcon, UserRound,
} from 'lucide-react';
import { departments, type Destination } from './catalog';
import { aimLabel, mountWorld, type CameraMode, type Movement } from './market/view';
import type { Target } from './market/world';

export type Navigation = { destination: Destination; sequence: number };
type Props = {
  mode: CameraMode;
  onMode: (mode: CameraMode) => void;
  onInspect: (target: Target) => void;
  inventory: Record<string, number>;
  carrying: boolean;
  clock: string;
  paused: boolean;
  navigation?: Navigation;
};
const pad = [
  { id: 'forward', label: '앞으로 이동', Icon: ArrowUp },
  { id: 'left', label: '왼쪽으로 이동', Icon: ArrowLeft },
  { id: 'back', label: '뒤로 이동', Icon: ArrowDown },
  { id: 'right', label: '오른쪽으로 이동', Icon: ArrowRight },
] as const;

export default function WalkStage({ mode, onMode, onInspect, inventory, carrying, clock, paused, navigation }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const world = useRef<ReturnType<typeof mountWorld>>();
  const inspect = useRef(onInspect);
  const toggle = useRef(() => onMode(mode === 'first' ? 'third' : 'first'));
  const [aim, setAim] = useState<Target | null>(null);
  const [failed, setFailed] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => { inspect.current = onInspect; }, [onInspect]);
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
        onInspect: target => inspect.current(target), onMode: () => toggle.current(), onLost: lost,
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
  useEffect(() => { world.current?.setInventory(inventory, carrying); }, [inventory, carrying]);
  useEffect(() => { world.current?.setPaused(paused || help); }, [paused, help]);
  useEffect(() => {
    if (navigation) world.current?.go(navigation.destination);
  }, [navigation]);

  const targetName = aimLabel(aim) || (aim?.type === 'area' ? departments.find(zone => zone.id === aim.id)?.name : undefined);
  function press(direction: Movement, held: boolean) {
    world.current?.move(direction, held);
  }

  return (
    <div className="walk-stage" ref={viewport} data-camera={mode}>
      <canvas className="walk-canvas" tabIndex={failed ? -1 : 0} ref={canvas} hidden={failed}
        aria-label="3D 매장. 매장을 선택한 뒤 WASD로 이동하고 E로 상호작용하세요." />
      <div className="scene-head">
        <div className="scene-location">
          <span className="location-icon"><StoreIcon size={18} aria-hidden="true" /></span>
          <span><strong>캠퍼스점</strong><small>{clock} · 24시간 영업</small></span>
        </div>
        <div className="camera-group" role="group" aria-label="카메라 시점">
          <button type="button" aria-pressed={mode === 'first'} disabled={failed}
            onClick={() => { onMode('first'); canvas.current?.focus({ preventScroll: true }); }}><Camera size={16} /> 1인칭</button>
          <button type="button" aria-pressed={mode === 'third'} disabled={failed}
            onClick={() => { onMode('third'); canvas.current?.focus({ preventScroll: true }); }}><UserRound size={16} /> 3인칭</button>
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
          <span className={'reticle' + (aim ? ' reticle--active' : '')} aria-hidden="true" />
          {!!targetName && <button className="aim-action" type="button" onClick={() => world.current?.interact()}>
            <kbd>E</kbd> {targetName} <ChevronRight size={15} aria-hidden="true" />
          </button>}
          <div className="movement-pad" role="group" aria-label="매장 이동">
            {pad.map(({ id, label, Icon }) => (
              <button key={id} type="button" className={'move-' + id} aria-label={label}
                onPointerDown={event => {
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  press(id, true);
                }}
                onPointerUp={() => press(id, false)} onPointerCancel={() => press(id, false)} onLostPointerCapture={() => press(id, false)}
                onKeyDown={event => {
                  if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); press(id, true); }
                }}
                onKeyUp={event => {
                  if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); press(id, false); }
                }}
                onBlur={() => press(id, false)}
              ><Icon size={18} aria-hidden="true" /></button>
            ))}
          </div>
          <div className="scene-foot">
            <div className="key-legend"><Keyboard size={17} aria-hidden="true" /><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 이동</span><span><kbd>E</kbd> 선택</span></div>
            <div className="scene-tools">
              <button type="button" className="lock-button" onClick={() => void world.current?.lock()}
                title="마우스 고정 · Esc로 해제" aria-label="마우스 고정"><Crosshair size={17} /></button>
              <button type="button" aria-expanded={help} onClick={() => setHelp(!help)}><Hand size={15} /> 조작</button>
            </div>
          </div>
          {help && <div className="scene-help">
            <strong>매장 조작</strong>
            <p><Keyboard size={15} /> WASD 또는 방향키로 이동 · E로 선택 · V로 시점 전환</p>
            <p><Mouse size={15} /> 마우스를 드래그하거나 고정해 시선을 옮겨요.</p>
            <p><Hand size={15} /> 터치 화면은 방향 버튼으로 걷고, 화면을 밀어 둘러봐요.</p>
            <button type="button" onClick={() => { setHelp(false); canvas.current?.focus({ preventScroll: true }); }}>매장으로 돌아가기</button>
          </div>}
        </>
      )}
    </div>
  );
}
