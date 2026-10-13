import type { ReactNode } from 'react';

interface SliderProps {
  id: string;
  label: string;
  /** Value in the slider's own units (percent for percentages). */
  value: number;
  min: number;
  max: number;
  format: (v: number) => string;
  hint?: ReactNode;
  disabled?: boolean;
  onChange: (v: number) => void;
}

export function Slider({ id, label, value, min, max, format, hint, disabled, onChange }: SliderProps) {
  return (
    <div className={`ctl${disabled ? ' off' : ''}`}>
      <label htmlFor={id}>{label} <output htmlFor={id}>{format(value)}</output></label>
      <input id={id} type="range" min={min} max={max} step={1} value={value} disabled={disabled}
        onChange={e => onChange(Number(e.target.value))} />
      {hint && <small>{hint}</small>}
    </div>
  );
}

interface SegmentedProps<T extends string> {
  name: string;
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

export function Segmented<T extends string>({ name, label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map(o => (
        <span key={o.value}>
          <input type="radio" name={name} id={`${name}-${o.value}`} value={o.value}
            checked={value === o.value} onChange={() => onChange(o.value)} />
          <label htmlFor={`${name}-${o.value}`}>{o.label}</label>
        </span>
      ))}
    </div>
  );
}
