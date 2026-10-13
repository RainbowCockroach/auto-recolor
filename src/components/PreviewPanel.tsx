import { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { hueName, oklchToHex } from '../engine/color';
import type { Settings } from '../engine/types';
import type { PreviewState } from '../hooks';
import type { LoadedImage } from '../images';
import type { OutputFile } from '../model';
import { BitmapCanvas } from './BitmapCanvas';
import { Segmented } from './Controls';
import { ImageViewer, type Side } from './ImageViewer';

export type Background = 'checker' | 'light' | 'dark';

interface Props {
  image: LoadedImage | null;
  target: OutputFile | null;
  preview: PreviewState | null;
  settings: Settings;
  showMask: boolean;
  background: Background;
  note: string;
  onShowMask: (v: boolean) => void;
  onBackground: (v: Background) => void;
  onPick: (x: number, y: number) => void;
  onResetPick: () => void;
}

/** Sprites smaller than this are drawn with hard pixel edges when scaled up. */
const PIXEL_ART_SIDE = 200;

export function PreviewPanel({ image, target, preview, settings, showMask, background, note, onShowMask, onBackground, onPick, onResetPick }: Props) {
  const pixelated = !!image && Math.max(image.width, image.height) < PIXEL_ART_SIDE;
  const stats = preview?.stats;
  // Tied to the image it was opened for, so it doesn't reopen when another image is picked.
  const [viewing, setViewing] = useState<{ id: string; side: Side } | null>(null);
  const viewSide = image && viewing?.id === image.id ? viewing.side : null;
  const open = (side: Side) => { if (image) setViewing({ id: image.id, side }); };
  const original = image ? (showMask ? preview?.mask ?? image.full : image.full) : undefined;
  const expand = (side: Side) => (
    <button type="button" className="icon-btn expand" aria-label="View big" title="View big" onClick={() => open(side)}>
      <Maximize2 size={16} />
    </button>
  );

  return (
    <section className="block" aria-labelledby="preview-title">
      <div className="block-head wrap">
        <h2 id="preview-title">Preview</h2>
        {target && (
          <span className="target-tag">
            <span className="dot" style={{ background: target.color.hex }} />
            {target.palette.name} / {target.color.name} · {target.color.hex}
          </span>
        )}
        <span className="spacer" />
        <Segmented name="bg" label="Preview background" value={background} onChange={onBackground}
          options={[{ value: 'checker', label: 'Checker' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
        <label className="check">
          <input type="checkbox" checked={showMask} onChange={e => onShowMask(e.target.checked)} /> Show what gets recolored
        </label>
      </div>

      {!image ? (
        <div className="empty">
          <strong>Add a few PNGs to start</strong>
          <span>Drop them on the page or use “Add PNGs…”. Every image gets recolored with every color in your palettes.</span>
        </div>
      ) : (
        <div className="bench">
          <figure className="panel">
            <div className="stage">
              <BitmapCanvas bitmap={original} pixelated={pixelated}
                title="Click to choose the color to replace" onPick={onPick} />
              {expand('original')}
            </div>
            <figcaption>
              <span className="cap">Original · click to choose the color to replace</span>
              <span className="main-info">
                {image.autoHue === null && image.pickedHue === null ? (
                  <span>No clear main color found. Click the image to choose one, or switch to Whole image.</span>
                ) : (
                  <>
                    <span className="dot" style={{ background: stats ? oklchToHex({ l: stats.meanL, c: stats.meanC, h: image.hue }) : 'transparent' }} />
                    <span>
                      {settings.scope === 'whole'
                        ? `Whole image · main color ${hueName(image.hue)}`
                        : `Main color: ${hueName(image.hue)} (hue ${Math.round(image.hue)}°)`}
                      {stats && settings.scope === 'main' && ` · ${Math.round(stats.coverage * 100)}% of the image`}
                      {image.pickedHue !== null ? ' · picked by you' : ' · auto-detected'}
                    </span>
                  </>
                )}
                {image.pickedHue !== null && <button type="button" className="linkish" onClick={onResetPick}>Back to auto-detect</button>}
              </span>
              <span className="note" role="status">{note}</span>
            </figcaption>
          </figure>
          <figure className="panel">
            <div className="stage openable" title="View big" onClick={() => open('result')}>
              <BitmapCanvas bitmap={preview?.result} pixelated={pixelated} />
              {!preview?.result && <span className="working">Recoloring…</span>}
              {expand('result')}
            </div>
            <figcaption>
              <span className="cap">
                {target ? `${settings.mode === 'natural' ? 'Natural' : 'Stylized'} · ${image.folder}/${target.file}` : 'Add a color to a palette to see a result.'}
              </span>
            </figcaption>
          </figure>
        </div>
      )}
      {viewSide && (
        <ImageViewer side={viewSide} original={original} result={preview?.result} pixelated={pixelated}
          onSide={open} onClose={() => setViewing(null)} />
      )}
    </section>
  );
}
