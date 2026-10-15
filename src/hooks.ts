import { useEffect, useRef, useState } from 'react';
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

/** Full-size recolor of the selected image and color, plus its mask view (what gets recolored). */
export function usePreview(image: LoadedImage | null, color: PaletteColor | null, settings: Settings) {
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
    return () => { stale = true; };
  }, [id, hue, hex, settings]);

  // the mask doesn't depend on the target color, so flipping through colors doesn't redo it
  useEffect(() => {
    if (!id || hue === undefined) return;
    let stale = false;
    pool.run(id, api => api.maskView(id, hue, settings), { priority: PRIORITY.preview, isStale: () => stale })
      .then(mask => { if (!stale) setState(prev => ({ ...(prev?.imageId === id ? prev : {}), imageId: id, mask })); }, reportUnexpected);
    return () => { stale = true; };
  }, [id, hue, settings]);

  // replaced bitmaps are freed now instead of whenever garbage collection gets to them
  const last = useRef<PreviewState | null>(null);
  useEffect(() => {
    const old = last.current;
    last.current = state;
    for (const b of [old?.result, old?.mask]) if (b && b !== state?.result && b !== state?.mask) b.close();
  }, [state]);

  return state?.imageId === id ? state : null;
}

export const thumbKey = (imageId: string, colorId: string) => `${imageId}:${colorId}`;

/**
 * Thumbnails for every image × color, made only while `visible`. The selected image goes first.
 * Old thumbnails stay on screen until their replacement is ready, so dragging a dial doesn't flicker.
 */
export function useThumbs(images: LoadedImage[], palettes: Palette[], settings: Settings, selectedId: string | null, visible: boolean) {
  const [thumbs, setThumbs] = useState<ReadonlyMap<string, ImageBitmap>>(new Map());
  // every thumbnail made so far, with what it was made from, so up-to-date ones aren't redone
  const made = useRef(new Map<string, { bitmap: ImageBitmap; from: string }>());
  const frame = useRef(0);
  // only what changes the pixels: not palette or color names
  const imagesKey = images.map(i => `${i.id}@${i.hue}`).join();
  const colorsKey = palettes.flatMap(p => p.colors.map(c => `${c.id}=${c.hex}`)).join();
  const settingsKey = JSON.stringify(settings);

  useEffect(() => {
    if (!visible) return;
    let stale = false;
    const store = made.current;
    // one re-render per frame, however many thumbnails land in it
    const show = () => {
      frame.current ||= requestAnimationFrame(() => {
        frame.current = 0;
        setThumbs(new Map([...store].map(([k, t]) => [k, t.bitmap])));
      });
    };
    const jobs = imagesKey ? imagesKey.split(',').map(s => s.split('@') as [string, string]) : [];
    const colors = colorsKey ? colorsKey.split(',').map(s => s.split('=') as [string, string]) : [];
    const wanted = new Set(jobs.flatMap(([id]) => colors.map(([cid]) => thumbKey(id, cid))));
    for (const [key, t] of store) {
      if (!wanted.has(key)) { t.bitmap.close(); store.delete(key); show(); }
    }

    // wait for a pause, so dragging a dial doesn't queue a full set of thumbnails per step
    const timer = setTimeout(() => {
      const s = JSON.parse(settingsKey) as Settings;
      for (const [id, hueText] of jobs) {
        for (const [colorId, hex] of colors) {
          const key = thumbKey(id, colorId), from = `${hueText}|${hex}|${settingsKey}`;
          if (store.get(key)?.from === from) continue;
          renderVariant({ id, hue: Number(hueText), settings: s, hex, want: { thumb: true } }, {
            priority: id === selectedId ? PRIORITY.thumbSelected : PRIORITY.thumb,
            isStale: () => stale,
          }).then(r => {
            const bitmap = r.thumb!;
            if (stale) { bitmap.close(); return; }
            store.get(key)?.bitmap.close();
            store.set(key, { bitmap, from });
            show();
          }, reportUnexpected);
        }
      }
    }, 150);
    return () => { stale = true; clearTimeout(timer); };
    // selectedId only reorders work, it shouldn't restart it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, imagesKey, colorsKey, settingsKey]);

  return thumbs;
}
