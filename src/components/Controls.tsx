import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';

const RADIO_STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/** Arrow keys, Home and End move the choice inside a role="radiogroup", like native radio buttons. */
export function radioKeys(e: KeyboardEvent<HTMLElement>) {
  const radios = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')];
  const i = radios.indexOf(e.target as HTMLElement);
  const step = RADIO_STEP[e.key];
  if (i < 0 || (step === undefined && e.key !== 'Home' && e.key !== 'End')) return;
  e.preventDefault();
  const next = radios[e.key === 'Home' ? 0 : e.key === 'End' ? radios.length - 1 : (i + step! + radios.length) % radios.length];
  next?.focus();
  next?.click();
}

/** Only one radio of a group is a Tab stop: the checked one, or the first when none is. */
export const radioTab = (i: number, checked: number) => ((checked < 0 ? i === 0 : i === checked) ? 0 : -1);

interface DialButtonProps {
  /** Which setting it is, so focus can come back to it when the gauge closes. */
  name: string;
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
export function DialButton({ name, label, value, min, max, format, hint, disabled, active, onClick }: DialButtonProps) {
  const frac = (value - min) / (max - min);
  const style = { '--a': `${frac * 270}deg`, '--r': `${frac * 270 - 135}deg` } as CSSProperties;
  return (
    <button type="button" className={`dial${active ? ' on' : ''}`} data-dial={name} title={hint} style={style} disabled={disabled}
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
  const checked = options.findIndex(o => o.value === value);
  return (
    <div className="pill" role="radiogroup" aria-label={label} onKeyDown={radioKeys}>
      {options.map((o, i) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} tabIndex={radioTab(i, checked)} title={o.title}
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
