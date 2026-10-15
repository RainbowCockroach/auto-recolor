// Tiny cozy sound kit (short taps on a wooden box), made on the fly with Web Audio (no sound files).
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
    soften.frequency.value = 3200;
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

/** A short knock on a wooden box: a quick-dying note with a soft knock at the start, no ringing. */
function wood(f: number, { at = 0, dur = 0.045, vol = 0.12 }: Wood = {}) {
  // the pitch drops as it dies, which reads as a hollow knock rather than a beep
  tone({ from: f, to: f * 0.85, dur, vol, at });
  if (!at) hiss(0.012, Math.min(f * 1.6, 3000), f * 0.8, vol * 0.6);
}

// G major pentatonic from G4, so runs of drops always sound in tune
const SCALE = [392, 440, 494, 587, 659, 784, 880, 988, 1175, 1319];
export const note = (i: number) => SCALE[((i % SCALE.length) + SCALE.length) % SCALE.length]!;
// a little pitch wobble keeps repeated taps from sounding robotic
const wob = (f: number) => f * (0.97 + Math.random() * 0.06);

const run = (notes: number[], gap = 0.045, vol = 0.08) => notes.forEach((f, i) => wood(f, { at: i * gap, vol }));

const SOUNDS: Record<SoundName, (pitch?: number) => void> = {
  press: () => wood(wob(587), { dur: 0.04, vol: 0.12 }),
  chunk: () => run([440, 659], 0.05, 0.12),
  bump: () => wood(370, { dur: 0.035, vol: 0.07 }),
  select: () => wood(wob(880), { dur: 0.03, vol: 0.08 }),
  pop: (p = 523) => wood(p, { dur: 0.05, vol: 0.13 }),
  on: () => run([587, 880], 0.045, 0.09),
  off: () => run([880, 587], 0.045, 0.09),
  open: () => run([523, 784]),
  close: () => run([784, 523]),
  rewind: () => run([880, 659, 523], 0.04, 0.07),
  poof: () => { wood(220, { dur: 0.07, vol: 0.12 }); hiss(0.08, 1600, 500, 0.03); },
  coin: () => run([659, 880], 0.06, 0.12),
  powerup: () => run([523, 659, 784], 0.05, 0.09),
  // a gentle hollow "tok-tok" going down, not a harsh buzz
  error: () => run([330, 277], 0.09, 0.11),
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
  // a small soft tap: low enough to feel cozy, high enough for phone speakers (they drop most sound below ~400 Hz)
  tone({ from: 600 + frac * 160, to: 560 + frac * 150, dur: 0.022, vol: 0.035 });
  hiss(0.006, 1800, 900, 0.02);
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
