import type { LoadedImage } from '../images';
import { BitmapCanvas } from './BitmapCanvas';

interface Props {
  images: LoadedImage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: (files: FileList) => void;
}

export function ImagesPanel({ images, selectedId, onSelect, onRemove, onAdd }: Props) {
  return (
    <section className="block" aria-labelledby="images-title">
      <div className="block-head">
        <h2 id="images-title">Images</h2>
        <label className="btn small" htmlFor="file-input">Add PNGs…</label>
        <input id="file-input" type="file" accept="image/png" multiple hidden
          onChange={e => { if (e.target.files?.length) onAdd(e.target.files); e.target.value = ''; }} />
      </div>
      {images.length > 0 && (
        <ul className="images">
          {images.map(img => (
            <li key={img.id} aria-current={img.id === selectedId}>
              <button type="button" className="image-pick" onClick={() => onSelect(img.id)}>
                <BitmapCanvas bitmap={img.thumb} />
                <span className="iname">{img.name}</span>
                <span className="meta">{img.width}×{img.height}{img.depth === 16 ? ' · 16-bit' : ''}</span>
              </button>
              <button type="button" className="x" aria-label={`Remove ${img.name}`} onClick={() => onRemove(img.id)}>×</button>
            </li>
          ))}
        </ul>
      )}
      <p className="hint">Drop PNG files anywhere on the page.</p>
    </section>
  );
}
