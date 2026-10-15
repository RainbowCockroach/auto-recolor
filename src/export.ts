import { zip, type AsyncZippable } from 'fflate';
import type { Settings } from './engine/types';
import { outputsFor, type Palette } from './model';
import { PRIORITY, pool, renderPng } from './worker/pool';
import type { LoadedImage } from './images';

type Writer = (folder: string, file: string, png: Uint8Array) => Promise<void>;

/**
 * Renders every image × color at full size and hands each PNG to `write`, one at a time.
 * Settings and palettes are copied first, so edits made while saving don't mix into the files.
 */
async function renderAll(images: LoadedImage[], palettes: Palette[], settings: Settings, write: Writer, onProgress: (done: number, total: number) => void) {
  const s = { ...settings };
  const jobs = images.flatMap(img => outputsFor(img.folder, structuredClone(palettes)).map(out => ({ img, out })));
  let next = 0, done = 0, failed = false, writing = Promise.resolve();
  onProgress(0, jobs.length);

  // a few at a time, so finished pictures don't pile up in memory faster than they are saved
  const lane = async () => {
    try {
      while (!failed) {
        const job = jobs[next++];
        if (!job) return;
        const png = await renderPng({ id: job.img.id, hue: job.img.hue, settings: s, hex: job.out.color.hex },
          { priority: PRIORITY.export, isStale: () => failed });
        writing = writing.then(() => write(job.img.folder, job.out.file, png)).then(() => onProgress(++done, jobs.length));
        await writing;
      }
    } catch (e) {
      failed = true;
      throw e;
    }
  };
  await Promise.all(Array.from({ length: pool.size * 2 }, lane));
  return done;
}

export async function downloadZip(images: LoadedImage[], palettes: Palette[], settings: Settings, onProgress: (done: number, total: number) => void) {
  const files: AsyncZippable = {};
  const count = await renderAll(images, palettes, settings, async (folder, file, png) => {
    const dir = (files[folder] ??= {}) as AsyncZippable;
    dir[file] = png;
  }, onProgress);
  // PNGs are already compressed, so they're stored as-is
  const bytes = await new Promise<Uint8Array>((resolve, reject) =>
    zip(files, { level: 0 }, (err, data) => (err ? reject(err) : resolve(data))));
  const name = `recolored-${new Date().toISOString().slice(0, 10)}.zip`;
  const url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/zip' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return { count, name };
}

export const canSaveToFolder = () => typeof window.showDirectoryPicker === 'function';

/** Asks for a folder, then writes one subfolder per image into it. Returns null if the person cancelled. */
export async function saveToFolder(images: LoadedImage[], palettes: Palette[], settings: Settings, onProgress: (done: number, total: number) => void) {
  let root: FileSystemDirectoryHandle;
  try {
    root = await window.showDirectoryPicker({ id: 'auto-recolor', mode: 'readwrite' });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return null;
    throw e;
  }
  const dirs = new Map<string, FileSystemDirectoryHandle>();
  const count = await renderAll(images, palettes, settings, async (folder, file, png) => {
    let dir = dirs.get(folder);
    if (!dir) dirs.set(folder, (dir = await root.getDirectoryHandle(folder, { create: true })));
    const writable = await (await dir.getFileHandle(file, { create: true })).createWritable();
    await writable.write(png as Uint8Array<ArrayBuffer>);
    await writable.close();
  }, onProgress);
  return { count, name: root.name };
}
