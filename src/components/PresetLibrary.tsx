import { useEffect, useRef, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { PRESETS, type Preset, type PresetUse } from '../presets';
import { Pill } from './Controls';

interface Props {
  open: boolean;
  addedIds: ReadonlySet<string>;
  onAdd: (preset: Preset) => void;
  onClose: () => void;
}

type Filter = 'all' | PresetUse;

export function PresetLibrary({ open, addedIds, onAdd, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const shown = PRESETS.filter(p => filter === 'all' || p.uses.includes(filter));

  return (
    <dialog ref={ref} className="library" onClose={onClose} aria-labelledby="library-title"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="library-inner">
        <div className="library-head">
          <h2 id="library-title">Palette library</h2>
          <button type="button" className="rb sm" aria-label="Close library" title="Close" onClick={onClose}><X size={19} /></button>
        </div>
        <Pill label="Show" value={filter} onChange={setFilter}
          options={[{ value: 'all', label: 'All' }, { value: 'hair', label: 'Hair' }, { value: 'furniture', label: 'Furniture' }]} />
        <p className="hint">Ready-made palettes from the Sims 4 recolor community. Adding one copies it into your palettes.</p>
        <ul className="presets">
          {shown.map(p => {
            const added = addedIds.has(p.id);
            return (
              <li key={p.id} className="preset">
                <div className="preset-head">
                  <strong>{p.title}</strong>
                  <span className="count">{p.colors.length}</span>
                  <span className="spacer" />
                  <button type="button" className={`rb sm${added ? ' flat' : ' honey'}`} disabled={added}
                    aria-label={added ? `${p.title} added` : `Add ${p.title}`} title={added ? 'Added' : 'Add'} onClick={() => onAdd(p)}>
                    {added ? <Check size={19} /> : <Plus size={19} />}
                  </button>
                </div>
                <div className="strip" aria-hidden="true">
                  {p.colors.map(([name, hex]) => <span key={name} style={{ background: hex }} title={`${name} ${hex}`} />)}
                </div>
                <p className="preset-desc">{p.description}</p>
                <p className="credit">Palette by <a href={p.credit.url} target="_blank" rel="noreferrer">{p.credit.by}</a></p>
              </li>
            );
          })}
        </ul>
      </div>
    </dialog>
  );
}
