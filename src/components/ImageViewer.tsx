import { useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { BitmapCanvas } from './BitmapCanvas';
import { Pill } from './Controls';
import { FIT, MAX_SCALE, PIXEL_ZOOM, ZoomStage, zoomAt, type View } from './ZoomStage';
import { play } from '../sound';

export type Side = 'original' | 'result';

interface Props {
  side: Side;
  original: ImageBitmap | undefined;
  result: ImageBitmap | undefined;
  pixelated: boolean;
  /** Shown next to the switch, per side. */
  captions: Record<Side, string>;
  onSide: (s: Side) => void;
  onClose: () => void;
}

const coarsePointer = () => window.matchMedia('(pointer: coarse)').matches;

/** Full-screen view of one preview image, with zoom, pan and pinch. */
export function ImageViewer({ side, original, result, pixelated, captions, onSide, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState<View>(FIT);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) { d.showModal(); play('open'); }
  }, []);

  return (
    <dialog ref={ref} className="viewer" aria-label="Image viewer" onClose={onClose}>
      <ZoomStage view={view} onView={setView}
        overlay={side === 'result' && !result && <span className="working">Recoloring…</span>}>
        <BitmapCanvas bitmap={side === 'original' ? original : result} pixelated={pixelated || view.scale >= PIXEL_ZOOM} />
      </ZoomStage>
      <div className="float viewer-top">
        <Pill label="Show" value={side} onChange={onSide}
          options={[{ value: 'original', label: 'Original' }, { value: 'result', label: 'Result' }]} />
        <span className="viewer-caption">{captions[side]}</span>
        <button type="button" className="rb" data-sound="close" aria-label="Close" title="Close" onClick={() => { ref.current?.close(); onClose(); }}><X size={22} /></button>
      </div>
      <p className="viewer-hint">{view.scale > 1 ? 'Drag to look around' : coarsePointer() ? 'Pinch to zoom' : 'Scroll to zoom'}</p>
      <div className="float viewer-zoom">
        <button type="button" className="rb" aria-label="Zoom out" title="Zoom out" disabled={view.scale <= 1}
          onClick={() => setView(zoomAt(view, view.scale / 2))}><ZoomOut size={22} /></button>
        <button type="button" className="zoom-level" aria-label="Fit to screen" title="Fit to screen" disabled={view.scale === 1}
          onClick={() => setView(FIT)}>{Math.round(view.scale * 100)}%</button>
        <button type="button" className="rb" aria-label="Zoom in" title="Zoom in" disabled={view.scale >= MAX_SCALE}
          onClick={() => setView(zoomAt(view, view.scale * 2))}><ZoomIn size={22} /></button>
      </div>
    </dialog>
  );
}
