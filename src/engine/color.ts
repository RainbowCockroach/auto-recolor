// All color science goes through culori. Only the color spaces we need are registered,
// which keeps the bundle small.
import {
  useMode as registerMode, modeRgb, modeLrgb, modeOklab, modeOklch,
  converter, toGamut, formatHex, parseHex,
} from 'culori/fn';

registerMode(modeRgb);
registerMode(modeLrgb);
registerMode(modeOklab);
registerMode(modeOklch);

export const rgbToOklab = converter('oklab');

/**
 * Brings any OKLab/OKLCH color into sRGB with the CSS Color 4 gamut-mapping algorithm:
 * lowers chroma at constant lightness and hue until the color fits (within a just-noticeable difference).
 */
export const mapToSrgb = toGamut('rgb', 'oklch');

export const DEG = Math.PI / 180;
export const clamp = (x: number, lo = 0, hi = 1) => (x < lo ? lo : x > hi ? hi : x);
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
/** Signed angle difference in (-180, 180]. */
export const wrap180 = (d: number) => {
  d = (d + 180) % 360;
  if (d < 0) d += 360;
  return d - 180;
};
export const hueDistance = (a: number, b: number) => Math.abs(wrap180(a - b));
export const normHue = (h: number) => ((h % 360) + 360) % 360;

export interface Lch { l: number; c: number; h: number }

export function hexToOklch(hex: string): Lch {
  const rgb = parseHex(hex);
  if (!rgb) throw new Error(`Not a hex color: ${hex}`);
  const { l, a, b } = rgbToOklab(rgb);
  return { l, c: Math.hypot(a, b), h: normHue(Math.atan2(b, a) / DEG) };
}

export function oklchToHex({ l, c, h }: Lch): string {
  return formatHex(mapToSrgb({ mode: 'oklch', l, c, h }));
}

const HUE_NAMES: [number, string][] = [
  [15, 'pink'], [45, 'red'], [75, 'orange'], [115, 'yellow'], [170, 'green'],
  [215, 'teal'], [285, 'blue'], [325, 'purple'], [360, 'pink'],
];
/** Rough everyday name for an OKLCH hue angle. */
export function hueName(h: number): string {
  const n = normHue(h);
  return HUE_NAMES.find(([max]) => n < max)?.[1] ?? 'pink';
}
