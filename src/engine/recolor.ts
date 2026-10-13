import { DEG, clamp, hexToOklch, mapToSrgb, normHue, wrap180, type Lch } from './color';
import type { ColorTable } from './analyze';
import type { Raster, Settings, Stats } from './types';

/** Colors recolored less than this (mask × strength) are left bit-for-bit unchanged. */
const UNTOUCHED = 0.002;

/** The new color for unique color k at full mask and full strength. */
type Transform = (k: number) => Lch;

/** Highlights land at most here, so a few pixels past it ease in instead of clipping to white. */
const CEIL = 0.99;
const knee = (x: number) => {
  if (x <= CEIL) return x;
  const r = (x - CEIL) / (1 - CEIL);
  return CEIL + (1 - CEIL) * r / (1 + r);
};

/**
 * Natural: what a painter does by hand. Shading is multiplied, so a shadow 30% darker than the
 * main color stays 30% darker on any target, and highlights are spread over the room left under
 * white. Extra color (a blush on skin) is added, so it stays "this much pinker" on any tone.
 */
function natural(t: ColorTable, st: Stats, target: Lch, s: Settings): Transform {
  // A target at or above the ceiling would turn the highlight slope negative and flip the shading.
  const m = Math.max(st.meanL, 0.01), T = Math.min(target.l, CEIL);
  const chroma = target.c * s.saturation;
  const highSlope = Math.min(T / m, (CEIL - T) / Math.max(st.highL - m, 0.02));
  // The offset shrinks when the target is duller, so grey or white targets don't keep colored blotches.
  const keep = Math.min(1, Math.sqrt(chroma / Math.max(st.meanC, 0.001)));
  const variety = s.variety * (s.scope === 'whole' ? 0.3 : 1);
  return k => {
    const l = t.L[k]!;
    const lit = l <= m ? T * Math.pow(l / m, s.contrast) : knee(T + (l - m) * highSlope * s.contrast);
    return {
      l: l + s.match * (lit - l),
      c: Math.min(Math.max(chroma + (t.C[k]! - st.meanC) * keep, 0), 0.4),
      h: target.h + wrap180(t.H[k]! - st.hue) * variety,
    };
  };
}

/**
 * Legacy: the first Natural mode, kept so old results can be reproduced. A gamma curve sends the
 * group's average lightness to the target's while keeping black and white fixed, which flattens
 * shading on light targets and crushes it on dark ones.
 */
function legacy(t: ColorTable, st: Stats, target: Lch, s: Settings): Transform {
  const gamma = Math.log(clamp(target.l, 0.05, 0.95)) / Math.log(clamp(st.meanL, 0.05, 0.95));
  const ratio = clamp(target.c / Math.max(st.meanC, 0.01), 0, 4) * s.saturation;
  // On the whole image, other parts (a brown trunk next to green leaves) sit far from the main hue.
  // Keeping their full offset would turn them into unrelated colors, so most of it is dropped.
  const variety = s.variety * (s.scope === 'whole' ? 0.3 : 1);
  return k => {
    const l = t.L[k]!;
    return {
      l: l + s.match * (Math.pow(l, gamma) - l),
      c: Math.min(t.C[k]! * ratio, 0.4),
      h: target.h + wrap180(t.H[k]! - st.hue) * variety,
    };
  };
}

const towards = (h: number, goal: number, amount: number) => {
  const d = wrap180(goal - h);
  return h + Math.sign(d) * Math.min(Math.abs(d), amount);
};

/**
 * Stylized: a gradient map. Each pixel's lightness picks a spot on a three-stop ramp,
 * interpolated in OKLab: cool shadow → target (at the typical brightness) → warm highlight.
 */
function stylized(t: ColorTable, st: Stats, target: Lch, s: Settings): Transform {
  const stop = (p: number, l: number, c: number, h: number) => ({ p, l, a: c * Math.cos(h * DEG), b: c * Math.sin(h * DEG) });
  const darkGap = target.l - Math.max(0.12, target.l * 0.38);
  const lightGap = (0.97 - target.l) * 0.65;
  const span = Math.max(st.highL - st.lowL, 1e-3);
  const mid = clamp((st.midL - st.lowL) / span, 0.15, 0.85);
  const ramp = [
    stop(0, clamp(target.l - darkGap * s.contrast, 0.04, target.l), target.c * 0.8, towards(target.h, 265, s.shift)),
    stop(mid, target.l, target.c, target.h),
    stop(1, clamp(target.l + lightGap * s.contrast, target.l, 0.98), target.c * 0.5, towards(target.h, 95, s.shift)),
  ] as const;
  return k => {
    const p = clamp((t.L[k]! - st.lowL) / span);
    const [from, to] = p <= mid ? [ramp[0], ramp[1]] : [ramp[1], ramp[2]];
    const f = clamp((p - from.p) / Math.max(to.p - from.p, 1e-6));
    const a = from.a + (to.a - from.a) * f, b = from.b + (to.b - from.b) * f;
    return { l: from.l + (to.l - from.l) * f, c: Math.hypot(a, b), h: normHue(Math.atan2(b, a) / DEG) };
  };
}

