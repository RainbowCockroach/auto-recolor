// Tiny cozy sound kit (wood blocks and marimba notes), made on the fly with Web Audio (no sound files).
// Buttons get their sound from one listener on the document, picked by class or `data-sound`.

export type SoundName = 'press' | 'chunk' | 'bump' | 'select' | 'pop' | 'on' | 'off' | 'open' | 'close' | 'rewind' | 'poof' | 'coin' | 'powerup' | 'error';

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let noise: AudioBuffer | null = null;
function audio() {
  if (!ctx) {
    try { ctx = new AudioContext(); } catch { return null; }
    out = ctx.createGain();
    out.gain.value = 0.5;
    // a soft lowpass rounds off any sharp edge
    const soften = ctx.createBiquadFilter();
    soften.type = 'lowpass';
    soften.frequency.value = 4200;
    out.connect(soften).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

interface Tone { type?: OscillatorType; from: number; to?: number; dur: number; vol?: number; at?: number }

function tone({ type = 'sine', from, to = from, dur, vol = 0.1, at = 0 }: Tone) {
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

interface Wood { at?: number; dur?: number; vol?: number }

/** A struck wooden bar: a quick-fading note, a faint bright overtone and a tiny knock at the start. */
function wood(f: number, { at = 0, dur = 0.12, vol = 0.12 }: Wood = {}) {
  // the pitch sags a hair as it rings, which sounds like wood rather than a beep
  tone({ from: f, to: f * 0.98, dur, vol, at });
  // a marimba bar's first overtone sits about 4× up and dies much sooner
  tone({ from: f * 3.93, dur: dur / 4, vol: vol * 0.22, at });
  if (!at) hiss(0.008, Math.min(f * 2, 6000), f, vol * 0.5);
}

// C major pentatonic from C5, so runs of drops and ticks always sound in tune
const SCALE = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760];
export const note = (i: number) => SCALE[((i % SCALE.length) + SCALE.length) % SCALE.length]!;
// a little pitch wobble keeps repeated taps from sounding robotic
const wob = (f: number) => f * (0.97 + Math.random() * 0.06);

const run = (notes: number[], gap = 0.04, vol = 0.07) => notes.forEach((f, i) => wood(f, { at: i * gap, vol, dur: 0.1 }));

const SOUNDS: Record<SoundName, (pitch?: number) => void> = {
  press: () => wood(wob(880), { dur: 0.06, vol: 0.11 }),
  chunk: () => { wood(659, { vol: 0.12 }); wood(988, { at: 0.06, vol: 0.11, dur: 0.16 }); },
  bump: () => tone({ from: 180, to: 150, dur: 0.05, vol: 0.045 }),
  select: () => wood(wob(1320), { dur: 0.05, vol: 0.07 }),
  pop: (p = 784) => wood(p, { dur: 0.16, vol: 0.12 }),
  on: () => { wood(880, { dur: 0.06, vol: 0.08 }); wood(1320, { at: 0.05, vol: 0.08 }); },
  off: () => { wood(1320, { dur: 0.06, vol: 0.08 }); wood(880, { at: 0.05, vol: 0.08 }); },
  open: () => run([784, 988, 1175]),
  close: () => run([1175, 988, 784]),
  rewind: () => run([1568, 1319, 1047, 784], 0.035, 0.06),
  poof: () => { wood(294, { dur: 0.14, vol: 0.1 }); hiss(0.1, 2500, 700, 0.03); },
  coin: () => { wood(988, { dur: 0.08, vol: 0.11 }); wood(1319, { at: 0.07, dur: 0.35, vol: 0.11 }); },
  powerup: () => run([784, 988, 1175, 1568], 0.05, 0.08),
  // a gentle hollow "tok-tok" going down, not a harsh buzz
  error: () => { wood(392, { dur: 0.1, vol: 0.1 }); wood(330, { at: 0.11, dur: 0.16, vol: 0.1 }); },
};

export function play(name: SoundName, pitch?: number) {
  SOUNDS[name](pitch);
}

let lastTick = 0;
/** A knob detent: higher as `frac` (0–1) goes up. Fast turns skip ticks instead of turning into a buzz. */
export function tick(frac: number) {
  const now = performance.now();
  if (now - lastTick < 45) return;
  lastTick = now;
  // a small low tap, barely there: no overtone or knock, just a soft thump
  tone({ from: 300 + frac * 120, to: 260 + frac * 100, dur: 0.025, vol: 0.03 });
}

/** A tiny vibration on phones that support it (Android; iPhones ignore it). */
export function buzz(ms = 8) {
  if ('vibrate' in navigator) navigator.vibrate(ms);
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
    if (el.matches(PRESS)) {
      soundFor(el)?.();
      if (e.pointerType !== 'mouse') buzz();
    }
  };
  const click = (e: MouseEvent) => {
    const el = target(e);
    if (!el) return;
    const pressedEarlier = el.matches(PRESS) && e.detail > 0;
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
