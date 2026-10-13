import { useState } from 'react';
import { Contrast, Eye, ImagePlus, Maximize2, Pipette } from 'lucide-react';
import type { PreviewState } from '../hooks';
import type { LoadedImage } from '../images';
import type { OutputFile } from '../model';
import { BitmapCanvas } from './BitmapCanvas';
import { ImageViewer, type Side } from './ImageViewer';

export type Background = 'checker' | 'light' | 'dark';

const NEXT_BG: Record<Background, Background> = { checker: 'light', light: 'dark', dark: 'checker' };

interface Props {
  image: LoadedImage | null;
  target: OutputFile | null;
  preview: PreviewState | null;
  showMask: boolean;
  background: Background;
  onShowMask: (v: boolean) => void;
  onBackground: (v: Background) => void;
  onPick: (x: number, y: number) => void;
  onAddClick: () => void;
  /** Quick image switcher inside the picture; only passed on phones, where the image list sits in the drawer. */
  images?: LoadedImage[];
  onSelectImage?: (id: string) => void;
}

/** Sprites smaller than this are drawn with hard pixel edges when scaled up. */
const PIXEL_ART_SIDE = 200;

export function PreviewPanel({ image, target, preview, showMask, background, onShowMask, onBackground, onPick, onAddClick, images = [], onSelectImage }: Props) {
  const pixelated = !!image && Math.max(image.width, image.height) < PIXEL_ART_SIDE;
  // Both tied to the image they were started for, so they end when another image is picked.
  const [viewing, setViewing] = useState<{ id: string; side: Side } | null>(null);
  const [pickingId, setPickingId] = useState<string | null>(null);
  const viewSide = image && viewing?.id === image.id ? viewing.side : null;
  const picking = !!image && pickingId === image.id;
  const open = (side: Side) => { if (image) setViewing({ id: image.id, side }); };
  const original = image ? (showMask ? preview?.mask ?? image.full : image.full) : undefined;
  const shown = showMask ? preview?.mask : preview?.result;

  return (
    <section className="card stage-card" aria-label="Preview">
      <div className="well stage" data-bg={background}>
        {!image ? (
          <button type="button" className="empty" onClick={onAddClick}>
            <span className="rb"><ImagePlus size={22} /></span>
            <strong>Add PNGs</strong>
            <span>or drop them anywhere</span>
          </button>
        ) : picking ? (
          <BitmapCanvas bitmap={original} pixelated={pixelated} title="Tap the color to replace"
            onPick={(x, y) => { onPick(x, y); setPickingId(null); }} />
        ) : (
          <div className="stage-open" onClick={() => open('result')}>
            <BitmapCanvas bitmap={shown} pixelated={pixelated} />
          </div>
        )}
        {image && !picking && !shown && <span className="working">Recoloring…</span>}
        {picking && <span className="chip">Tap the color to replace</span>}

        {image && (
          <>
            <button type="button" className="orig-bub" aria-pressed={picking}
              aria-label="Pick the color to replace" title="Pick the color to replace"
              onClick={() => setPickingId(picking ? null : image.id)}>
              <BitmapCanvas bitmap={image.thumb} pixelated={pixelated} />
              <span className="badge"><Pipette size={14} /></span>
            </button>
            <div className="stage-tools">
              <button type="button" className="rb sm" aria-label={`Background: ${background}`} title={`Background: ${background}`}
                onClick={() => onBackground(NEXT_BG[background])}>
                <Contrast size={19} />
              </button>
              <button type="button" className="rb sm" aria-pressed={showMask} aria-label="Show what gets recolored" title="Show what gets recolored"
                onClick={() => onShowMask(!showMask)}>
                <Eye size={19} />
              </button>
            </div>
            {images.length > 1 && (
              <div className="stage-imgs" aria-label="Images">
                {images.map(img => (
                  <button key={img.id} type="button" className="mini-bub" aria-current={img.id === image.id}
                    aria-label={img.name} title={img.name} onClick={() => onSelectImage?.(img.id)}>
                    <BitmapCanvas bitmap={img.thumb} pixelated={Math.max(img.width, img.height) < PIXEL_ART_SIDE} />
                  </button>
                ))}
              </div>
            )}
            <button type="button" className="rb sm stage-big" aria-label="View big" title="View big" onClick={() => open(picking ? 'original' : 'result')}>
              <Maximize2 size={19} />
            </button>
          </>
        )}
      </div>
      {image && viewSide && (
        <ImageViewer side={viewSide} original={original} result={preview?.result} pixelated={pixelated}
          captions={{ original: image.name, result: target ? `${target.palette.name} · ${target.color.name}` : '' }}
          onSide={side => setViewing({ id: image.id, side })} onClose={() => setViewing(null)} />
      )}
    </section>
  );
}
