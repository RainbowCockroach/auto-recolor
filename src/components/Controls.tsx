import type { CSSProperties, ReactNode } from 'react';

interface DialButtonProps {
  label: string;
  /** Value in the dial's own units (percent for percentages). */
  value: number;
  min: number;
  max: number;
  format: (v: number) => string;
  hint?: string;
  disabled?: boolean;
  active?: boolean;
  onClick: () => void;
}

/** A small round dial that shows a value; tapping it opens the big gauge. */
export function DialButton({ label, value, min, max, format, hint, disabled, active, onClick }: DialButtonProps) {
  const frac = (value - min) / (max - min);
  const style = { '--a': `${frac * 270}deg`, '--r': `${frac * 270 - 135}deg` } as CSSProperties;
  return (
    <button type="button" className={`dial${active ? ' on' : ''}`} title={hint} style={style} disabled={disabled}
      aria-label={`${label} ${format(value)}`} aria-pressed={active} onClick={onClick}>
      <span className="dial-wrap" aria-hidden="true">
        <span className="dial-arc" />
        <span className="knurl" />
        <span className="face">{format(value)}</span>
        <span className="needle" />
      </span>
      <span className="dial-label" aria-hidden="true">{label}</span>
    </button>
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
