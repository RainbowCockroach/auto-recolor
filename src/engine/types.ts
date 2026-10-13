export type Mode = 'natural' | 'legacy' | 'stylized';
export type Scope = 'main' | 'whole';

export interface Settings {
  mode: Mode;
  /** 'main' recolors only the main color, 'whole' recolors everything. */
  scope: Scope;
  /** Degrees of hue around the main color that still count as the main color. */
  tolerance: number;
  /** 0–1, like layer opacity: how much of the recolor is applied over the original. */
  strength: number;
  // natural and legacy modes
  /** 0–1. At 1 the typical recolored pixel lands exactly on the target's lightness. */
  match: number;
  /** 0–1.5. How much of the original hue variation survives. */
  variety: number;
  /** Multiplier on the target's saturation. */
  saturation: number;
  // stylized mode
  /** Degrees shadows lean blue and highlights lean yellow. */
  shift: number;
  // natural and stylized modes
  /** Multiplier on how far shadows and highlights reach from the target color. */
  contrast: number;
}

export const DEFAULT_SETTINGS: Settings = {
  mode: 'natural',
  scope: 'main',
  tolerance: 25,
  strength: 1,
  match: 1,
  variety: 1,
  saturation: 1,
  shift: 10,
  contrast: 1,
};

/** Decoded image: always RGBA, 8 or 16 bits per channel, straight (not premultiplied) alpha. */
export interface Raster {
  width: number;
  height: number;
  depth: 8 | 16;
  data: Uint8Array | Uint16Array;
}

export interface Stats {
  hue: number;
  /** Average OKLab lightness and chroma of the colorful pixels being recolored. */
  meanL: number;
  meanC: number;
  /** Lightness percentiles of the pixels being recolored (2%, 50%, 98%). */
  lowL: number;
  midL: number;
  highL: number;
  /** Share of visible pixels that get recolored, 0–1. */
  coverage: number;
}