export interface RecoloredColors {
  /** 1 where the color changes. */
  changed: Uint8Array;
  /** New channel values, 3 per color, at the image's bit depth. */
  rgb: Uint16Array;
}

export function recolorColors(t: ColorTable, mask: Float32Array, st: Stats, hex: string, s: Settings, depth: 8 | 16): RecoloredColors {
  const max = depth === 16 ? 65535 : 255;
  const target = hexToOklch(hex);
  const transform = (s.mode === 'stylized' ? stylized : s.mode === 'legacy' ? legacy : natural)(t, st, target, s);
  const changed = new Uint8Array(t.size);
  const rgb = new Uint16Array(t.size * 3);

  for (let k = 0; k < t.size; k++) {
    const w = mask[k]!;
    if (w * s.strength < UNTOUCHED) continue;
    const next = transform(k);
    // A partly selected color (soft edge of the mask) is blended in OKLCH, so it keeps its
    // saturation on the way instead of passing through grey.
    const l = t.L[k]! + (next.l - t.L[k]!) * w;
    const c = t.C[k]! + (next.c - t.C[k]!) * w;
    const h = (t.H[k]! + wrap180(next.h - t.H[k]!) * w) * DEG;
    // Strength works like layer opacity: a plain mix with the original in OKLab.
    const L = t.L[k]! + (l - t.L[k]!) * s.strength;
    const A = t.A[k]! + (c * Math.cos(h) - t.A[k]!) * s.strength;
    const B = t.B[k]! + (c * Math.sin(h) - t.B[k]!) * s.strength;
    const out = mapToSrgb({ mode: 'oklab', l: L, a: A, b: B });
    changed[k] = 1;
    rgb[k * 3] = Math.round(clamp(out.r) * max);
    rgb[k * 3 + 1] = Math.round(clamp(out.g) * max);
    rgb[k * 3 + 2] = Math.round(clamp(out.b) * max);
  }
  return { changed, rgb };
}

/** Writes the recolored colors back into a full image. Alpha and unchanged pixels are copied exactly. */
export function applyColors(raster: Raster, t: ColorTable, colors: RecoloredColors): Raster {
  const src = raster.data;
  const out = raster.depth === 16 ? new Uint16Array(src.length) : new Uint8Array(src.length);
  for (let i = 0, o = 0; i < t.pixelColor.length; i++, o += 4) {
    const k = t.pixelColor[i]!;
    if (k >= 0 && colors.changed[k]) {
      out[o] = colors.rgb[k * 3]!; out[o + 1] = colors.rgb[k * 3 + 1]!; out[o + 2] = colors.rgb[k * 3 + 2]!;
    } else {
      out[o] = src[o]!; out[o + 1] = src[o + 1]!; out[o + 2] = src[o + 2]!;
    }
    out[o + 3] = src[o + 3]!;
  }
  return { ...raster, data: out };
}

export function recolor(raster: Raster, t: ColorTable, mask: Float32Array, st: Stats, hex: string, s: Settings): Raster {
  return applyColors(raster, t, recolorColors(t, mask, st, hex, s, raster.depth));
}

/** 8-bit preview: the recolored area in its own colors, everything else faded to grey. */
export function maskPreview(raster: Raster, t: ColorTable, mask: Float32Array): Uint8ClampedArray<ArrayBuffer> {
  const max = raster.depth === 16 ? 65535 : 255;
  const shade = new Uint8Array(t.size * 4);
  for (let k = 0; k < t.size; k++) {
    const m = mask[k]!;
    const grey = mapToSrgb({ mode: 'oklab', l: t.L[k]!, a: 0, b: 0 }).r * 255;
    for (let ch = 0; ch < 3; ch++) shade[k * 4 + ch] = Math.round((t.rgb[k * 3 + ch]! / max) * 255 * m + grey * (1 - m));
    shade[k * 4 + 3] = Math.round((0.25 + 0.75 * m) * 255);
  }
  const out = new Uint8ClampedArray(t.pixelColor.length * 4);
  for (let i = 0, o = 0; i < t.pixelColor.length; i++, o += 4) {
    const k = t.pixelColor[i]!;
    if (k < 0) continue;
    out[o] = shade[k * 4]!; out[o + 1] = shade[k * 4 + 1]!; out[o + 2] = shade[k * 4 + 2]!;
    out[o + 3] = Math.round(((raster.data[o + 3]! / max) * shade[k * 4 + 3]!));
  }
  return out;
}
