import { thumbKey } from '../hooks';
import type { LoadedImage } from '../images';
import { outputsFor, type Palette } from '../model';
import { BitmapCanvas } from './BitmapCanvas';

interface Props {
  images: LoadedImage[];
  palettes: Palette[];
  thumbs: ReadonlyMap<string, ImageBitmap>;
  selectedImageId: string | null;
  selectedColorId: string | null;
  onSelect: (imageId: string, colorId: string) => void;
}

export function OutputPanel({ images, palettes, thumbs, selectedImageId, selectedColorId, onSelect }: Props) {
  const perImage = palettes.reduce((n, p) => n + p.colors.length, 0);
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

  if (!images.length) return <p className="hint">Recolored files show up here.</p>;

  return (
    <div className="results">
      <p className="count">{plural(images.length, 'image')} × {plural(perImage, 'color')} = {plural(images.length * perImage, 'file')}</p>
      {images.map(img => (
        <section key={img.id} className="results-group" aria-label={img.folder}>
          <h3>{img.folder}/</h3>
          <div className="thumbs">
            {outputsFor(img.folder, palettes).map(out => (
              <button type="button" key={out.color.id} className="thumb" title={out.file} aria-label={out.file}
                aria-current={img.id === selectedImageId && out.color.id === selectedColorId}
                onClick={() => onSelect(img.id, out.color.id)}>
                <BitmapCanvas bitmap={thumbs.get(thumbKey(img.id, out.color.id))} pixelated={Math.max(img.width, img.height) < 200} />
                <span className="thumb-dot" style={{ background: out.color.hex }} />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
