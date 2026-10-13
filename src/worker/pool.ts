import * as Comlink from 'comlink';
import type { Settings } from '../engine/types';
import type { Want, WorkerApi } from './recolor.worker';

type Api = Comlink.Remote<WorkerApi>;

/** Thrown for queued work that was dropped because a newer request replaced it. */
export class Cancelled extends Error {
  constructor() { super('Replaced by a newer request'); this.name = 'Cancelled'; }
}
export const isCancelled = (e: unknown) => e instanceof Cancelled;

export const PRIORITY = { preview: 0, thumbSelected: 1, thumb: 2, export: 3 } as const;

interface Task {
  /** The image the task works on; tasks for removed images are dropped. */
  imageId: string;
  priority: number;
  order: number;
  run: (api: Api) => Promise<unknown>;
  resolve: (v: unknown) => void;
  reject: (e: unknown) => void;
  isStale?: () => boolean;
}
interface Slot {
  api: Api;
  queue: Task[];
  busy: boolean;
  /** Images this worker owns. */
  images: number;
  /** Images whose color table this worker holds (owned or borrowed). */
  tables: Set<string>;
}

interface RunOptions { priority: number; isStale?: () => boolean }

/**
 * A few workers, each owning some of the images. Pixel work for an image goes to its owner;
 * color math can go to any worker, which borrows the image's color table the first time.
 * Each worker runs one task at a time, most urgent first, and skips tasks that went stale
 * while waiting (for example a thumbnail for a slider value that has since changed).
 */
export class WorkerPool {
  private slots: Slot[];
  private home = new Map<string, Slot>();
  private order = 0;

  constructor(size = Math.max(1, Math.min(6, (navigator.hardwareConcurrency || 4) - 1))) {
    this.slots = Array.from({ length: size }, () => {
      const worker = new Worker(new URL('./recolor.worker.ts', import.meta.url), { type: 'module' });
      return { api: Comlink.wrap<WorkerApi>(worker), queue: [], busy: false, images: 0, tables: new Set<string>() };
    });
  }

  /** Gives a new image to the least busy worker. */
  assign(id: string) {
    const slot = this.slots.reduce((a, b) => (b.images < a.images ? b : a));
    slot.images++;
    slot.tables.add(id);
    this.home.set(id, slot);
  }

  release(id: string) {
    const owner = this.home.get(id);
    if (!owner) return;
    owner.images--;
    this.home.delete(id);
    for (const slot of this.slots) {
      if (slot.tables.delete(id)) void slot.api.drop(id);
    }
  }

  /** Runs on the worker that owns the image. */
  run<T>(id: string, run: (api: Api) => Promise<T>, opts: RunOptions): Promise<T> {
    const slot = this.home.get(id);
    if (!slot) return Promise.reject(new Cancelled());
    return this.enqueue(slot, id, run, opts);
  }

  /** Runs on the least busy worker, copying the image's color table there first if needed. */
  runAnywhere<T>(id: string, run: (api: Api) => Promise<T>, opts: RunOptions): Promise<T> {
    const owner = this.home.get(id);
    if (!owner) return Promise.reject(new Cancelled());
    const load = (s: Slot) => s.queue.length + (s.busy ? 1 : 0);
    const slot = this.slots.reduce((best, s) => (load(s) < load(best) ? s : best), owner);
    return this.enqueue(slot, id, async api => {
      if (!slot.tables.has(id)) {
        const shared = await owner.api.shareTable(id);
        if (!this.home.has(id)) throw new Cancelled(); // image was removed meanwhile
        await api.adoptTable(id, shared);
        slot.tables.add(id);
      }
      return run(api);
    }, opts);
  }

  private enqueue<T>(slot: Slot, imageId: string, run: (api: Api) => Promise<T>, opts: RunOptions): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      slot.queue.push({ imageId, priority: opts.priority, order: this.order++, run, resolve: resolve as (v: unknown) => void, reject, isStale: opts.isStale });
      void this.pump(slot);
    });
  }

  private async pump(slot: Slot) {
    if (slot.busy) return;
    slot.queue.sort((a, b) => a.priority - b.priority || a.order - b.order);
    let task = slot.queue.shift();
    while (task && (!this.home.has(task.imageId) || task.isStale?.())) {
      task.reject(new Cancelled());
      task = slot.queue.shift();
    }
    if (!task) return;
    slot.busy = true;
    try {
      task.resolve(await task.run(slot.api));
    } catch (e) {
      task.reject(e);
    } finally {
      slot.busy = false;
      void this.pump(slot);
    }
  }
}

export const pool = new WorkerPool();

export interface RenderRequest { id: string; hue: number; settings: Settings; hex: string; want: Want }

/** One recolored variant: color math on any free worker, then pixels on the image's owner. */
export async function renderVariant({ id, hue, settings, hex, want }: RenderRequest, opts: RunOptions) {
  const colors = await pool.runAnywhere(id, api => api.colors(id, hue, settings, hex), opts);
  // painting is quick, so it goes ahead of other waiting color math
  return pool.run(id, api => api.paint(id, Comlink.transfer(colors, [colors.changed.buffer, colors.rgb.buffer]), want),
    { ...opts, priority: opts.priority - 0.5 });
}
