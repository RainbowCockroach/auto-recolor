// Draws the guide's demo sprite and runs it through the engine with each setting, into public/guide.
// Run `npm run guide:images` after changing the engine, so the guide's pictures stay true.
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildColorTable, colorMask, computeStats, detectMainHue } from '../src/engine/analyze';
import { encodePng } from '../src/engine/png';
import { maskPreview, recolor } from '../src/engine/recolor';
import { DEFAULT_SETTINGS, type Raster, type Settings } from '../src/engine/types';

const OUT = 'public/guide';
const W = 48, H = 48;

// A green scoop with yellow candies in a terracotta cup with a grey rim. Each part has a job:
// the scoop's shading drifts yellow in the light and teal in the shade (Hue variety, Shadow shift),
// the candies sit ~50° from the green (Hue range), the cup ~90° (the scope switch), the rim is grey (never changes).
const LEAF = { glow: '#dcec70', light: '#a6d24e', mid: '#5aa83a', shade: '#2f8451', deep: '#226a4e' };
const CANDY = { petal: '#f2c43c', heart: '#e2962e' };
const CUP = { light: '#d99159', mid: '#bf6b3c', shade: '#8f4a2a' };
const RIM = { top: '#dad6cf', under: '#9e9890' };
const OUTLINE = '#262420';

const hex = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];

const solid = new Uint8Array(W * H);
const color = new Array<string>(W * H).fill('');
const set = (x: number, y: number, c: string) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  solid[y * W + x] = 1; color[y * W + x] = c;
};

const circles: [number, number, number][] = [[24, 20, 12], [14, 25, 8], [34, 25, 8], [24, 11, 8], [10, 29, 5], [38, 29, 5]];
const inScoop = (x: number, y: number) => circles.some(([cx, cy, r]) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r);
const band = (d: number) => (d < 4 ? LEAF.glow : d < 9 ? LEAF.light : d < 15 ? LEAF.mid : d < 20 ? LEAF.shade : LEAF.deep);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  if (!inScoop(x, y)) continue;
  const d = Math.hypot(x - 17, (y - 12) * 1.15);
  // a one-pixel checker dither on every band edge, like hand-drawn pixel art
  set(x, y, band((x + y) % 2 ? d + 0.9 : d));
}
for (const [fx, fy, fr] of [[33, 9, 3.2], [12, 17, 2.6]] as const) {
  for (let y = fy - 4; y <= fy + 4; y++) for (let x = fx - 4; x <= fx + 4; x++) {
    const d = Math.hypot(x - fx, y - fy);
    if (d <= fr) set(x, y, d < 1.2 ? CANDY.heart : CANDY.petal);
  }
}
for (let y = 31; y <= 33; y++) for (let x = 11; x <= 36; x++) set(x, y, y === 33 ? RIM.under : RIM.top);
for (let y = 34; y <= 45; y++) {
  const hw = 12 - (y - 34) * 0.3;
  for (let x = Math.round(24 - hw); x <= Math.round(24 + hw); x++) {
    set(x, y, x < 24 - hw + 4 ? CUP.light : x > 24 + hw - 5 ? CUP.shade : CUP.mid);
  }
}

const data = new Uint8Array(W * H * 4);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x;
  const edge = !solid[i] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
    const nx = x + dx!, ny = y + dy!;
    return nx >= 0 && ny >= 0 && nx < W && ny < H && solid[ny * W + nx];
  });
  const c = edge ? OUTLINE : color[i];
  if (c) data.set([...hex(c), 255], i * 4);
}
const sprite: Raster = { width: W, height: H, depth: 8, data };

const t = buildColorTable(sprite);
const hue = detectMainHue(t)!;
const run = (target: string, over: Partial<Settings> = {}) => {
  const s = { ...DEFAULT_SETTINGS, ...over };
  return recolor(sprite, t, colorMask(t, hue, s), computeStats(t, hue, s), target, s);
};
const mask = (over: Partial<Settings>): Raster => {
  const s = { ...DEFAULT_SETTINGS, ...over };
  return { ...sprite, data: new Uint8Array(maskPreview(sprite, t, colorMask(t, hue, s)).buffer) };
};

const PINK = '#e4709c', BLUE = '#4f8fe0', CREAM = '#f2e6b0', NAVY = '#2c3a66', ORANGE = '#e8893a';
const images: Record<string, Raster> = {
  original: sprite,
  'hero-pink': run(PINK), 'hero-blue': run(BLUE), 'hero-navy': run(NAVY), 'hero-cream': run(CREAM),
  'scope-main': run(PINK, { scope: 'main' }), 'scope-whole': run(PINK, { scope: 'whole' }),
  'range-8-mask': mask({ tolerance: 8 }), 'range-25-mask': mask({ tolerance: 25 }), 'range-45-mask': mask({ tolerance: 45 }),
  'range-8': run(PINK, { tolerance: 8 }), 'range-25': run(PINK, { tolerance: 25 }), 'range-45': run(PINK, { tolerance: 45 }),
  'strength-100': run(BLUE, { strength: 1 }), 'strength-60': run(BLUE, { strength: 0.6 }), 'strength-25': run(BLUE, { strength: 0.25 }),
  'match-100': run(CREAM, { match: 1 }), 'match-50': run(CREAM, { match: 0.5 }), 'match-0': run(CREAM, { match: 0 }),
  'variety-0': run(ORANGE, { variety: 0 }), 'variety-100': run(ORANGE, { variety: 1 }), 'variety-150': run(ORANGE, { variety: 1.5 }),
  'sat-30': run(PINK, { saturation: 0.3 }), 'sat-100': run(PINK, { saturation: 1 }), 'sat-160': run(PINK, { saturation: 1.6 }),
  'contrast-40': run(BLUE, { contrast: 0.4 }), 'contrast-100': run(BLUE, { contrast: 1 }), 'contrast-160': run(BLUE, { contrast: 1.6 }),
  'shift-0': run(ORANGE, { mode: 'manga', shift: 0 }), 'shift-10': run(ORANGE, { mode: 'manga', shift: 10 }), 'shift-40': run(ORANGE, { mode: 'manga', shift: 40 }),
};
for (const [name, target] of [['blue', BLUE], ['cream', CREAM], ['navy', NAVY]] as const) {
  for (const mode of ['painting', 'flat', 'manga'] as const) images[`mode-${mode}-${name}`] = run(target, { mode });
}

mkdirSync(OUT, { recursive: true });
for (const [name, raster] of Object.entries(images)) writeFileSync(`${OUT}/${name}.png`, encodePng(raster));
console.log(`main hue ${hue.toFixed(0)}°, wrote ${Object.keys(images).length} images to ${OUT}`);
