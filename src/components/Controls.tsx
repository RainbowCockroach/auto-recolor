import type { CSSProperties, ReactNode } from 'react';

interface SliderProps {
  id: string;
  label: string;
  /** Value in the slider's own units (percent for percentages). */
  value: number;
  min: number;
  max: number;
  format: (v: number) => string;
  hint?: string;
  disabled?: boolean;
  onChange: (v: number) => void;
}

export function Slider({ id, label, value, min, max, format, hint, disabled, onChange }: SliderProps) {
  const fill = { '--v': `${((value - min) / (max - min)) * 100}%` } as CSSProperties;
  return (
    <div className={`ctl${disabled ? ' off' : ''}`} title={hint}>
      <label htmlFor={id}>{label} <output htmlFor={id}>{format(value)}</output></label>
      <input id={id} type="range" min={min} max={max} step={1} value={value} disabled={disabled} style={fill}
        onChange={e => onChange(Number(e.target.value))} />
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
