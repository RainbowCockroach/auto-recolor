import { useState } from 'react';
import { CircleQuestionMark, History, Leaf, RotateCcw, Sparkles, Undo2 } from 'lucide-react';
import { hueDistance, hueName, oklchToHex } from '../engine/color';
import { DEFAULT_SETTINGS, type Settings, type Stats } from '../engine/types';
import type { LoadedImage } from '../images';
import { DialButton, Pill, Switch, radioKeys, radioTab } from './Controls';
import { Gauge, type DialSpec } from './Gauge';
import { Guide } from './Guide';

export type DialKey = Exclude<keyof Settings, 'mode' | 'scope'>;

const pct = (v: number) => `${v}%`;

/** The number settings shown as dials for the current mode, in display order. */
export function tuneDials(s: Settings, onChange: (next: Settings) => void): DialSpec<DialKey>[] {
  const set = (key: DialKey, v: number) => onChange({ ...s, [key]: v });
  const percent = (key: 'strength' | 'match' | 'variety' | 'saturation' | 'contrast', label: string, min: number, max: number, hint?: string): DialSpec<DialKey> => ({
    key, label, min, max, hint,
    value: Math.round(s[key] * 100),
    initial: Math.round(DEFAULT_SETTINGS[key] * 100),
    format: pct,
    onChange: v => set(key, v / 100),
  });
  const degrees = (key: 'tolerance' | 'shift', label: string, min: number, max: number, format: (v: number) => string, hint: string, disabled?: boolean): DialSpec<DialKey> => ({
    key, label, min, max, format, hint, disabled, value: s[key], initial: DEFAULT_SETTINGS[key], onChange: v => set(key, v),
  });

  return [
    percent('strength', 'Strength', 0, 100, 'Blend between the original and the new color.'),
    degrees('tolerance', 'Hue range', 8, 70, v => `±${v}°`, 'How far from the main color still counts as the main color.', s.scope === 'whole'),
    ...(s.mode !== 'stylized' ? [
      percent('match', 'Brightness', 0, 100, '100%: the typical pixel becomes exactly your color. 0%: keeps the original brightness.'),
      percent('variety', 'Hue variety', 0, 150, 'How much of the original color variation survives.'),
      percent('saturation', 'Saturation', 30, 160),
    ] : [
      degrees('shift', 'Shadow shift', 0, 40, v => `${v}°`, 'Shadows lean blue and highlights lean yellow.'),
    ]),
    ...(s.mode !== 'legacy' ? [
      percent('contrast', 'Contrast', 40, 160,
        s.mode === 'natural' ? 'How strong the shading is. 100% keeps it as painted.' : 'How dark the shadows and how bright the highlights get.'),
    ] : []),
  ];
}

interface Props {
  settings: Settings;
  image: LoadedImage | null;
  stats: Stats | undefined;
  /** The dial open in the big gauge. */
  focus: DialKey | null;
  /** Wide screens show the gauge here, in place of the dials; phones show it in its own sheet. */
  inlineGauge: boolean;
  onFocus: (key: DialKey | null) => void;
  onChange: (next: Settings) => void;
  /** A hue to use instead of the detected one, or null to go back to auto-detect. */
  onPickHue: (hue: number | null) => void;
}

export function SettingsPanel({ settings: s, image, stats, focus, inlineGauge, onFocus, onChange, onPickHue }: Props) {
  const [guide, setGuide] = useState(false);
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...s, [key]: value });
  const dials = tuneDials(s, onChange);
  const active = dials.find(d => d.key === focus);

  if (inlineGauge && active) return <Gauge dials={dials} active={active} onFocus={onFocus} onClose={() => onFocus(null)} />;

  return (
    <div className="tune">
      <section className="main-box" aria-label="Main color">
        {image && <MainColor image={image} stats={stats} whole={s.scope === 'whole'} onPickHue={onPickHue} />}
        <Switch label="Only the main color" checked={s.scope === 'main'} onChange={v => set('scope', v ? 'main' : 'whole')}
          title="Leaves other parts, like a trunk or pot, untouched." />
      </section>

      <div className="tune-row">
        <Pill label="Style" value={s.mode} onChange={v => set('mode', v)} options={[
          { value: 'natural', label: 'Natural', icon: <Leaf size={18} />, title: 'Keeps the original shading. Closest to a real repaint.' },
          { value: 'legacy', label: 'Legacy', icon: <History size={18} />, title: 'The old Natural mode, to match earlier results.' },
          { value: 'stylized', label: 'Stylized', icon: <Sparkles size={18} />, title: 'Gradient map: cool shadows, your color, warm highlights.' },
        ]} />
        <button type="button" className="rb sm" data-sound="rewind" aria-label="Reset all" title="Reset all"
          onClick={() => onChange({ ...DEFAULT_SETTINGS, mode: s.mode, scope: s.scope })}>
          <RotateCcw size={19} />
        </button>
      </div>

      <div className="dials">
        {dials.map(d => (
          <DialButton key={d.key} name={d.key} label={d.label} value={d.value} min={d.min} max={d.max} format={d.format} hint={d.hint}
            disabled={d.disabled} active={d.key === focus} onClick={() => onFocus(d.key)} />
        ))}
      </div>

      <div className="tune-foot">
        <button type="button" className="rb sm" aria-label="What do these do?" title="What do these do?" onClick={() => setGuide(true)}>
          <CircleQuestionMark size={20} />
        </button>
      </div>
      {guide && <Guide onClose={() => setGuide(false)} />}
    </div>
  );
}

interface MainColorProps { image: LoadedImage; stats: Stats | undefined; whole: boolean; onPickHue: (hue: number | null) => void }

function MainColor({ image, stats, whole, onPickHue }: MainColorProps) {
  if (image.autoHue === null && image.pickedHue === null) {
    return <p className="main-color">No clear main color. Tap the original to pick one.</p>;
  }
  const dot = stats ? oklchToHex({ l: stats.meanL, c: stats.meanC, h: image.hue }) : 'transparent';
  const picked = (i: number) => (image.pickedHue === null ? i === 0 : hueDistance(image.pickedHue, image.autoHues[i]!.hue) < 0.5);
  return (
    <div className="main-color">
      <div className="main-color-line">
        <span className="dot" style={{ background: dot }} />
        <span>
          Main color: <b>{hueName(image.hue)}</b>
          {stats && !whole && ` · ${Math.round(stats.coverage * 100)}%`}
        </span>
        {image.pickedHue === null
          ? <span className="tag">auto</span>
          : <button type="button" className="rb xs" aria-label="Back to auto-detect" title="Back to auto-detect" onClick={() => onPickHue(null)}><Undo2 size={15} /></button>}
      </div>
      {image.autoHues.length > 1 && (
        <div className="hue-picks" role="radiogroup" aria-label="Colors found in the image" onKeyDown={radioKeys}>
          {image.autoHues.map((c, i) => (
            <button key={c.hue} type="button" className="drop" role="radio" aria-checked={picked(i)}
              tabIndex={radioTab(i, image.autoHues.findIndex((_, j) => picked(j)))}
              aria-label={`${hueName(c.hue)}, ${Math.round(c.share * 100)}%`} title={`${hueName(c.hue)} · ${Math.round(c.share * 100)}%`}
              style={{ backgroundColor: oklchToHex({ l: c.l, c: c.c, h: c.hue }) }}
              onClick={() => onPickHue(i === 0 ? null : c.hue)} />
          ))}
        </div>
      )}
    </div>
  );
}
