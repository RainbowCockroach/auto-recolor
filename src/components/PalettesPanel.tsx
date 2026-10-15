import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react';
import { makeColor, makePalette, type Palette, type PaletteColor } from '../model';
import { PresetLibrary } from './PresetLibrary';

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

function HexField({ hex, onCommit }: { hex: string; onCommit: (hex: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const invalid = draft !== null && parseHexInput(draft) === null;
  const commit = () => {
    const parsed = draft === null ? null : parseHexInput(draft);
    if (parsed) onCommit(parsed);
    setDraft(null);
  };
  return (
    <input className={`field hex${invalid ? ' invalid' : ''}`} aria-label="Hex code" spellCheck={false}
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
  const [libraryOpen, setLibraryOpen] = useState(false);
  // The open palette is the one holding the picked color, unless the person folded it.
  const [folded, setFolded] = useState(false);
  const openId = folded ? null : palettes.find(p => p.colors.some(c => c.id === selectedColorId))?.id ?? null;
  const total = palettes.reduce((n, p) => n + p.colors.length, 0);

  const updatePalette = (pid: string, patch: (p: Palette) => Palette) =>
    onChange(palettes.map(p => (p.id === pid ? patch(p) : p)));
  const updateColor = (pid: string, cid: string, patch: Partial<PaletteColor>) =>
    updatePalette(pid, p => ({ ...p, colors: p.colors.map(c => (c.id === cid ? { ...c, ...patch } : c)) }));

  const unfold = (p: Palette) => { setFolded(false); onSelectColor(p.colors[0]!.id); };

  const removeColor = (p: Palette, c: PaletteColor) => {
    const i = p.colors.indexOf(c);
    const rest = p.colors.filter(x => x.id !== c.id);
    onChange(rest.length ? palettes.map(x => (x.id === p.id ? { ...x, colors: rest } : x)) : palettes.filter(x => x.id !== p.id),
      rest.length ? `color “${c.name}”` : `palette “${p.name}”`);
    const next = rest[Math.min(i, rest.length - 1)];
    if (next) onSelectColor(next.id);
  };

  const addPalette = (p: Palette) => { onChange([...palettes, p]); setFolded(false); onSelectColor(p.colors[0]!.id); };

  return (
    <div className="palettes">
      <div className="palettes-head">
        <h2>Palettes <span className="count">{palettes.length} · {total} colors</span></h2>
        <button type="button" className="rb sm" aria-label="Palette library" title="Palette library" onClick={() => setLibraryOpen(true)}>
          <BookOpen size={19} />
        </button>
        <button type="button" className="rb sm" aria-label="New palette" title="New palette"
          onClick={() => addPalette(makePalette(`palette${palettes.length + 1}`, [['green', '#3fa34d']]))}>
          <Plus size={19} />
        </button>
      </div>
      <PresetLibrary open={libraryOpen} onClose={() => setLibraryOpen(false)}
        addedIds={new Set(palettes.flatMap(p => (p.presetId ? [p.presetId] : [])))}
        onAdd={preset => addPalette(makePalette(preset.name, preset.colors, preset.id))} />

      {palettes.map(p => p.id === openId ? (
        <div className="palette open" key={p.id}>
          <div className="palette-head">
            <input className="pname" aria-label="Palette name" value={p.name}
              onChange={e => updatePalette(p.id, x => ({ ...x, name: e.target.value }))} />
            <span className="count">{p.colors.length}</span>
            <button type="button" className="rb sm flat" data-sound="poof" aria-label={`Remove palette ${p.name}`} title="Remove palette"
              onClick={() => onChange(palettes.filter(x => x.id !== p.id), `palette “${p.name}”`)}>
              <Trash2 size={19} />
            </button>
            <button type="button" className="rb sm flat" aria-label={`Fold ${p.name}`} title="Fold" aria-expanded="true" onClick={() => setFolded(true)}>
              <ChevronUp size={19} />
            </button>
          </div>
          {p.colors.filter(c => c.id === selectedColorId).map(c => (
            <div className="edit-box" key={c.id}>
              <label className="drop big" style={{ backgroundColor: c.hex }} title="Pick color">
                <input type="color" aria-label={`${c.name} color`} value={c.hex}
                  onChange={e => updateColor(p.id, c.id, { hex: e.target.value })} />
              </label>
              <input className="field" aria-label="Color name" value={c.name}
                onChange={e => updateColor(p.id, c.id, { name: e.target.value })} />
              <HexField key={c.id} hex={c.hex} onCommit={hex => updateColor(p.id, c.id, { hex })} />
              <button type="button" className="rb sm flat" data-sound="poof" aria-label={`Remove ${c.name}`} title="Remove color" onClick={() => removeColor(p, c)}>
                <X size={19} />
              </button>
            </div>
          ))}
          <div className="drops" role="radiogroup" aria-label={`${p.name} colors`}>
            {p.colors.map(c => (
              <button key={c.id} type="button" className="drop" role="radio" aria-checked={c.id === selectedColorId}
                aria-label={c.name} title={`${c.name} ${c.hex}`} style={{ backgroundColor: c.hex }} onClick={() => onSelectColor(c.id)} />
            ))}
            <button type="button" className="drop add" aria-label={`Add color to ${p.name}`} title="Add color" onClick={() => {
              const c = makeColor(`color${p.colors.length + 1}`, '#4a90c2');
              updatePalette(p.id, x => ({ ...x, colors: [...x.colors, c] }));
              onSelectColor(c.id);
            }}><Plus size={16} /></button>
          </div>
        </div>
      ) : (
        <button type="button" className="palette folded" key={p.id} aria-expanded="false" onClick={() => unfold(p)}>
          <span className="palette-head">
            <span className="pname">{p.name}</span>
            <span className="count">{p.colors.length}</span>
            <ChevronDown size={19} />
          </span>
          <span className="strip" aria-hidden="true">
            {p.colors.map(c => <span key={c.id} style={{ background: c.hex }} />)}
          </span>
        </button>
      ))}
      <p className="hint">Names become file names. Saved in this browser.</p>
    </div>
  );
}
