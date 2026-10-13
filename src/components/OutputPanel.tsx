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

  return (
    <section className="block" aria-labelledby="output-title">
      <div className="block-head wrap">
        <h2 id="output-title">Output</h2>
        <span className="hint">
          {images.length && perImage
            ? `${plural(images.length, 'image')} × ${plural(perImage, 'color')} = ${plural(images.length * perImage, 'file')}`
            : 'Recolored files show up here.'}
        </span>
      </div>
      <div className="sheet">
        {images.map(img => (
          <div className="sheet-group" key={img.id}>
            <h3>{img.folder}/</h3>
            <div className="cards">
              {outputsFor(img.folder, palettes).map(out => (
                <button type="button" key={out.color.id} className="card"
                  aria-current={img.id === selectedImageId && out.color.id === selectedColorId}
                  onClick={() => onSelect(img.id, out.color.id)}>
                  <span className="stage">
                    <BitmapCanvas bitmap={thumbs.get(thumbKey(img.id, out.color.id))} pixelated={Math.max(img.width, img.height) < 200} />
                  </span>
                  <span className="fname">
                    <span className="dot" style={{ background: out.color.hex }} />
                    <span className="mono" title={out.file}>{out.file}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
