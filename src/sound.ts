// Tiny chiptune sound kit, made on the fly with Web Audio (no sound files).
// Buttons get their sound from one listener on the document, picked by class or `data-sound`.

export type SoundName = 'press' | 'chunk' | 'select' | 'pop' | 'on' | 'off' | 'open' | 'close' | 'rewind' | 'poof' | 'coin' | 'powerup' | 'error';

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let noise: AudioBuffer | null = null;
let enabled = true;

export const setSoundOn = (on: boolean) => { enabled = on; };

function audio() {
  if (!enabled) return null;
  if (!ctx) {
    try { ctx = new AudioContext(); } catch { return null; }
    out = ctx.createGain();
    out.gain.value = 0.5;
    // a soft lowpass takes the harsh edge off the square waves
    const soften = ctx.createBiquadFilter();
    soften.type = 'lowpass';
    soften.frequency.value = 5200;
    out.connect(soften).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

interface Tone { type?: OscillatorType; from: number; to?: number; dur: number; vol?: number; at?: number }

function tone({ type = 'square', from, to = from, dur, vol = 0.12, at = 0 }: Tone) {
  const a = audio();
  if (!a || !out) return;
  const t = a.currentTime + at;
  const osc = a.createOscillator();
  const env = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(vol, t + 0.004);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function hiss(dur: number, from: number, to: number, vol = 0.1) {
  const a = audio();
  if (!a || !out) return;
  if (!noise) {
    noise = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = a.currentTime;
  const src = a.createBufferSource();
  const band = a.createBiquadFilter();
  const env = a.createGain();
  src.buffer = noise;
  band.type = 'bandpass';
  band.Q.value = 1.2;
  band.frequency.setValueAtTime(from, t);
  band.frequency.exponentialRampToValueAtTime(to, t + dur);
  env.gain.setValueAtTime(vol, t);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(band).connect(env).connect(out);
  src.start(t);
  src.stop(t + dur);
}

// C major pentatonic from C5, so runs of drops and ticks always sound in tune
const SCALE = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760];
export const note = (i: number) => SCALE[((i % SCALE.length) + SCALE.length) % SCALE.length]!;
// a little pitch wobble keeps repeated taps from sounding robotic
const wob = (f: number) => f * (0.97 + Math.random() * 0.06);

const SOUNDS: Record<SoundName, (pitch?: number) => void> = {
  press: () => { tone({ from: wob(620), to: 920, dur: 0.05, vol: 0.09 }); hiss(0.03, 3000, 1500, 0.05); },
  chunk: () => { tone({ type: 'triangle', from: wob(330), to: 180, dur: 0.09, vol: 0.22 }); hiss(0.04, 1800, 600, 0.07); },
  select: () => tone({ from: wob(880), to: 1320, dur: 0.06, vol: 0.08 }),
  pop: (p = 784) => { tone({ type: 'triangle', from: p * 0.7, to: p * 1.5, dur: 0.07, vol: 0.2 }); tone({ type: 'triangle', from: p * 2, dur: 0.05, vol: 0.06, at: 0.04 }); },
  on: () => { tone({ from: 659, dur: 0.06, vol: 0.08 }); tone({ from: 988, dur: 0.09, vol: 0.08, at: 0.06 }); },
  off: () => { tone({ from: 988, dur: 0.06, vol: 0.08 }); tone({ from: 659, dur: 0.09, vol: 0.08, at: 0.06 }); },
  open: () => tone({ type: 'triangle', from: 260, to: 900, dur: 0.16, vol: 0.18 }),
  close: () => tone({ type: 'triangle', from: 820, to: 240, dur: 0.14, vol: 0.16 }),
  rewind: () => [1319, 1047, 784, 523].forEach((f, i) => tone({ from: f, dur: 0.05, vol: 0.07, at: i * 0.04 })),
  poof: () => { hiss(0.22, 2400, 300, 0.16); tone({ type: 'triangle', from: 500, to: 120, dur: 0.18, vol: 0.12 }); },
  coin: () => { tone({ from: 988, dur: 0.08, vol: 0.09 }); tone({ from: 1319, dur: 0.38, vol: 0.09, at: 0.08 }); },
  powerup: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone({ from: f, dur: 0.07, vol: 0.08, at: i * 0.05 })),
  error: () => { tone({ type: 'sawtooth', from: 220, to: 140, dur: 0.12, vol: 0.07 }); tone({ type: 'sawtooth', from: 180, to: 110, dur: 0.16, vol: 0.07, at: 0.12 }); },
};

export function play(name: SoundName, pitch?: number) {
  SOUNDS[name](pitch);
}

let lastTick = 0;
/** A knob detent: higher as `frac` (0–1) goes up. Fast turns skip ticks instead of turning into a buzz. */
export function tick(frac: number) {
  const now = performance.now();
  if (now - lastTick < 28) return;
  lastTick = now;
  tone({ from: 700 + frac * 900, dur: 0.018, vol: 0.07 });
  hiss(0.015, 4000, 2500, 0.05);
  buzz(4);
}

/** A tiny vibration on phones that support it (Android; iPhones ignore it). */
export function buzz(ms = 8) {
  if (enabled && 'vibrate' in navigator) navigator.vibrate(ms);
}

const PRESS = '.rb, .dial, .zoom-level';
const PICK = '.drop, .bub, .mini-bub, .thumb, .orig-bub';
const SELECT = '.pill button, .pal, .tab, .empty';

const indexIn = (el: Element) => (el.parentElement ? [...el.parentElement.children].indexOf(el) : 0);

function soundFor(el: HTMLElement): (() => void) | null {
  const named = el.dataset.sound;
  if (named === 'none') return null;
  if (named) return () => play(named as SoundName);
  if (el.matches('.switch-row')) return () => play(el.getAttribute('aria-checked') === 'true' ? 'off' : 'on');
  if (el.matches('.honey')) return () => play('chunk');
  if (el.matches(PRESS)) return () => play('press');
  if (el.matches(PICK)) return () => play('pop', note(indexIn(el)));
  if (el.matches(SELECT)) return () => play('select');
  return null;
}

const target = (e: Event) => {
  const el = (e.target as Element | null)?.closest?.<HTMLElement>('button, label.drop');
  return el && !(el as HTMLButtonElement).disabled && el.getAttribute('aria-disabled') !== 'true' ? el : null;
};

/** Hooks every button up to its sound, plus a tick per item when a `data-tick` row scrolls by. Returns an undo. */
export function installSounds() {
  // round buttons sound the moment they go down, like a real button; picks wait for the click so scrolling a row stays quiet
  const down = (e: PointerEvent) => {
    const el = target(e);
    if (!el || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (el.matches(PRESS) || el.dataset.sound) {
      soundFor(el)?.();
      if (e.pointerType !== 'mouse') buzz();
    }
  };
  const click = (e: MouseEvent) => {
    const el = target(e);
    if (!el) return;
    const pressedEarlier = (el.matches(PRESS) || el.dataset.sound) && e.detail > 0;
    if (!pressedEarlier) soundFor(el)?.();
  };
  const spots = new WeakMap<Element, number>();
  const scroll = (e: Event) => {
    const el = e.target;
    if (!(el instanceof HTMLElement) || !el.dataset.tick) return;
    const at = Math.floor((el.scrollLeft + el.scrollTop) / Number(el.dataset.tick));
    const was = spots.get(el);
    spots.set(el, at);
    if (was !== undefined && was !== at) tick(0.5);
  };
  document.addEventListener('pointerdown', down, true);
  document.addEventListener('click', click, true);
  document.addEventListener('scroll', scroll, true);
  return () => {
    document.removeEventListener('pointerdown', down, true);
    document.removeEventListener('click', click, true);
    document.removeEventListener('scroll', scroll, true);
  };
}
