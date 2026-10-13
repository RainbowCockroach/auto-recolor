import { DEFAULT_SETTINGS, type Mode, type Settings } from '../engine/types';
import { Segmented, Slider } from './Controls';

interface Props {
  settings: Settings;
  onChange: (next: Settings) => void;
}

const pct = (v: number) => `${v}%`;
const MODES: { value: Mode; title: string; text: string }[] = [
  { value: 'natural', title: 'Natural', text: 'Keeps the original shading and small color differences. Closest to a real repaint.' },
  { value: 'stylized', title: 'Stylized', text: 'Gradient map: cool shadows, your color in the middle, warm highlights. Clean and even.' },
];

export function SettingsPanel({ settings: s, onChange }: Props) {
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...s, [key]: value });
  const percent = (key: 'strength' | 'match' | 'variety' | 'saturation' | 'contrast') => ({
    id: `s-${key}`,
    value: Math.round(s[key] * 100),
    format: pct,
    onChange: (v: number) => set(key, v / 100),
  });

  return (
    <section className="block settings" aria-label="Recolor settings">
      <div className="modes" role="radiogroup" aria-label="Mode">
        {MODES.map(m => (
          <span key={m.value}>
            <input type="radio" name="mode" id={`mode-${m.value}`} checked={s.mode === m.value} onChange={() => set('mode', m.value)} />
            <label htmlFor={`mode-${m.value}`}><strong>{m.title}</strong><span>{m.text}</span></label>
          </span>
        ))}
      </div>

      <div className="sliders">
        <div className="ctl">
          <span className="lbl">What to recolor</span>
          <Segmented name="scope" label="What to recolor" value={s.scope} onChange={v => set('scope', v)}
            options={[{ value: 'main', label: 'Main color only' }, { value: 'whole', label: 'Whole image' }]} />
          <small>Main color only leaves other parts, like a trunk or pot, untouched.</small>
        </div>
        <Slider id="s-tolerance" label="Hue range" value={s.tolerance} min={8} max={70} format={v => `±${v}°`}
          disabled={s.scope === 'whole'} onChange={v => set('tolerance', v)}
          hint="How far from the main color still counts as the main color." />
        <Slider label="Strength" min={0} max={100} {...percent('strength')} hint="Blend between the original and the new color." />

        {s.mode === 'natural' ? (
          <>
            <Slider label="Brightness match" min={0} max={100} {...percent('match')}
              hint="100%: the typical pixel becomes exactly your color. 0%: keeps the original brightness." />
            <Slider label="Hue variety" min={0} max={150} {...percent('variety')}
              hint="How much of the original color variation survives. 0% is one flat hue." />
            <Slider label="Saturation" min={30} max={160} {...percent('saturation')} />
          </>
        ) : (
          <>
            <Slider id="s-shift" label="Shadow / highlight hue shift" value={s.shift} min={0} max={40} format={v => `${v}°`}
              onChange={v => set('shift', v)} hint="Shadows lean blue and highlights lean yellow, a common pixel-art trick." />
            <Slider label="Contrast" min={40} max={160} {...percent('contrast')}
              hint="How dark the shadows and how bright the highlights get." />
          </>
        )}
      </div>
      <div>
        <button type="button" className="linkish" onClick={() => onChange({ ...DEFAULT_SETTINGS, mode: s.mode, scope: s.scope })}>
          Reset sliders
        </button>
      </div>
    </section>
  );
}
