import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';

export interface DrawerTab<T extends string> {
  id: T;
  label: string;
  icon: ReactNode;
  content: ReactNode;
  /** Opens taller on phones, for long content like the palette editor. */
  tall?: boolean;
}

interface Props<T extends string> {
  tabs: DrawerTab<T>[];
  /** Wide screens show it as a side panel that is always open. */
  wide: boolean;
  initial: T;
  /** Slid out of view (phones), keeping its tab and open state for when it comes back. */
  away?: boolean;
}

/** Closed, only a thin strip with the grab handle peeks out. */
const PEEK = 32;

const useViewportHeight = () => {
  const [h, setH] = useState(() => window.innerHeight);
  useEffect(() => {
    const resize = () => setH(window.innerHeight);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  return h;
};

/** Phone: a sheet pulled up from the bottom. Wide screens: a tabbed side panel. */
export function Drawer<T extends string>({ tabs, wide, initial, away }: Props<T>) {
  const [tabId, setTabId] = useState<T>(initial);
  const [open, setOpen] = useState(false);
  const [dragH, setDragH] = useState<number | null>(null);
  const drag = useRef<{ y: number; h: number; now: number; moved: boolean } | null>(null);
  // A drag ends with a click on whatever is under the finger; swallow it.
  const dragged = useRef(false);
  const vh = useViewportHeight();

  const tab = tabs.find(t => t.id === tabId) ?? tabs[0]!;
  const openH = Math.round(tab.tall ? Math.min(640, vh * 0.78) : Math.min(520, vh * 0.64));
  const height = dragH ?? (open ? openH : PEEK);
  const isOpen = wide || open;

  const pick = (id: T) => {
    if (wide) setTabId(id);
    else if (open && id === tabId) setOpen(false);
    else { setTabId(id); setOpen(true); }
  };

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (wide || (e.pointerType === 'mouse' && e.button !== 0)) return;
    dragged.current = false;
    drag.current = { y: e.clientY, h: height, now: height, moved: false };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dy = d.y - e.clientY;
    if (!d.moved && Math.abs(dy) < 6) return;
    if (!d.moved) {
      d.moved = true;
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
    }
    d.now = Math.max(PEEK, Math.min(vh - 60, d.h + dy));
    setDragH(d.now);
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    dragged.current = true;
    setOpen(d.now > (PEEK + openH) / 2);
    setDragH(null);
  };

  return (
    <section className={`drawer${wide ? ' wide' : ''}${dragH !== null ? ' dragging' : ''}${!isOpen && dragH === null ? ' shut' : ''}${away && !wide ? ' away' : ''}`} aria-label="Settings" inert={away && !wide}
      style={wide ? undefined : { height: `calc(${height}px + env(safe-area-inset-bottom))` }}>
      <div className="drawer-head" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        onClickCapture={e => { if (dragged.current) { e.stopPropagation(); dragged.current = false; } }}>
        {!wide && (
          <button type="button" className="handle" aria-expanded={open} aria-label={open ? 'Close settings' : 'Open settings'}
            onClick={() => setOpen(!open)}>
            <span />
          </button>
        )}
        {(isOpen || dragH !== null) && <nav className="drawer-tabs" aria-label="Sections">
          {tabs.map(t => {
            const on = isOpen && t.id === tab.id;
            return (
              <button key={t.id} type="button" className={`tab${on ? ' on' : ''}`} aria-current={on ? 'page' : undefined} onClick={() => pick(t.id)}>
                <span className={`rb sm${on ? ' honey' : ''}`}>{t.icon}</span>{t.label}
              </button>
            );
          })}
        </nav>}
      </div>
      <div className="drawer-body" hidden={!isOpen && dragH === null}>{tab.content}</div>
    </section>
  );
}
