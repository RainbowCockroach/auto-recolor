import * as Comlink from 'comlink';
import type { HueCandidate } from './engine/analyze';
import { folderName } from './model';
import { PRIORITY, pool } from './worker/pool';

export interface LoadedImage {
  id: string;
  name: string;
  /** Output folder and file-name prefix, unique among loaded images. */
  folder: string;
  width: number;
  height: number;
  depth: 8 | 16;
  /** Hues the image could be recolored by, strongest first. Empty if the image has no real color. */
  autoHues: HueCandidate[];
  /** The strongest of them, or null if the image has no real color. */
  autoHue: number | null;
  /** Hue the person clicked on, overriding the detected one. */
  pickedHue: number | null;
  /** The hue actually used. */
  hue: number;
  full: ImageBitmap;
  thumb: ImageBitmap;
}

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const isPng = (bytes: ArrayBuffer) => {
  const head = new Uint8Array(bytes, 0, Math.min(8, bytes.byteLength));
  return PNG_SIGNATURE.every((b, i) => head[i] === b);
};

export const withHue = (img: Omit<LoadedImage, 'hue'> & { hue?: number }): LoadedImage =>
  ({ ...img, hue: img.pickedHue ?? img.autoHue ?? 0 });

/** Decodes a file in a worker. Throws an Error with a readable message when it can't. */
export async function loadImage(file: File, takenFolders: string[]): Promise<LoadedImage> {
  const bytes = await file.arrayBuffer();
  if (!isPng(bytes)) throw new Error(`${file.name} isn't a PNG file.`);
  const id = crypto.randomUUID();
  pool.assign(id);
  try {
    const info = await pool.run(id, api => api.load(id, Comlink.transfer(bytes, [bytes])), { priority: PRIORITY.preview });
    return withHue({ id, name: file.name, folder: folderName(file.name, takenFolders), pickedHue: null, ...info, depth: info.depth });
  } catch (e) {
    pool.release(id);
    throw new Error(`Couldn't read ${file.name}: ${e instanceof Error ? e.message : String(e)}`, { cause: e });
  }
}

export function unloadImage(id: string) {
  pool.release(id);
}
