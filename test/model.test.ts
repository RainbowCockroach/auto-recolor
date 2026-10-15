import { expect, test } from 'vitest';
import { defaultPalettes, folderName, makePalette, outputsFor, readPalettes, readSettings, slug } from '../src/model';
import { DEFAULT_SETTINGS } from '../src/engine/types';

test('slug makes names safe for files', () => {
  expect(slug('  Dark Red! ')).toBe('dark-red');
  expect(slug('Ünïcode')).toBe('n-code');
  expect(slug('???')).toBe('untitled');
});

test('folder names are unique per image', () => {
  expect(folderName('Tree.png', [])).toBe('tree');
  expect(folderName('tree.png', ['tree', 'tree-2'])).toBe('tree-3');
});

test('output files follow image_palette_color.png and never collide', () => {
  const pals = [makePalette('Warm', [['Red', '#ff0000'], ['red', '#ee0000']]), makePalette('cool', [['blue', '#0000ff']])];
  expect(outputsFor('tree', pals).map(o => o.file)).toEqual(['tree_warm_red.png', 'tree_warm_red-2.png', 'tree_cool_blue.png']);
});

test('saved palettes are checked before use', () => {
  const good = defaultPalettes();
  expect(readPalettes(JSON.parse(JSON.stringify(good)))).toEqual(good);
  expect(readPalettes([{ name: 'x', colors: [{ name: 'y', hex: 'red' }] }])).toBeNull();
  expect(readPalettes('nope')).toBeNull();
  expect(readPalettes([{ name: 'x', colors: [{ name: 'y', hex: '#ABCDEF' }] }])?.[0]?.colors[0]?.hex).toBe('#abcdef');
});

test('saved settings fall back to defaults when broken', () => {
  expect(readSettings({ mode: 'manga', tolerance: 40, strength: 'lots', scope: 'everything' }))
    .toEqual({ ...DEFAULT_SETTINGS, mode: 'manga', tolerance: 40 });
  expect(readSettings(null)).toEqual(DEFAULT_SETTINGS);
});
