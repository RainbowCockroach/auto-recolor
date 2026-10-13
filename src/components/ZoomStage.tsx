import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react';

/** Zoom and pan of a stage; x/y are the content's offset from the stage center, in screen pixels. */
export interface View { scale: number; x: number; y: number }

export const FIT: View = { scale: 1, x: 0, y: 0 };
export const MAX_SCALE = 32;
/** Past this zoom pixels are drawn hard-edged so single pixels can be inspected. */
export const PIXEL_ZOOM = 3;

/** Zooms `view` to `scale`, keeping the point (px, py) — relative to the stage center — in place. */
export function zoomAt(view: View, scale: number, px = 0, py = 0): View {
  const s = Math.min(MAX_SCALE, Math.max(1, scale));
  if (s === 1) return FIT;
  const k = s / view.scale;
  return { scale: s, x: px - (px - view.x) * k, y: py - (py - view.y) * k };
}

interface Props {
  view: View;
  onView: (v: View) => void;
  children: ReactNode;
  /** Drawn on top of the stage, not zoomed. */
  overlay?: ReactNode;
}

/** A preview stage you can zoom (wheel, pinch) and pan (drag). Short clicks still reach the content. */
export function ZoomStage({ view, onView, children, overlay }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const viewRef = useRef(view);
  const onViewRef = useRef(onView);
  useEffect(() => { viewRef.current = view; onViewRef.current = onView; });
  // Several pointer moves can land before a re-render, so track the latest view here too.
  const commit = (v: View) => { viewRef.current = v; onViewRef.current(v); };

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragged = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  // Point relative to the stage center.
  const local = (clientX: number, clientY: number) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: clientX - r.left - r.width / 2, y: clientY - r.top - r.height / 2 };
  };

  const clamp = (v: View): View => {
    const r = ref.current!.getBoundingClientRect();
    const mx = (r.width * v.scale) / 2, my = (r.height * v.scale) / 2;
    return { scale: v.scale, x: Math.min(mx, Math.max(-mx, v.x)), y: Math.min(my, Math.max(-my, v.y)) };
  };

  // React's onWheel is passive, so preventDefault needs a native listener.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      // Trackpad pinch arrives as ctrl+wheel with small deltas.
      const factor = Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.002));
      const p = local(e.clientX, e.clientY);
      commit(clamp(zoomAt(viewRef.current, viewRef.current.scale * factor, p.x, p.y)));
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, []);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) { dragged.current = false; start.current = { x: e.clientX, y: e.clientY }; }
  };

  const move = (e: PointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    if (e.pointerType === 'mouse' && e.buttons === 0) { pointers.current.delete(e.pointerId); return; }
    const pts = [...pointers.current.values()];
    const next = { x: e.clientX, y: e.clientY };

    if (!dragged.current) {
      const s = start.current;
      if (pts.length < 2 && s && Math.hypot(next.x - s.x, next.y - s.y) < 4) return;
      dragged.current = true;
      // Capture only once it's a drag, so plain clicks still land on the canvas.
      for (const id of pointers.current.keys()) e.currentTarget.setPointerCapture(id);
    }
    pointers.current.set(e.pointerId, next);
    const v = viewRef.current;

    if (pts.length >= 2) {
      const other = pts.find(p => p !== prev)!;
      const before = Math.hypot(prev.x - other.x, prev.y - other.y);
      const after = Math.hypot(next.x - other.x, next.y - other.y);
      const mid0 = local((prev.x + other.x) / 2, (prev.y + other.y) / 2);
      const mid1 = local((next.x + other.x) / 2, (next.y + other.y) / 2);
      const z = zoomAt(v, before > 0 ? v.scale * (after / before) : v.scale, mid0.x, mid0.y);
      commit(z.scale === 1 ? FIT : clamp({ ...z, x: z.x + mid1.x - mid0.x, y: z.y + mid1.y - mid0.y }));
    } else if (v.scale > 1) {
      commit(clamp({ ...v, x: v.x + next.x - prev.x, y: v.y + next.y - prev.y }));
    }
  };

  const up = (e: PointerEvent<HTMLDivElement>) => { pointers.current.delete(e.pointerId); };

  return (
    <div ref={ref} className={`stage zoomable${view.scale > 1 ? ' zoomed' : ''}`}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      onClickCapture={e => { if (dragged.current) { e.stopPropagation(); dragged.current = false; } }}>
      <div className="zoom-layer" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>
        {children}
      </div>
      {overlay}
    </div>
  );
}
