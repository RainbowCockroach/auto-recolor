import { useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { BitmapCanvas } from './BitmapCanvas';
import { Segmented } from './Controls';
import { FIT, MAX_SCALE, PIXEL_ZOOM, ZoomStage, zoomAt, type View } from './ZoomStage';

export type Side = 'original' | 'result';

interface Props {
  side: Side;
  original: ImageBitmap | undefined;
  result: ImageBitmap | undefined;
  pixelated: boolean;
  onSide: (s: Side) => void;
  onClose: () => void;
}

/** Full-screen view of one preview image, with zoom, pan and pinch. */
export function ImageViewer({ side, original, result, pixelated, onSide, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState<View>(FIT);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog ref={ref} className="viewer" aria-label="Image viewer" onClose={onClose}>
      <div className="viewer-bar">
        <Segmented name="viewer-side" label="Show" value={side} onChange={onSide}
          options={[{ value: 'original', label: 'Original' }, { value: 'result', label: 'Result' }]} />
        <span className="spacer" />
        <button type="button" className="icon-btn" aria-label="Zoom out" title="Zoom out" disabled={view.scale <= 1}
          onClick={() => setView(zoomAt(view, view.scale / 2))}><ZoomOut size={16} /></button>
        <button type="button" className="zoom-level mono" aria-label="Fit to screen" title="Fit to screen" disabled={view.scale === 1}
          onClick={() => setView(FIT)}>{Math.round(view.scale * 100)}%</button>
        <button type="button" className="icon-btn" aria-label="Zoom in" title="Zoom in" disabled={view.scale >= MAX_SCALE}
          onClick={() => setView(zoomAt(view, view.scale * 2))}><ZoomIn size={16} /></button>
        <button type="button" className="icon-btn" aria-label="Close" title="Close" onClick={() => ref.current?.close()}><X size={16} /></button>
      </div>
      <ZoomStage view={view} onView={setView}
        overlay={side === 'result' && !result && <span className="working">Recoloring…</span>}>
        <BitmapCanvas bitmap={side === 'original' ? original : result} pixelated={pixelated || view.scale >= PIXEL_ZOOM} />
      </ZoomStage>
    </dialog>
  );
}
