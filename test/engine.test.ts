import { describe, expect, test } from 'vitest';
import { buildColorTable, colorMask, computeStats, detectMainHue } from '../src/engine/analyze';
import { hexToOklch, hueName, oklchToHex, rgbToOklab } from '../src/engine/color';
import { maskPreview, recolor } from '../src/engine/recolor';
import { DEFAULT_SETTINGS, type Raster, type Settings } from '../src/engine/types';

const W = 20, H = 20;
const LEAF = 5 * W + 10, EDGE_LEAF = 6 * W + 15, TRUNK = 17 * W + 10, CORNER = 0, SOFT = 13 * W + 3;

/** A small "tree": green leaves in many shades, a brown trunk, transparent corners, one half-transparent leaf. */
function makeTree(depth: 8 | 16 = 8): Raster {
  const max = depth === 16 ? 65535 : 255;
  const data = depth === 16 ? new Uint16Array(W * H * 4) : new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, o = i * 4;
    if (x < 2 && y < 2) continue; // transparent
    const rgb = y < 14
      ? [0.25 * (0.25 + ((x * 7) % 47) / 100), 0.25 + ((x * 7 + y * 3) % 47) / 100, 0.3 * (0.25 + ((y * 5) % 47) / 100)]
      : [110 / 255, 70 / 255, 40 / 255];
    rgb.forEach((v, c) => { data[o + c] = Math.round(v * max); });
    data[o + 3] = i === SOFT ? Math.round(max * 0.4) : max;
  }
  return { width: W, height: H, depth, data };
}

function analyse(r: Raster, s: Settings) {
  const t = buildColorTable(r);
  const hue = detectMainHue(t)!;
  return { t, hue, st: computeStats(t, hue, s), mask: colorMask(t, hue, s) };
}

const pixel = (r: Raster, i: number) => Array.from(r.data.slice(i * 4, i * 4 + 4));
const pixelHue = (r: Raster, i: number) => {
  const max = r.depth === 16 ? 65535 : 255;
  const [red, g, b] = pixel(r, i);
  const { a, b: bb } = rgbToOklab({ mode: 'rgb', r: red! / max, g: g! / max, b: b! / max });
  return ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
};

describe('color helpers', () => {
  test('hex survives a round trip through OKLCH', () => {
    for (const hex of ['#d64541', '#ec8fb8', '#3d7be0', '#e3b53c', '#000000', '#ffffff']) {
      expect(oklchToHex(hexToOklch(hex))).toBe(hex);
    }
  });
  test('hue names', () => {
    expect(hueName(hexToOklch('#2e8b3a').h)).toBe('green');
    expect(hueName(hexToOklch('#d64541').h)).toBe('red');
    expect(hueName(hexToOklch('#3d7be0').h)).toBe('blue');
  });
});

describe('analysis', () => {
  test('counts each distinct color once and ignores transparent pixels', () => {
    const t = buildColorTable(makeTree());
    expect(t.pixelColor[CORNER]).toBe(-1);
    expect(t.size).toBeLessThan(W * H);
    expect(t.visible).toBe(W * H - 4 - 1); // 4 transparent corners, 1 half-transparent pixel
  });
  test('finds green as the main color', () => {
    const { hue } = analyse(makeTree(), DEFAULT_SETTINGS);
    expect(hueName(hue)).toBe('green');
  });
  test('the main-color mask covers leaves but not the trunk', () => {
    const { t, mask } = analyse(makeTree(), DEFAULT_SETTINGS);
    expect(mask[t.pixelColor[LEAF]!]).toBeGreaterThan(0.99);
    expect(mask[t.pixelColor[TRUNK]!]).toBe(0);
  });
  test('a grey image has no main color', () => {
    const grey = makeTree();
    for (let o = 0; o < grey.data.length; o += 4) grey.data[o + 1] = grey.data[o + 2] = grey.data[o]!;
    expect(detectMainHue(buildColorTable(grey))).toBeNull();
  });
});

describe.each(['natural', 'stylized'] as const)('%s mode', mode => {
  const s: Settings = { ...DEFAULT_SETTINGS, mode };

  test.each([8, 16] as const)('%i-bit: leaves turn red; trunk, transparency and alpha are untouched', depth => {
    const src = makeTree(depth);
    const { t, st, mask } = analyse(src, s);
    const out = recolor(src, t, mask, st, '#d64541', s);
    expect(out.depth).toBe(depth);
    expect(out.data.constructor).toBe(src.data.constructor);
    expect(hueName(pixelHue(out, LEAF))).toBe('red');
    expect(hueName(pixelHue(out, EDGE_LEAF))).toBe('red');
    expect(pixel(out, TRUNK)).toEqual(pixel(src, TRUNK));
    expect(pixel(out, CORNER)).toEqual(pixel(src, CORNER));
    for (let o = 3; o < src.data.length; o += 4) expect(out.data[o]).toBe(src.data[o]);
  });

  test('strength 0 changes nothing', () => {
    const src = makeTree();
    const zero = { ...s, strength: 0 };
    const { t, st, mask } = analyse(src, zero);
    expect(Array.from(recolor(src, t, mask, st, '#3d7be0', zero).data)).toEqual(Array.from(src.data));
  });

  test('whole image recolors the trunk too, toward the target', () => {
    const whole = { ...s, scope: 'whole' as const };
    const src = makeTree();
    const { t, st, mask } = analyse(src, whole);
    const out = recolor(src, t, mask, st, '#3d7be0', whole);
    expect(pixel(out, TRUNK)).not.toEqual(pixel(src, TRUNK));
    expect(['blue', 'teal', 'purple']).toContain(hueName(pixelHue(out, TRUNK)));
  });
});

test('natural mode at full brightness match puts the typical leaf on the target lightness', () => {
  const s: Settings = { ...DEFAULT_SETTINGS, variety: 0 };
  const src = makeTree();
  const { t, st, mask } = analyse(src, s);
  const out = recolor(src, t, mask, st, '#3d7be0', s);
  const target = hexToOklch('#3d7be0');
  const after = computeStats(buildColorTable(out), target.h, s);
  expect(Math.abs(after.meanL - target.l)).toBeLessThan(0.05);
  expect(hueName(after.hue)).toBe('blue');
});

test('vivid targets stay inside sRGB without clipping to garbage', () => {
  const s: Settings = { ...DEFAULT_SETTINGS, saturation: 1.6 };
  const src = makeTree();
  const { t, st, mask } = analyse(src, s);
  for (const hex of ['#00ff00', '#ff00ff', '#0000ff', '#ffff00']) {
    const out = recolor(src, t, mask, st, hex, s);
    // the requested hue survives gamut mapping
    expect(hueName(pixelHue(out, LEAF))).toBe(hueName(hexToOklch(hex).h));
  }
});

test('mask preview fades unselected parts', () => {
  const src = makeTree();
  const { t, mask } = analyse(src, DEFAULT_SETTINGS);
  const view = maskPreview(src, t, mask);
  expect(view[LEAF * 4 + 3]).toBe(255);
  expect(view[TRUNK * 4 + 3]).toBeLessThan(80);
  expect(view[TRUNK * 4]).toBe(view[TRUNK * 4 + 1]); // grey
});
