import { History, Leaf, RotateCcw, Sparkles, Undo2 } from 'lucide-react';
import { hueDistance, hueName, oklchToHex } from '../engine/color';
import { DEFAULT_SETTINGS, type Settings, type Stats } from '../engine/types';
import type { LoadedImage } from '../images';
import { Dial, Pill, Switch } from './Controls';

interface Props {
  settings: Settings;
  image: LoadedImage | null;
  stats: Stats | undefined;
  onChange: (next: Settings) => void;
  /** A hue to use instead of the detected one, or null to go back to auto-detect. */
  onPickHue: (hue: number | null) => void;
}

const pct = (v: number) => `${v}%`;

export function SettingsPanel({ settings: s, image, stats, onChange, onPickHue }: Props) {
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...s, [key]: value });
  const percent = (key: 'strength' | 'match' | 'variety' | 'saturation' | 'contrast') => ({
    value: Math.round(s[key] * 100),
    initial: Math.round(DEFAULT_SETTINGS[key] * 100),
    format: pct,
    onChange: (v: number) => set(key, v / 100),
  });

  return (
    <div className="tune">
      {image && <MainColor image={image} stats={stats} whole={s.scope === 'whole'} onPickHue={onPickHue} />}
      <Pill label="Style" value={s.mode} onChange={v => set('mode', v)} options={[
        { value: 'natural', label: 'Natural', icon: <Leaf size={18} />, title: 'Keeps the original shading. Closest to a real repaint.' },
        { value: 'legacy', label: 'Legacy', icon: <History size={18} />, title: 'The old Natural mode, to match earlier results.' },
        { value: 'stylized', label: 'Stylized', icon: <Sparkles size={18} />, title: 'Gradient map: cool shadows, your color, warm highlights.' },
      ]} />

      <div className="dials">
        <Dial label="Strength" min={0} max={100} {...percent('strength')} hint="Blend between the original and the new color." />
        <Dial label="Hue range" value={s.tolerance} initial={DEFAULT_SETTINGS.tolerance} min={8} max={70} format={v => `±${v}°`}
          disabled={s.scope === 'whole'} onChange={v => set('tolerance', v)}
          hint="How far from the main color still counts as the main color." />
        {s.mode !== 'stylized' && (
          <>
            <Dial label="Brightness" min={0} max={100} {...percent('match')}
              hint="100%: the typical pixel becomes exactly your color. 0%: keeps the original brightness." />
            <Dial label="Hue variety" min={0} max={150} {...percent('variety')}
              hint="How much of the original color variation survives." />
            <Dial label="Saturation" min={30} max={160} {...percent('saturation')} />
          </>
        )}
        {s.mode === 'stylized' && (
          <Dial label="Shadow shift" value={s.shift} initial={DEFAULT_SETTINGS.shift} min={0} max={40} format={v => `${v}°`}
            onChange={v => set('shift', v)} hint="Shadows lean blue and highlights lean yellow." />
        )}
        {s.mode !== 'legacy' && (
          <Dial label="Contrast" min={40} max={160} {...percent('contrast')}
            hint={s.mode === 'natural' ? 'How strong the shading is. 100% keeps it as painted.' : 'How dark the shadows and how bright the highlights get.'} />
        )}
      </div>

      <Switch label="Only the main color" checked={s.scope === 'main'} onChange={v => set('scope', v ? 'main' : 'whole')}
        title="Leaves other parts, like a trunk or pot, untouched." />
      <div className="tune-foot">
        <span className="hint">Drag up or down · double-tap to reset</span>
        <button type="button" className="rb sm" aria-label="Reset all" title="Reset all"
          onClick={() => onChange({ ...DEFAULT_SETTINGS, mode: s.mode, scope: s.scope })}>
          <RotateCcw size={19} />
        </button>
      </div>
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
        <div className="hue-picks" role="radiogroup" aria-label="Colors found in the image">
          {image.autoHues.map((c, i) => (
            <button key={c.hue} type="button" className="drop" role="radio" aria-checked={picked(i)}
              aria-label={`${hueName(c.hue)}, ${Math.round(c.share * 100)}%`} title={`${hueName(c.hue)} · ${Math.round(c.share * 100)}%`}
              style={{ backgroundColor: oklchToHex({ l: c.l, c: c.c, h: c.hue }) }}
              onClick={() => onPickHue(i === 0 ? null : c.hue)} />
          ))}
        </div>
      )}
    </div>
  );
}
