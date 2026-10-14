import { DEG, hueDistance, normHue, rgbToOklab, smoothstep } from './color';
import type { Raster, Settings, Stats } from './types';

/** Pixels below this OKLCH chroma count as grey: they never decide what the main color is. Pale skin sits around 0.025. */
export const GREY_CHROMA = 0.015;
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

/** A hue the image could be recolored by: where it sits, what it looks like, how much of the picture it covers. */
export interface HueCandidate {
  hue: number;
  /** Mean lightness and chroma of the colors around this hue, for a swatch. */
  l: number;
  c: number;
  /** Share of visible pixels within 20° of this hue. */
  share: number;
}

const MAX_CANDIDATES = 5;
/** A candidate must cover at least this share of the visible pixels. */
const MIN_CANDIDATE_SHARE = 0.02;
/** Candidates have to be at least this far apart in hue. */
const CANDIDATE_GAP = 30;
/** Hue band around a peak used to refine it and to describe it. */
const PEAK_BAND = 20;

/**
 * Hues the image could be recolored by, strongest first. Each is a peak of a hue histogram over
 * visible, colorful pixels, weighted by chroma so vivid areas count more than dull ones.
 * The first one is the main color. Empty when the image has no real color.
 */
export function detectMainHues(t: ColorTable): HueCandidate[] {
  const bins = new Float64Array(72); // 5° each, pixels × chroma
  const counts = new Float64Array(72); // 5° each, pixels
  for (let k = 0; k < t.size; k++) {
    if (t.weight[k]! > 0 && t.C[k]! > GREY_CHROMA) {
      const i = Math.floor(t.H[k]! / 5) % 72;
      bins[i]! += t.weight[k]! * t.C[k]!;
      counts[i]! += t.weight[k]!;
    }
  }
  const smooth = Float64Array.from(bins, (_, i) => bins[(i + 71) % 72]! + 2 * bins[i]! + bins[(i + 1) % 72]!);
  const bandCount = (i: number) => {
    let n = 0;
    for (let d = -PEAK_BAND / 5; d <= PEAK_BAND / 5; d++) n += counts[(i + d + 72) % 72]!;
    return n;
  };
  if (Math.max(...smooth) === 0) return [];

  // strongest bins first, skipping small areas and any too close to a stronger one
  const order = Array.from(smooth.keys()).sort((a, b) => smooth[b]! - smooth[a]!);
  const peaks: number[] = [];
  for (const i of order) {
    if (peaks.length === MAX_CANDIDATES || smooth[i] === 0) break;
    const center = i * 5 + 2.5;
    if (peaks.length && bandCount(i) < MIN_CANDIDATE_SHARE * t.visible) continue;
    if (peaks.every(p => hueDistance(p, center) >= CANDIDATE_GAP)) peaks.push(center);
  }

  const candidates: HueCandidate[] = [];
  for (const center of peaks) {
    let sx = 0, sy = 0, sumL = 0, sumC = 0, n = 0;
    for (let k = 0; k < t.size; k++) {
      const w = t.weight[k]!;
      if (w > 0 && t.C[k]! > GREY_CHROMA && hueDistance(t.H[k]!, center) < PEAK_BAND) {
        const wc = w * t.C[k]!;
        sx += wc * Math.cos(t.H[k]! * DEG);
        sy += wc * Math.sin(t.H[k]! * DEG);
        sumL += w * t.L[k]!; sumC += wc; n += w;
      }
    }
    const hue = normHue(Math.atan2(sy, sx) / DEG);
    if (candidates.some(c => hueDistance(c.hue, hue) < CANDIDATE_GAP / 2)) continue;
    candidates.push({ hue, l: sumL / n, c: sumC / n, share: t.visible ? n / t.visible : 0 });
  }
  return candidates;
}

/** The main color: the strongest hue in the image, or null when it has no real color. */
export const detectMainHue = (t: ColorTable): number | null => detectMainHues(t)[0]?.hue ?? null;

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
    m[k] = byHue * smoothstep(0.008, 0.02, t.C[k]!);
  }
  return m;
}
