import { useEffect, useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Palette } from '../model';
import { radioKeys, radioTab } from './Controls';

interface Props {
  palettes: Palette[];
  selectedColorId: string | null;
  onSelect: (colorId: string) => void;
  /** Extra buttons at the end of the name row (the download buttons on phones). */
  actions?: ReactNode;
}

/** Palette pills, a tray of the active palette's colors, and arrows to step through them. */
export function ColorPicker({ palettes, selectedColorId, onSelect, actions }: Props) {
  const palette = palettes.find(p => p.colors.some(c => c.id === selectedColorId)) ?? palettes[0];
  const tray = useRef<HTMLDivElement>(null);

  // keep the picked drop in view: the tray scrolls sideways on phones, down on wide screens (it is position: relative)
  useEffect(() => {
    const t = tray.current, el = t?.querySelector<HTMLElement>('[aria-checked="true"]');
    if (!t || !el) return;
    if (el.offsetTop < t.scrollTop) t.scrollTop = el.offsetTop - 8;
    else if (el.offsetTop + el.offsetHeight > t.scrollTop + t.clientHeight) t.scrollTop = el.offsetTop + el.offsetHeight - t.clientHeight + 12;
    if (el.offsetLeft < t.scrollLeft) t.scrollLeft = el.offsetLeft - 14;
    else if (el.offsetLeft + el.offsetWidth > t.scrollLeft + t.clientWidth * 0.85) t.scrollLeft = el.offsetLeft + el.offsetWidth - t.clientWidth * 0.85 + 14;
  }, [selectedColorId]);

  if (!palette) return null;
  const colors = palette.colors;
  const i = Math.max(0, colors.findIndex(c => c.id === selectedColorId));
  const color = colors[i]!;
  const step = (d: number) => onSelect(colors[(i + d + colors.length) % colors.length]!.id);

  return (
    <div className="picker">
      <div className="picker-name">
        <button type="button" className="rb sm" aria-label="Previous color" title="Previous color (↑)" aria-keyshortcuts="ArrowUp" onClick={() => step(-1)}><ChevronLeft size={19} /></button>
        <div className="picker-label" aria-live="polite">
          <strong>{color.name}</strong>
          <span className="count">{color.hex} · {i + 1}/{colors.length}</span>
        </div>
        <button type="button" className="rb sm" aria-label="Next color" title="Next color (↓)" aria-keyshortcuts="ArrowDown" onClick={() => step(1)}><ChevronRight size={19} /></button>
        {actions}
      </div>

      {palettes.length > 1 && <div className="pals" data-tick="90" role="radiogroup" aria-label="Palettes" onKeyDown={radioKeys}>
        {palettes.map((p, n) => (
          <button key={p.id} type="button" role="radio" aria-checked={p.id === palette.id} tabIndex={radioTab(n, palettes.indexOf(palette))} className="pal"
            onClick={() => { if (p.id !== palette.id) onSelect(p.colors[0]!.id); }}>
            <span className="pal-dots" aria-hidden="true">
              {[0, Math.floor(p.colors.length / 2), p.colors.length - 1].map((k, n) => <i key={n} style={{ background: p.colors[k]!.hex }} />)}
            </span>
            {p.name} <span className="count">{p.colors.length}</span>
          </button>
        ))}
      </div>}

      <div className="tray" ref={tray} data-tick="40" role="radiogroup" aria-label={`${palette.name} colors`} onKeyDown={radioKeys}>
        {colors.map((c, n) => (
          <button key={c.id} type="button" className="drop" role="radio" aria-checked={c.id === color.id} tabIndex={radioTab(n, i)}
            aria-label={c.name} title={`${c.name} ${c.hex}`} style={{ backgroundColor: c.hex }} onClick={() => onSelect(c.id)} />
        ))}
      </div>
    </div>
  );
}
