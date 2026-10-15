import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { SHORTCUTS } from '../keys';
import { play } from '../sound';

/** The list of keyboard shortcuts, opened with "?". */
export function KeysSheet({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) { d.showModal(); play('open'); }
  }, []);

  return (
    <dialog ref={ref} className="keys card" aria-label="Keyboard shortcuts" onClose={onClose}
      onClick={e => { if (e.target === e.currentTarget) ref.current?.close(); }}
      onKeyDown={e => { if (e.key === '?') ref.current?.close(); }}>
      <button type="button" className="rb sm keys-close" data-sound="close" aria-label="Close" title="Close" onClick={() => ref.current?.close()}><X size={19} /></button>
      {SHORTCUTS.map(g => (
        <section key={g.group}>
          <h2>{g.group}</h2>
          <dl>
            {g.items.map(s => (
              <div key={s.label}>
                <dt>{s.keys.map(k => <kbd key={k}>{k}</kbd>)}</dt>
                <dd>{s.label}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </dialog>
  );
}
