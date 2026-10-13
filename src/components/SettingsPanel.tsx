import { useState } from 'react';
import { ChevronDown, Leaf, RotateCcw, Sparkles, Undo2 } from 'lucide-react';
import { hueName, oklchToHex } from '../engine/color';
import { DEFAULT_SETTINGS, type Settings, type Stats } from '../engine/types';
import type { LoadedImage } from '../images';
import { Pill, Slider, Switch } from './Controls';

interface Props {
  settings: Settings;
  image: LoadedImage | null;
  stats: Stats | undefined;
  onChange: (next: Settings) => void;
  onResetPick: () => void;
}

const pct = (v: number) => `${v}%`;

export function SettingsPanel({ settings: s, image, stats, onChange, onResetPick }: Props) {
  const [more, setMore] = useState(false);
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...s, [key]: value });
  const percent = (key: 'strength' | 'match' | 'variety' | 'saturation' | 'contrast') => ({
    id: `s-${key}`,
    value: Math.round(s[key] * 100),
    format: pct,
    onChange: (v: number) => set(key, v / 100),
  });

  return (
    <div className="tune">
      {image && <MainColor image={image} stats={stats} whole={s.scope === 'whole'} onResetPick={onResetPick} />}
      <Pill label="Style" value={s.mode} onChange={v => set('mode', v)} options={[
        { value: 'natural', label: 'Natural', icon: <Leaf size={18} />, title: 'Keeps the original shading. Closest to a real repaint.' },
        { value: 'stylized', label: 'Stylized', icon: <Sparkles size={18} />, title: 'Gradient map: cool shadows, your color, warm highlights.' },
      ]} />
      <Slider label="Strength" min={0} max={100} {...percent('strength')} hint="Blend between the original and the new color." />
      <Switch label="Only the main color" checked={s.scope === 'main'} onChange={v => set('scope', v ? 'main' : 'whole')}
        title="Leaves other parts, like a trunk or pot, untouched." />

      {more && (
        <>
          <Slider id="s-tolerance" label="Hue range" value={s.tolerance} min={8} max={70} format={v => `±${v}°`}
            disabled={s.scope === 'whole'} onChange={v => set('tolerance', v)}
            hint="How far from the main color still counts as the main color." />
          {s.mode === 'natural' ? (
            <>
              <Slider label="Brightness match" min={0} max={100} {...percent('match')}
                hint="100%: the typical pixel becomes exactly your color. 0%: keeps the original brightness." />
              <Slider label="Hue variety" min={0} max={150} {...percent('variety')}
                hint="How much of the original color variation survives." />
              <Slider label="Saturation" min={30} max={160} {...percent('saturation')} />
            </>
          ) : (
            <>
              <Slider id="s-shift" label="Shadow / highlight shift" value={s.shift} min={0} max={40} format={v => `${v}°`}
                onChange={v => set('shift', v)} hint="Shadows lean blue and highlights lean yellow." />
              <Slider label="Contrast" min={40} max={160} {...percent('contrast')}
                hint="How dark the shadows and how bright the highlights get." />
            </>
          )}
        </>
      )}

      <div className="tune-foot">
        <button type="button" className="text-btn" aria-expanded={more} onClick={() => setMore(!more)}>
          {more ? 'Fewer settings' : 'More settings'} <ChevronDown size={18} className={more ? 'flip' : undefined} />
        </button>
        <button type="button" className="rb sm flat" aria-label="Reset sliders" title="Reset sliders"
          onClick={() => onChange({ ...DEFAULT_SETTINGS, mode: s.mode, scope: s.scope })}>
          <RotateCcw size={19} />
        </button>
      </div>
    </div>
  );
}

interface MainColorProps { image: LoadedImage; stats: Stats | undefined; whole: boolean; onResetPick: () => void }

function MainColor({ image, stats, whole, onResetPick }: MainColorProps) {
  if (image.autoHue === null && image.pickedHue === null) {
    return <p className="main-color">No clear main color. Tap the original to pick one.</p>;
  }
  const dot = stats ? oklchToHex({ l: stats.meanL, c: stats.meanC, h: image.hue }) : 'transparent';
  return (
    <div className="main-color">
      <span className="dot" style={{ background: dot }} />
      <span>
        Main color: <b>{hueName(image.hue)}</b>
        {stats && !whole && ` · ${Math.round(stats.coverage * 100)}%`}
      </span>
      {image.pickedHue === null
        ? <span className="tag">auto</span>
        : <button type="button" className="rb xs" aria-label="Back to auto-detect" title="Back to auto-detect" onClick={onResetPick}><Undo2 size={15} /></button>}
    </div>
  );
}
