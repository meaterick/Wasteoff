import { useCallback, useEffect, useRef, useState } from 'react';

export type StoreCue = 'step' | 'door' | 'scan' | 'deny' | 'paid' | 'bag' | 'ready';
type Engine = { context: AudioContext; noise: AudioBuffer; output: GainNode };

function soundEngine(): Engine {
  const context = new AudioContext();
  const output = context.createGain();
  output.gain.value = .23;
  output.connect(context.destination);
  const noise = context.createBuffer(1, Math.round(context.sampleRate * .26), context.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  return { context, noise, output };
}

function tone(engine: Engine, from: number, to: number, seconds: number, volume: number, delay = 0) {
  const { context, output } = engine;
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(from, start);
  oscillator.frequency.exponentialRampToValueAtTime(to, start + seconds);
  gain.gain.setValueAtTime(.001, start);
  gain.gain.linearRampToValueAtTime(volume, start + .009);
  gain.gain.exponentialRampToValueAtTime(.001, start + seconds);
  oscillator.connect(gain).connect(output);
  oscillator.start(start);
  oscillator.stop(start + seconds + .01);
}

function texture(engine: Engine, cutoff: number, duration: number, volume: number) {
  const { context, noise, output } = engine;
  const src = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const now = context.currentTime;
  src.buffer = noise;
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  gain.gain.setValueAtTime(.001, now);
  gain.gain.linearRampToValueAtTime(volume, now + .014);
  gain.gain.exponentialRampToValueAtTime(.001, now + duration);
  src.connect(filter).connect(gain).connect(output);
  src.start(now, Math.random() * .045, duration);
}

export function useStoreSound() {
  const audio = useRef<Engine>();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => () => {
    const engine = audio.current;
    audio.current = undefined;
    if (engine) void engine.context.close().catch(() => undefined);
  }, []);

  const toggle = async () => {
    if (enabled) {
      setEnabled(false);
      if (audio.current) await audio.current.context.suspend().catch(() => undefined);
      return;
    }
    try {
      const engine = audio.current ??= soundEngine();
      await engine.context.resume();
      setEnabled(engine.context.state === 'running');
      if (engine.context.state === 'running') tone(engine, 490, 610, .10, .2);
    } catch {
      setEnabled(false);
    }
  };

  const play = useCallback((cue: StoreCue) => {
    const engine = audio.current;
    if (!enabled || !engine || engine.context.state !== 'running') return;
    switch (cue) {
      case 'step':
        texture(engine, 380 + Math.random() * 320, .108, .088);
        break;
      case 'door':
        texture(engine, 520, .23, .07);
        tone(engine, 610, 490, .14, .04);
        break;
      case 'scan':
        tone(engine, 1450, 1320, .065, .18);
        break;
      case 'deny':
        tone(engine, 295, 225, .135, .12);
        break;
      case 'paid':
      case 'ready':
        tone(engine, 523, 587, .14, .12);
        tone(engine, 659, 786, .16, .10, .10);
        break;
      case 'bag':
        texture(engine, 1500, .11, .13);
        break;
    }
  }, [enabled]);

  return { enabled, toggle, play };
}
