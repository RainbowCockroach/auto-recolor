import { DEFAULT_SETTINGS, type Settings } from './engine/types';

export interface PaletteColor { id: string; name: string; hex: string }
export interface Palette {
  id: string;
  name: string;
  colors: PaletteColor[];
  /** Set when the palette was added from the preset library. */
  presetId?: string;
}

const newId = () => crypto.randomUUID();
export const makeColor = (name: string, hex: string): PaletteColor => ({ id: newId(), name, hex });
export const makePalette = (name: string, colors: [string, string][], presetId?: string): Palette =>
  ({ id: newId(), name, colors: colors.map(([n, h]) => makeColor(n, h)), ...(presetId ? { presetId } : {}) });

export const defaultPalettes = (): Palette[] => [
  makePalette('warm', [['red', '#d64541'], ['pink', '#ec8fb8'], ['purple', '#8e5bd0']]),
  makePalette('cool', [['blue', '#3d7be0'], ['teal', '#23a9a0']]),
  makePalette('autumn', [['orange', '#e07a26'], ['gold', '#e3b53c']]),
];

/** Lowercase, dashes instead of spaces and symbols: safe in file names on every OS. */
export const slug = (s: string) =>
  s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'untitled';

const unique = (stem: string, used: Set<string>) => {
  let name = stem;
  for (let n = 2; used.has(name); n++) name = `${stem}-${n}`;
  used.add(name);
  return name;
};

/** Folder name for a new image, made unique among the images already loaded. */
export function folderName(fileName: string, taken: Iterable<string>): string {
  return unique(slug(fileName.replace(/\.[^.]+$/, '')), new Set(taken));
}

export interface OutputFile { palette: Palette; color: PaletteColor; file: string }

/** Every file one image produces, in palette order, e.g. tree_warm_red.png. Duplicates get -2, -3… */
export function outputsFor(folder: string, palettes: Palette[]): OutputFile[] {
  const used = new Set<string>();
  return palettes.flatMap(palette => palette.colors.map(color => ({
    palette, color,
    file: `${unique(`${folder}_${slug(palette.name)}_${slug(color.name)}`, used)}.png`,
  })));
}

// ---------- reading saved state safely ----------
const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

export function readPalettes(value: unknown): Palette[] | null {
  if (!Array.isArray(value) || !value.length) return null;
  const out: Palette[] = [];
  for (const p of value) {
    if (!p || typeof p.name !== 'string' || !Array.isArray(p.colors) || !p.colors.length) return null;
    const colors: PaletteColor[] = [];
    for (const c of p.colors) {
      if (!c || typeof c.name !== 'string' || !isHex(c.hex)) return null;
      colors.push({ id: typeof c.id === 'string' ? c.id : newId(), name: c.name, hex: c.hex.toLowerCase() });
    }
    out.push({
      id: typeof p.id === 'string' ? p.id : newId(), name: p.name, colors,
      ...(typeof p.presetId === 'string' ? { presetId: p.presetId } : {}),
    });
  }
  return out;
}

const CHOICES: Partial<Record<keyof Settings, readonly string[]>> = { mode: ['natural', 'stylized'], scope: ['main', 'whole'] };

/** Keeps saved settings that still make sense; anything else falls back to the default. */
export function readSettings(value: unknown): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS };
  if (!value || typeof value !== 'object') return out;
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    const v = (value as Record<string, unknown>)[key];
    const choices = CHOICES[key];
    if (choices ? typeof v === 'string' && choices.includes(v) : typeof v === 'number' && Number.isFinite(v)) {
      (out as unknown as Record<string, unknown>)[key] = v;
    }
  }
  return out;
}
