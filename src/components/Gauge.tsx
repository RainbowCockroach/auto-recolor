import { useEffect, useRef } from 'react';
import { Check, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import { buzz, play, tick } from '../sound';

export interface DialSpec<K extends string> {
  key: K;
  label: string;
  /** Value in the dial's own units (percent for percentages). */
  value: number;
  min: number;
  max: number;
  /** Double-tap goes back to this. */
  initial: number;
  format: (v: number) => string;
  hint?: string;
  disabled?: boolean;
  onChange: (v: number) => void;
}

interface Props<K extends string> {
  dials: DialSpec<K>[];
  active: DialSpec<K>;
  onFocus: (key: K) => void;
  onClose: () => void;
}

// Half circle in a 320×196 box: center (160, 170), radius 120.
const R = 120;
const ARC = Math.PI * R;
const point = (f: number, r: number) => {
  const a = Math.PI * (1 - f);
  return [160 + r * Math.cos(a), 170 - r * Math.sin(a)] as const;
};
const TICKS = Array.from({ length: 11 }, (_, i) => i / 10);
const DOUBLE_TAP_MS = 350;
const STEP_KEYS: Record<string, number> = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 };

/** A big half-circle gauge for one setting: slide left/right anywhere on it, or use − / +. */
export function Gauge<K extends string>({ dials, active: d, onFocus, onClose }: Props<K>) {
  const ref = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ x: number; v: number; w: number; moved: boolean } | null>(null);
  const lastTap = useRef(0);
  const { value, min, max, disabled } = d;
  const set = (v: number) => {
    const next = Math.max(min, Math.min(max, Math.round(v)));
    if (disabled || next === value) return;
    // hitting either end gives a soft bump, like a knob's end stop
    if (next === min || next === max) { play('bump'); buzz(); } else tick((next - min) / (max - min));
    d.onChange(next);
  };
  const setRef = useRef(set);
  useEffect(() => { setRef.current = set; });

  useEffect(() => { play('open'); }, []);
  useEffect(() => { ref.current?.focus({ preventScroll: true }); }, [d.key]);

  // React's onWheel is passive, so it can't stop the page from scrolling under the gauge
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      setRef.current(value + (e.deltaY < 0 ? 1 : -1));
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, [value]);

  const i = dials.findIndex(x => x.key === d.key);
  const go = (n: number) => onFocus(dials[(i + n + dials.length) % dials.length]!.key);
  const f = (value - min) / (max - min);
  const [tx, ty] = point(f, R);

  return (
    <div className={`gauge-panel${disabled ? ' off' : ''}`}>
      <div className="gauge-head">
        <button type="button" className="rb sm" aria-label="Previous setting" title="Previous setting" onClick={() => go(-1)}><ChevronLeft size={19} /></button>
        <div className="gauge-title">
          <strong>{d.label}</strong>
          <span className="gauge-dots" aria-hidden="true">{dials.map(x => <i key={x.key} className={x.key === d.key ? 'on' : undefined} />)}</span>
        </div>
        <button type="button" className="rb sm" aria-label="Next setting" title="Next setting" onClick={() => go(1)}><ChevronRight size={19} /></button>
        <button type="button" className="rb sm honey" data-sound="close" aria-label="Done" title="Done" onClick={onClose}><Check size={19} /></button>
      </div>

      <button ref={ref} type="button" className="gauge" role="slider" title={d.hint} aria-label={d.label} aria-disabled={disabled}
        aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-valuetext={d.format(value)}
        onPointerDown={e => {
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* synthetic pointers can't be captured */ }
          drag.current = { x: e.clientX, v: value, w: e.currentTarget.getBoundingClientRect().width, moved: false };
        }}
        onPointerMove={e => {
          const g = drag.current;
          if (!g) return;
          const dx = e.clientX - g.x;
          if (Math.abs(dx) > 4) g.moved = true;
          // the gauge's full width covers the whole range
          if (g.moved) set(g.v + (dx * (max - min)) / g.w);
        }}
        onPointerUp={() => {
          const g = drag.current;
          drag.current = null;
          if (!g || g.moved) return;
          const now = Date.now();
          if (now - lastTap.current < DOUBLE_TAP_MS) { if (value !== d.initial) play('rewind'); set(d.initial); lastTap.current = 0; } else lastTap.current = now;
        }}
        onPointerCancel={() => { drag.current = null; }}
        onKeyDown={e => {
          const step = STEP_KEYS[e.key];
          const to = step !== undefined ? value + step : e.key === 'Home' ? min : e.key === 'End' ? max : null;
          if (e.key === 'Escape') onClose();
          else if (to !== null) { e.preventDefault(); set(to); }
        }}>
        <svg viewBox="0 0 320 196" aria-hidden="true">
          {TICKS.map((t, n) => {
            const major = n % 5 === 0;
            const [x1, y1] = point(t, 142);
            const [x2, y2] = point(t, major ? 156 : 150);
            return <line key={n} className="g-tick" x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={major ? 3 : 2} />;
          })}
          <path className="g-track" d="M 40 170 A 120 120 0 0 1 280 170" />
          <path className="g-track g-fill" d="M 40 170 A 120 120 0 0 1 280 170" strokeDasharray={`${f * ARC} 999`} />
          <circle className="g-thumb" cx={tx} cy={ty} r={22} />
          <circle cx={tx} cy={ty} r={15} fill="#fff" />
          <text key={value} className="g-value" x={160} y={150} textAnchor="middle">{d.format(value)}</text>
          <text className="g-end" x={40} y={196} textAnchor="middle">{d.format(min)}</text>
          <text className="g-end" x={280} y={196} textAnchor="middle">{d.format(max)}</text>
        </svg>
      </button>

      <div className="gauge-foot">
        <button type="button" className="rb" aria-label="Less" title="Less" disabled={disabled || value <= min} onClick={() => set(value - 1)}><Minus size={22} /></button>
        <span className="hint">Slide left or right<br />double-tap resets</span>
        <button type="button" className="rb" aria-label="More" title="More" disabled={disabled || value >= max} onClick={() => set(value + 1)}><Plus size={22} /></button>
      </div>
    </div>
  );
}
