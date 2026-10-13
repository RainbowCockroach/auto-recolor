import { useState } from 'react';
import { makeColor, makePalette, type Palette, type PaletteColor } from '../model';

interface Props {
  palettes: Palette[];
  selectedColorId: string | null;
  onSelectColor: (id: string) => void;
  onChange: (next: Palette[], removed?: string) => void;
}

/** Accepts "#abc", "abc", "#aabbcc" or "aabbcc"; returns "#aabbcc" or null. */
function parseHexInput(text: string): string | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text.trim());
  if (!m) return null;
  const h = m[1]!.toLowerCase();
  return `#${h.length === 3 ? [...h].map(ch => ch + ch).join('') : h}`;
}

function HexField({ id, hex, onCommit }: { id: string; hex: string; onCommit: (hex: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const invalid = draft !== null && parseHexInput(draft) === null;
  const commit = () => {
    const parsed = draft === null ? null : parseHexInput(draft);
    if (parsed) onCommit(parsed);
    setDraft(null);
  };
  return (
    <input id={id} className={`hexin${invalid ? ' invalid' : ''}`} aria-label="Hex code" spellCheck={false}
      value={draft ?? hex} aria-invalid={invalid}
      onChange={e => {
        setDraft(e.target.value);
        // apply full 6-digit codes right away; short ones only when the field is left
        if (/^#?[0-9a-f]{6}$/i.test(e.target.value.trim())) onCommit(parseHexInput(e.target.value)!);
      }}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setDraft(null); e.currentTarget.blur(); } }} />
  );
}

export function PalettesPanel({ palettes, selectedColorId, onSelectColor, onChange }: Props) {
  const updatePalette = (pid: string, patch: (p: Palette) => Palette) =>
    onChange(palettes.map(p => (p.id === pid ? patch(p) : p)));
  const updateColor = (pid: string, cid: string, patch: Partial<PaletteColor>) =>
    updatePalette(pid, p => ({ ...p, colors: p.colors.map(c => (c.id === cid ? { ...c, ...patch } : c)) }));

  const removeColor = (p: Palette, c: PaletteColor) => {
    const rest = p.colors.filter(x => x.id !== c.id);
    onChange(rest.length ? palettes.map(x => (x.id === p.id ? { ...x, colors: rest } : x)) : palettes.filter(x => x.id !== p.id),
      rest.length ? `color “${c.name}”` : `palette “${p.name}”`);
  };

  return (
    <section className="block" aria-labelledby="palettes-title">
      <div className="block-head">
        <h2 id="palettes-title">Palettes</h2>
        <button type="button" className="btn small" onClick={() => {
          const p = makePalette(`palette${palettes.length + 1}`, [['green', '#3fa34d']]);
          onChange([...palettes, p]);
          onSelectColor(p.colors[0]!.id);
        }}>+ Palette</button>
      </div>
      <div className="palettes">
        {palettes.map(p => (
          <div className="palette" key={p.id}>
            <div className="palette-head">
              <input className="pname" aria-label="Palette name" value={p.name}
                onChange={e => updatePalette(p.id, x => ({ ...x, name: e.target.value }))} />
              <button type="button" className="x" aria-label={`Remove palette ${p.name}`}
                onClick={() => onChange(palettes.filter(x => x.id !== p.id), `palette “${p.name}”`)}>×</button>
            </div>
            <div className="chips">
              {p.colors.map(c => (
                <div key={c.id} className="chip" aria-current={c.id === selectedColorId}
                  onClick={() => onSelectColor(c.id)} onFocus={() => onSelectColor(c.id)}>
                  <input type="color" aria-label={`${c.name} color`} value={c.hex}
                    onChange={e => updateColor(p.id, c.id, { hex: e.target.value })} />
                  <input className="cname" aria-label="Color name" value={c.name}
                    onChange={e => updateColor(p.id, c.id, { name: e.target.value })} />
                  <HexField id={`hex-${c.id}`} hex={c.hex} onCommit={hex => updateColor(p.id, c.id, { hex })} />
                  <button type="button" className="x" aria-label={`Remove ${c.name}`}
                    onClick={e => { e.stopPropagation(); removeColor(p, c); }}>×</button>
                </div>
              ))}
              <button type="button" className="ghost" onClick={() => {
                const c = makeColor(`color${p.colors.length + 1}`, '#4a90c2');
                updatePalette(p.id, x => ({ ...x, colors: [...x.colors, c] }));
                onSelectColor(c.id);
              }}>+ color</button>
            </div>
          </div>
        ))}
      </div>
      <p className="hint">Palette and color names become file names. Saved in this browser.</p>
    </section>
  );
}
