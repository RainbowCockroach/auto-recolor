// Runs all image work off the main thread so sliders stay smooth.
//
// Each image has one owner worker that holds its pixels. The color math, the expensive part,
// only needs the image's table of unique colors, so other workers can borrow a copy of the
// table and compute variants in parallel. The owner then writes the new colors into pixels.
import * as Comlink from 'comlink';
import { buildColorTable, colorMask, computeStats, detectMainHue, GREY_CHROMA, type ColorTable } from '../engine/analyze';
import { decodePng, encodePng, toRgba8 } from '../engine/png';
import { applyColors, maskPreview, recolorColors, type RecoloredColors } from '../engine/recolor';
import type { Raster, Settings, Stats } from '../engine/types';

const THUMB_SIDE = 320;

interface Entry {
  /** Only on the owner worker. */
  raster?: Raster;
  table: ColorTable;
  depth: 8 | 16;
  /** Stats and mask only depend on scope, hue range and hue, so the last set is kept. */
  cache?: { key: string; stats: Stats; mask: Float32Array };
}
const images = new Map<string, Entry>();

/** A copy of an image's color table without the per-pixel part, for other workers. */
export type SharedTable = Omit<ColorTable, 'pixelColor'> & { depth: 8 | 16 };

function entry(id: string): Entry {
  const e = images.get(id);
  if (!e) throw new Error(`Image ${id} is not loaded`);
  return e;
}
function owned(id: string): Entry & { raster: Raster } {
  const e = entry(id);
  if (!e.raster) throw new Error(`Image ${id} is not owned by this worker`);
  return e as Entry & { raster: Raster };
}

function selection(e: Entry, hue: number, s: Settings) {
  const key = `${s.scope}|${s.tolerance}|${hue}`;
  if (e.cache?.key !== key) e.cache = { key, stats: computeStats(e.table, hue, s), mask: colorMask(e.table, hue, s) };
  return e.cache;
}

/** Screen copy of an image, optionally shrunk so its longest side is at most `maxSide`. */
async function bitmap(rgba: Uint8ClampedArray<ArrayBuffer>, width: number, height: number, maxSide?: number): Promise<ImageBitmap> {
  const data = new ImageData(rgba, width, height);
  const scale = maxSide ? Math.min(1, maxSide / Math.max(width, height)) : 1;
  if (scale === 1) return createImageBitmap(data);
  return createImageBitmap(data, {
    resizeWidth: Math.max(1, Math.round(width * scale)),
    resizeHeight: Math.max(1, Math.round(height * scale)),
    resizeQuality: 'high',
  });
}

export interface ProbeResult { ok: boolean; hue?: number; reason?: 'transparent' | 'grey' }
export interface Want { full?: boolean; thumb?: boolean; png?: boolean }

const api = {
  // ---------- owner ----------
  async load(id: string, bytes: ArrayBuffer) {
    const raster = decodePng(new Uint8Array(bytes));
    const table = buildColorTable(raster);
    images.set(id, { raster, table, depth: raster.depth });
    const rgba = toRgba8(raster);
    const [full, thumb] = await Promise.all([
      bitmap(rgba, raster.width, raster.height),
      bitmap(rgba, raster.width, raster.height, THUMB_SIDE),
    ]);
    const result = { width: raster.width, height: raster.height, depth: raster.depth, autoHue: detectMainHue(table), full, thumb };
    return Comlink.transfer(result, [full, thumb]);
  },

  shareTable(id: string): SharedTable {
    const { table: t, depth } = owned(id);
    return { size: t.size, rgb: t.rgb, L: t.L, A: t.A, B: t.B, C: t.C, H: t.H, weight: t.weight, visible: t.visible, depth };
  },

  /** Writes recolored colors into the image and returns what was asked for. */
  async paint(id: string, colors: RecoloredColors, want: Want) {
    const e = owned(id);
    const out = applyColors(e.raster, e.table, colors);
    const transfers: Transferable[] = [];
    const result: { full?: ImageBitmap; thumb?: ImageBitmap; png?: Uint8Array } = {};
    if (want.full || want.thumb) {
      const rgba = toRgba8(out);
      if (want.full) transfers.push((result.full = await bitmap(rgba, out.width, out.height)));
      if (want.thumb) transfers.push((result.thumb = await bitmap(rgba, out.width, out.height, THUMB_SIDE)));
    }
    if (want.png) {
      result.png = encodePng(out);
      transfers.push(result.png.buffer);
    }
    return Comlink.transfer(result, transfers);
  },

  async maskView(id: string, hue: number, settings: Settings) {
    const e = owned(id);
    const view = maskPreview(e.raster, e.table, selection(e, hue, settings).mask);
    const bmp = await bitmap(view, e.raster.width, e.raster.height);
    return Comlink.transfer(bmp, [bmp]);
  },

  /** The color under a pixel, for "click to choose the color to replace". */
  probe(id: string, x: number, y: number): ProbeResult {
    const { raster, table } = owned(id);
    const i = Math.min(raster.height - 1, Math.max(0, y)) * raster.width + Math.min(raster.width - 1, Math.max(0, x));
    const k = table.pixelColor[i]!;
    const max = raster.depth === 16 ? 65535 : 255;
    if (k < 0 || raster.data[i * 4 + 3]! / max < 0.5) return { ok: false, reason: 'transparent' };
    if (table.C[k]! < GREY_CHROMA) return { ok: false, reason: 'grey' };
    return { ok: true, hue: table.H[k]! };
  },

  // ---------- any worker that has the table ----------
  adoptTable(id: string, shared: SharedTable) {
    const { depth, ...table } = shared;
    images.set(id, { table: { ...table, pixelColor: new Int32Array(0) }, depth });
  },

  has(id: string) {
    return images.has(id);
  },

  drop(id: string) {
    images.delete(id);
  },

  stats(id: string, hue: number, settings: Settings): Stats {
    return selection(entry(id), hue, settings).stats;
  },

  /** The expensive part: new colors for every unique color of the image. */
  colors(id: string, hue: number, settings: Settings, hex: string) {
    const e = entry(id);
    const { stats, mask } = selection(e, hue, settings);
    const result = recolorColors(e.table, mask, stats, hex, settings, e.depth);
    return Comlink.transfer(result, [result.changed.buffer, result.rgb.buffer]);
  },
};

export type WorkerApi = typeof api;
Comlink.expose(api);
