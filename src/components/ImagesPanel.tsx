import { useRef } from 'react';
import { Plus, X } from 'lucide-react';
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
  const input = useRef<HTMLInputElement>(null);
  return (
    <ul className="bubbles" aria-label="Images">
      {images.map(img => (
        <li key={img.id}>
          <button type="button" className="bub" aria-current={img.id === selectedId}
            aria-label={img.name} title={`${img.name} · ${img.width}×${img.height}${img.depth === 16 ? ' · 16-bit' : ''}`}
            onClick={() => onSelect(img.id)}>
            <BitmapCanvas bitmap={img.thumb} pixelated={Math.max(img.width, img.height) < 200} />
          </button>
          {img.id === selectedId && (
            <button type="button" className="rb xs bub-x" aria-label={`Remove ${img.name}`} title="Remove" onClick={() => onRemove(img.id)}>
              <X size={14} />
            </button>
          )}
        </li>
      ))}
      <li>
        <button type="button" className="bub add" aria-label="Add PNGs" title="Add PNGs" onClick={() => input.current?.click()}>
          <Plus size={22} />
        </button>
        <input ref={input} type="file" accept="image/png" multiple hidden
          onChange={e => { if (e.target.files?.length) onAdd(e.target.files); e.target.value = ''; }} />
      </li>
    </ul>
  );
}
