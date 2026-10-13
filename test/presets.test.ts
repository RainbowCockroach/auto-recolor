import { expect, test } from 'vitest';
import { PRESETS } from '../src/presets';
import { slug } from '../src/model';

test('every preset color is a valid 6-digit hex', () => {
  for (const p of PRESETS) for (const [name, hex] of p.colors) expect(hex, `${p.id} / ${name}`).toMatch(/^#[0-9a-f]{6}$/);
});

test('ids are unique and color names give distinct file names within a preset', () => {
  expect(new Set(PRESETS.map(p => p.id)).size).toBe(PRESETS.length);
  for (const p of PRESETS) expect(new Set(p.colors.map(([n]) => slug(n))).size, p.id).toBe(p.colors.length);
});

test('presets have the documented number of colors', () => {
  const counts = Object.fromEntries(PRESETS.map(p => [p.id, p.colors.length]));
  expect(counts).toEqual({
    'ea-hair': 24, pooklet: 45, 'sorbets-remix': 76,
    'sandwich-naturals': 20, 'sandwich-unnaturals': 35, 'sandwich-neutrals': 20,
    'lunedsims-tea': 18, 'cyansimblr-chalk-pastels': 32, 'monk-skin-tone': 10,
  });
});

test('every preset credits its source', () => {
  for (const p of PRESETS) {
    expect(p.credit.by.length, p.id).toBeGreaterThan(0);
    expect(p.credit.url, p.id).toMatch(/^https:\/\//);
  }
});
