import { DEG, hueDistance, normHue, rgbToOklab, smoothstep } from './color';
import type { Raster, Settings, Stats } from './types';

/** Pixels below this OKLCH chroma count as grey: they never decide what the main color is. */
export const GREY_CHROMA = 0.03;
/** Pixels at or below this alpha (out of 1) don't count toward the image's colors. */
const VISIBLE_ALPHA = 0.5;

/**
 * Every distinct RGB value in the image, converted to OKLab once.
 *
 * The recolor result depends only on a pixel's own color, so working on unique colors
 * instead of pixels gives the exact same image with a fraction of the color math.
 */
export interface ColorTable {
  size: number;
  /** Original channel values, 3 per color, at the image's bit depth. */
  rgb: Uint16Array;
  L: Float64Array;
  A: Float64Array;
  B: Float64Array;
  C: Float64Array;
  /** Hue angle in degrees, 0–360. */
  H: Float64Array;
  /** Number of clearly visible pixels with this color. */
  weight: Float64Array;
  /** Total clearly visible pixels. */
  visible: number;
  /** For each pixel, the index of its color, or -1 when fully transparent. */
  pixelColor: Int32Array;
}

export function buildColorTable(raster: Raster): ColorTable {
  const { data, width, height, depth } = raster;
  const max = depth === 16 ? 65535 : 255;
  const n = width * height;
  const pixelColor = new Int32Array(n);
  const index = new Map<number, number>();
  const rgbList: number[] = [];
  const weightList: number[] = [];
  let visible = 0;

  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const alpha = data[o + 3] ?? 0;
    if (alpha === 0) { pixelColor[i] = -1; continue; }
    const r = data[o] ?? 0, g = data[o + 1] ?? 0, b = data[o + 2] ?? 0;
    const key = (r * 65536 + g) * 65536 + b; // fits in 48 bits, safe as a JS number
    let k = index.get(key);
    if (k === undefined) {
      k = weightList.length;
      index.set(key, k);
      rgbList.push(r, g, b);
      weightList.push(0);
    }
    pixelColor[i] = k;
    if (alpha / max > VISIBLE_ALPHA) { weightList[k]! += 1; visible++; }
  }

  const size = weightList.length;
  const L = new Float64Array(size), A = new Float64Array(size), B = new Float64Array(size);
  const C = new Float64Array(size), H = new Float64Array(size);
  for (let k = 0; k < size; k++) {
    const lab = rgbToOklab({ mode: 'rgb', r: rgbList[k * 3]! / max, g: rgbList[k * 3 + 1]! / max, b: rgbList[k * 3 + 2]! / max });
    L[k] = lab.l; A[k] = lab.a; B[k] = lab.b;
    C[k] = Math.hypot(lab.a, lab.b);
    H[k] = normHue(Math.atan2(lab.b, lab.a) / DEG);
  }
  return { size, rgb: Uint16Array.from(rgbList), L, A, B, C, H, weight: Float64Array.from(weightList), visible, pixelColor };
}

/**
 * The main color is the peak of a hue histogram over visible, colorful pixels, weighted by chroma
 * so vivid areas count more than dull ones. Returns null when the image has no real color.
 */
export function detectMainHue(t: ColorTable): number | null {
  const bins = new Float64Array(72); // 5° each
  for (let k = 0; k < t.size; k++) {
    if (t.weight[k]! > 0 && t.C[k]! > GREY_CHROMA) bins[Math.floor(t.H[k]! / 5) % 72]! += t.weight[k]! * t.C[k]!;
  }
  let peak = 0, best = 0;
  for (let i = 0; i < 72; i++) {
    const v = bins[(i + 71) % 72]! + 2 * bins[i]! + bins[(i + 1) % 72]!;
    if (v > best) { best = v; peak = i; }
  }
  if (best === 0) return null;
  // refine to a weighted circular mean around the peak
  const center = peak * 5 + 2.5;
  let sx = 0, sy = 0;
  for (let k = 0; k < t.size; k++) {
    if (t.weight[k]! > 0 && t.C[k]! > GREY_CHROMA && hueDistance(t.H[k]!, center) < 20) {
      const w = t.weight[k]! * t.C[k]!;
      sx += w * Math.cos(t.H[k]! * DEG);
      sy += w * Math.sin(t.H[k]! * DEG);
    }
  }
  return normHue(Math.atan2(sy, sx) / DEG);
}

const inBand = (t: ColorTable, k: number, hue: number, s: Settings) =>
  s.scope === 'whole' || (t.C[k]! > GREY_CHROMA && hueDistance(t.H[k]!, hue) <= s.tolerance);

export function computeStats(t: ColorTable, hue: number, s: Settings): Stats {
  const picked: number[] = [];
  let total = 0, sumL = 0, sumC = 0, colorful = 0;
  for (let k = 0; k < t.size; k++) {
    const w = t.weight[k]!;
    if (w === 0 || !inBand(t, k, hue, s)) continue;
    picked.push(k);
    total += w;
    if (t.C[k]! > GREY_CHROMA) { sumL += w * t.L[k]!; sumC += w * t.C[k]!; colorful += w; }
  }
  picked.sort((a, b) => t.L[a]! - t.L[b]!);
  const percentile = (p: number) => {
    if (!picked.length) return 0.5;
    let acc = 0;
    for (const k of picked) { acc += t.weight[k]!; if (acc >= p * total) return t.L[k]!; }
    return t.L[picked[picked.length - 1]!]!;
  };
  return {
    hue,
    meanL: colorful ? sumL / colorful : 0.5,
    meanC: colorful ? sumC / colorful : 0.1,
    lowL: percentile(0.02),
    midL: percentile(0.5),
    highL: percentile(0.98),
    coverage: t.visible ? total / t.visible : 0,
  };
}

/** 0–1 per color: how much it gets recolored. Fades out softly past the hue range and toward grey. */
export function colorMask(t: ColorTable, hue: number, s: Settings): Float32Array {
  const m = new Float32Array(t.size);
  for (let k = 0; k < t.size; k++) {
    if (s.scope === 'whole') { m[k] = 1; continue; }
    const d = hueDistance(t.H[k]!, hue);
    const byHue = d <= s.tolerance ? 1 : 1 - smoothstep(s.tolerance, s.tolerance * 2, d);
    m[k] = byHue * smoothstep(0.015, 0.045, t.C[k]!);
  }
  return m;
}
