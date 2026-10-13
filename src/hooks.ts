import { useEffect, useState } from 'react';
import type { Settings, Stats } from './engine/types';
import type { LoadedImage } from './images';
import type { Palette, PaletteColor } from './model';
import { PRIORITY, isCancelled, pool, renderVariant } from './worker/pool';

const reportUnexpected = (e: unknown) => { if (!isCancelled(e)) console.error(e); };

/** State that survives reloads (in this browser only). Broken or missing data falls back to `initial`. */
export function usePersistentState<T>(key: string, read: (raw: unknown) => T | null, initial: () => T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return read(JSON.parse(raw)) ?? initial();
    } catch { /* private mode or corrupt data */ }
    return initial();
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ }
  }, [key, value]);
  return [value, setValue] as const;
}

export interface PreviewState {
  imageId: string;
  result?: ImageBitmap;
  mask?: ImageBitmap;
  stats?: Stats;
}

/** Full-size recolor of the selected image and color, plus its mask view when asked for. */
export function usePreview(image: LoadedImage | null, color: PaletteColor | null, settings: Settings, showMask: boolean) {
  const [state, setState] = useState<PreviewState | null>(null);
  const id = image?.id, hue = image?.hue, hex = color?.hex;

  useEffect(() => {
    if (!id || hue === undefined || !hex) return;
    let stale = false;
    const opts = { priority: PRIORITY.preview, isStale: () => stale };
    const update = (patch: Partial<PreviewState>) => {
      if (!stale) setState(prev => ({ ...(prev?.imageId === id ? prev : {}), imageId: id, ...patch }));
    };
    pool.run(id, api => api.stats(id, hue, settings), opts).then(stats => update({ stats }), reportUnexpected);
    renderVariant({ id, hue, settings, hex, want: { full: true } }, opts)
      .then(r => update({ result: r.full }), reportUnexpected);
    if (showMask) pool.run(id, api => api.maskView(id, hue, settings), opts).then(mask => update({ mask }), reportUnexpected);
    return () => { stale = true; };
  }, [id, hue, hex, settings, showMask]);

  return state?.imageId === id ? state : null;
}

export const thumbKey = (imageId: string, colorId: string) => `${imageId}:${colorId}`;

/**
 * Thumbnails for every image × color. The selected image goes first. Old thumbnails stay on screen
 * until their replacement is ready, so dragging a slider doesn't flicker.
 */
export function useThumbs(images: LoadedImage[], palettes: Palette[], settings: Settings, selectedId: string | null) {
  const [thumbs, setThumbs] = useState<ReadonlyMap<string, ImageBitmap>>(new Map());
  // only what changes the pixels: not palette or color names
  const imagesKey = images.map(i => `${i.id}@${i.hue}`).join();
  const colorsKey = palettes.flatMap(p => p.colors.map(c => `${c.id}=${c.hex}`)).join();

  useEffect(() => {
    let stale = false;
    const jobs = imagesKey ? imagesKey.split(',').map(s => s.split('@') as [string, string]) : [];
    const colors = colorsKey ? colorsKey.split(',').map(s => s.split('=') as [string, string]) : [];
    // thumbnails of removed images or colors are dropped as new ones arrive
    const wanted = new Set(jobs.flatMap(([id]) => colors.map(([cid]) => thumbKey(id, cid))));
    const keepWanted = (prev: ReadonlyMap<string, ImageBitmap>) => new Map([...prev].filter(([k]) => wanted.has(k)));

    for (const [id, hueText] of jobs) {
      const hue = Number(hueText);
      for (const [colorId, hex] of colors) {
        renderVariant({ id, hue, settings, hex, want: { thumb: true } }, {
          priority: id === selectedId ? PRIORITY.thumbSelected : PRIORITY.thumb,
          isStale: () => stale,
        }).then(r => {
          if (!stale) setThumbs(prev => keepWanted(prev).set(thumbKey(id, colorId), r.thumb!));
        }, reportUnexpected);
      }
    }
    return () => { stale = true; };
    // selectedId only reorders work, it shouldn't restart it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagesKey, colorsKey, settings]);

  return thumbs;
}
