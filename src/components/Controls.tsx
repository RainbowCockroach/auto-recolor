import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

interface DialProps {
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

/** Drag distance in px that turns the dial from min to max. */
const FULL_TURN = 160;
const DOUBLE_TAP_MS = 350;

/** A round knob: drag up/down (or sideways), scroll, or use the arrow keys; double-tap resets. */
export function Dial({ label, value, min, max, initial, format, hint, disabled, onChange }: DialProps) {
  const knob = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ x: number; y: number; v: number; moved: boolean } | null>(null);
  const lastTap = useRef(0);
  const [held, setHeld] = useState(false);
  const span = max - min;
  const set = (v: number) => {
    const next = Math.max(min, Math.min(max, Math.round(v)));
    if (next !== value) onChange(next);
  };

  // React's onWheel is passive, so it can't stop the drawer from scrolling under the dial
  useEffect(() => {
    const el = knob.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const next = Math.max(min, Math.min(max, value + (e.deltaY < 0 ? 1 : -1) * Math.max(1, Math.round((max - min) / 50))));
      if (next !== value) onChange(next);
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, [value, min, max, onChange]);

  const frac = (value - min) / span;
  const style = { '--a': `${frac * 270}deg`, '--r': `${frac * 270 - 135}deg` } as CSSProperties;
  const keys: Record<string, number> = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 };

  return (
    <div className={`dial${disabled ? ' off' : ''}`} title={hint} style={style}>
      <div className="dial-wrap">
        <span className="dial-arc" aria-hidden="true" />
        <button ref={knob} type="button" className={`knob${held ? ' held' : ''}`} role="slider" disabled={disabled}
          aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-valuetext={format(value)}
          onPointerDown={e => {
            try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* synthetic pointers can't be captured */ }
            drag.current = { x: e.clientX, y: e.clientY, v: value, moved: false };
            setHeld(true);
          }}
          onPointerMove={e => {
            const d = drag.current;
            if (!d) return;
            const delta = d.y - e.clientY + (e.clientX - d.x);
            if (Math.abs(delta) > 3) d.moved = true;
            set(d.v + (delta * span) / FULL_TURN);
          }}
          onPointerUp={() => {
            const d = drag.current;
            drag.current = null;
            setHeld(false);
            if (!d || d.moved) return;
            const now = Date.now();
            if (now - lastTap.current < DOUBLE_TAP_MS) { set(initial); lastTap.current = 0; } else lastTap.current = now;
          }}
          onPointerCancel={() => { drag.current = null; setHeld(false); }}
          onKeyDown={e => {
            const step = keys[e.key];
            const to = step !== undefined ? value + step : e.key === 'Home' ? min : e.key === 'End' ? max : null;
            if (to === null) return;
            e.preventDefault();
            set(to);
          }}>
          <span className="knurl" />
          <span className="face">{format(value)}</span>
          <span className="needle" />
        </button>
      </div>
      <span className="dial-label">{label}</span>
    </div>
  );
}

interface PillProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string; icon?: ReactNode; title?: string }[];
  onChange: (v: T) => void;
}

/** A sunken track with the chosen option raised. */
export function Pill<T extends string>({ label, value, options, onChange }: PillProps<T>) {
  return (
    <div className="pill" role="radiogroup" aria-label={label}>
      {options.map(o => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} title={o.title}
          className={value === o.value ? 'on' : undefined} onClick={() => onChange(o.value)}>
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  );
}

interface SwitchProps {
  label: string;
  checked: boolean;
  title?: string;
  onChange: (v: boolean) => void;
}

export function Switch({ label, checked, title, onChange }: SwitchProps) {
  return (
    <button type="button" className="switch-row" role="switch" aria-checked={checked} title={title} onClick={() => onChange(!checked)}>
      {label}<span className="switch" aria-hidden="true" />
    </button>
  );
}
