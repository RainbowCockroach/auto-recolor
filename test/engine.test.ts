import { describe, expect, test } from 'vitest';
import { buildColorTable, colorMask, computeStats, detectMainHue, detectMainHues } from '../src/engine/analyze';
import { hexToOklch, hueName, mapToSrgb, oklchToHex, rgbToOklab } from '../src/engine/color';
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
  test('offers the trunk as a second choice, main color first', () => {
    const t = buildColorTable(makeTree());
    const hues = detectMainHues(t);
    expect(hues.length).toBeGreaterThanOrEqual(2);
    expect(hues[0]!.hue).toBe(detectMainHue(t));
    expect(hueName(hues[0]!.hue)).toBe('green');
    expect(hues.map(h => hueName(h.hue))).toContain(hueName(pixelHue(makeTree(), TRUNK)));
    expect(hues[0]!.share).toBeGreaterThan(hues[1]!.share);
    for (let i = 1; i < hues.length; i++) expect(Math.abs(hues[i]!.hue - hues[0]!.hue)).toBeGreaterThan(15);
  });
  test('a grey image has no main color', () => {
    const grey = makeTree();
    for (let o = 0; o < grey.data.length; o += 4) grey.data[o + 1] = grey.data[o + 2] = grey.data[o]!;
    expect(detectMainHue(buildColorTable(grey))).toBeNull();
  });
});

describe.each(['natural', 'legacy', 'stylized'] as const)('%s mode', mode => {
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

test.each(['natural', 'legacy'] as const)('%s mode at full brightness match puts the typical leaf on the target lightness', mode => {
  const s: Settings = { ...DEFAULT_SETTINGS, mode, variety: 0 };
  const src = makeTree();
  const { t, st, mask } = analyse(src, s);
  const out = recolor(src, t, mask, st, '#3d7be0', s);
  const target = hexToOklch('#3d7be0');
  const after = computeStats(buildColorTable(out), target.h, s);
  expect(Math.abs(after.meanL - target.l)).toBeLessThan(0.05);
  expect(hueName(after.hue)).toBe('blue');
});

/** A 1-pixel-tall strip of one hue: a lightness ramp, then one "blush" pixel with extra chroma. */
const RAMP = 48, BLUSH = RAMP, RAMP_HUE = 55, RAMP_C = 0.06;
function makeRamp(l0 = 0.25, l1 = 0.85): Raster {
  const data = new Uint8Array((RAMP + 1) * 4);
  for (let i = 0; i <= RAMP; i++) {
    const l = i < RAMP ? l0 + ((l1 - l0) * i) / (RAMP - 1) : (l0 + l1) / 2;
    const rgb = mapToSrgb({ mode: 'oklch', l, c: i === BLUSH ? RAMP_C * 2 : RAMP_C, h: RAMP_HUE });
    data[i * 4] = Math.round(rgb.r * 255); data[i * 4 + 1] = Math.round(rgb.g * 255); data[i * 4 + 2] = Math.round(rgb.b * 255); data[i * 4 + 3] = 255;
  }
  return { width: RAMP + 1, height: 1, depth: 8, data };
}
const lightnessOf = (r: Raster, i: number) => {
  const [red, g, b] = pixel(r, i);
  return rgbToOklab({ mode: 'rgb', r: red! / 255, g: g! / 255, b: b! / 255 }).l;
};
const chromaOf = (r: Raster, i: number) => {
  const [red, g, b] = pixel(r, i);
  const { a, b: bb } = rgbToOklab({ mode: 'rgb', r: red! / 255, g: g! / 255, b: b! / 255 });
  return Math.hypot(a, bb);
};
const ramped = (hex: string, over: Partial<Settings> = {}) => {
  const s: Settings = { ...DEFAULT_SETTINGS, scope: 'whole', ...over };
  const src = makeRamp();
  const { t, st, mask } = analyse(src, s);
  return { src, st, out: recolor(src, t, mask, st, hex, s), target: hexToOklch(hex) };
};

describe('natural mode shading', () => {
  test('shadows keep their ratio to the main color on dark and light targets', () => {
    for (const hex of ['#3b2219', '#ffd8c4']) {
      const { src, st, out, target } = ramped(hex);
      for (let i = 0; i < RAMP; i++) {
        const l = lightnessOf(src, i);
        if (l >= st.meanL) continue;
        expect(Math.abs(lightnessOf(out, i) / target.l - l / st.meanL)).toBeLessThan(0.03);
      }
    }
  });

  test('highlights stay in order and never clip to white', () => {
    for (const hex of ['#ffffff', '#f2eee9', '#e8c88a', '#3b2219']) {
      const { out } = ramped(hex);
      let prev = -1;
      for (let i = 0; i < RAMP; i++) {
        const l = lightnessOf(out, i);
        expect(l).toBeGreaterThanOrEqual(prev);
        expect(l).toBeLessThan(0.995);
        prev = l;
      }
    }
  });

  test('light targets spread the highlights over the room left under white', () => {
    const { out, target } = ramped('#d9d9d9');
    // the brightest pixel reaches near white, the typical one sits on the target: detail survives
    expect(lightnessOf(out, RAMP - 1)).toBeGreaterThan(0.95);
    expect(Math.abs(lightnessOf(out, Math.floor(RAMP / 2)) - target.l)).toBeLessThan(0.06);
  });

  test('extra color is added, not multiplied, and fades for grey targets', () => {
    const base = ramped('#c68642');
    expect(chromaOf(base.out, BLUSH) - chromaOf(base.out, Math.floor(RAMP / 2))).toBeCloseTo(RAMP_C, 1);
    const grey = ramped('#9a9a9a');
    expect(chromaOf(grey.out, BLUSH)).toBeLessThan(0.015);
  });

  test('contrast scales the shading depth', () => {
    const flat = ramped('#c68642', { contrast: 0.5 }), full = ramped('#c68642');
    const depth = (r: Raster) => lightnessOf(r, RAMP / 2) - lightnessOf(r, 0);
    expect(depth(flat.out)).toBeLessThan(depth(full.out) * 0.75);
  });

  test('legacy mode is the old curve: light targets flatten the shadows', () => {
    const now = ramped('#ffd8c4'), old = ramped('#ffd8c4', { mode: 'legacy' });
    const depth = (r: Raster) => lightnessOf(r, RAMP / 2) - lightnessOf(r, 0);
    expect(depth(old.out)).toBeLessThan(depth(now.out) * 0.6);
  });
});

test('pale colors still count as the main color', () => {
  const pale = makeRamp(0.88, 0.95);
  for (let i = 0; i <= RAMP; i++) {
    const rgb = mapToSrgb({ mode: 'oklch', l: 0.9, c: 0.025, h: RAMP_HUE });
    pale.data[i * 4] = Math.round(rgb.r * 255); pale.data[i * 4 + 1] = Math.round(rgb.g * 255); pale.data[i * 4 + 2] = Math.round(rgb.b * 255);
  }
  const { hue, mask } = analyse(pale, DEFAULT_SETTINGS);
  expect(hueName(hue)).toBe('orange');
  expect(mask[0]).toBeGreaterThan(0.99);
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
