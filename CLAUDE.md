# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Browser-only React + Vite app that recolors PNG sprites into every color of the user's palettes and exports them as `folder/<image>_<palette>_<color>.png` (ZIP or File System Access "Save to folder"). No backend.

## Commands

Node >= 22.12.

```
npm run dev                      # Vite dev server (served under /auto-recolor/)
npm test                         # vitest run (node env, test/**/*.test.ts)
npx vitest run test/engine.test.ts        # one file
npx vitest run -t "part of test name"     # one test by name
npm run typecheck                # tsc --noEmit
npm run lint                     # eslint .
npm run build                    # typecheck + vite build into dist/
npm run guide:images             # redraw the guide's pictures in public/guide (run after engine changes)
```

CI (`.github/workflows/pages.yml`) runs typecheck, lint, test, build on every push to `main` and deploys to GitHub Pages — a push to `main` is a live deploy. `vite.config.ts` sets `base: '/auto-recolor/'` for Pages.

## Architecture

Dependencies point one way: UI (`App.tsx`, `components/`) → glue (`hooks.ts`, `images.ts`, `export.ts`) → `worker/` → `engine/`. `App.tsx` and the glue modules call the worker pool directly; components only render and call back.

- **`src/engine/`** — pure color/PNG logic, no browser APIs, so it is unit tested directly in node. All color math is OKLab/OKLCH via culori, with CSS Color 4 gamut mapping back to sRGB (`color.ts`).
  - PNGs are decoded/encoded with fast-png into a `Raster` (always RGBA, 8 **or 16** bit, straight alpha). Never produce output pixels through a canvas: it premultiplies alpha and drops 16-bit. `ImageBitmap`s are only for on-screen display. Code touching pixels must handle both depths.
  - **Key idea:** the recolor result depends only on a pixel's own color, so `analyze.ts` builds a `ColorTable` of unique colors (plus `pixelColor`, a per-pixel index into it). `recolorColors` computes new colors per unique color (the expensive part); `applyColors` writes them back into pixels (cheap). Keep new per-pixel logic expressible per unique color, or this split breaks.
  - `Settings` / `DEFAULT_SETTINGS` in `types.ts` are the single source of truth for recolor options. Adding a setting means updating `DEFAULT_SETTINGS` too — `readSettings` in `model.ts` only keeps saved keys that exist there.
- **`src/worker/`** — `recolor.worker.ts` exposes the engine via Comlink; `pool.ts` is a `WorkerPool` of up to 6 workers.
  - Each image has one **owner** worker holding its raster. `pool.run` targets the owner (pixel work: `paint`, `maskView`, `probe`). `pool.runAnywhere` picks the least busy worker and has it borrow the color table (`shareTable`/`adoptTable`) for color math. `renderVariant` = `colors` anywhere, then `paint` on the owner.
  - Tasks have a `PRIORITY`, lower runs first (preview, then selected image's thumbs, other thumbs, export), and an optional `isStale()`; stale queued tasks, and tasks for removed images, reject with `Cancelled`, which callers must ignore (`isCancelled`). Transfer typed arrays / ImageBitmaps with `Comlink.transfer`.
- **App state** (`App.tsx`, `hooks.ts`) — palettes, settings and preview background persist to localStorage (`auto-recolor.*` keys) via `usePersistentState` with a validating reader (`readPalettes`, `readSettings`); bad data falls back to defaults. `usePreview` / `useThumbs` re-render through the pool and mark old work stale on every change. `model.ts` owns palette types and output naming (`slug`, `folderName`, `outputsFor` with `-2`, `-3` dedupe).
- **Presets** (`presets.ts`, `PresetLibrary.tsx`) — ready-made community palettes; each must carry `credit` (creator + source URL), which the UI shows.
- **Guide** (`Guide.tsx`, opened from the `?` under the dials) — explains every Tune control with pictures in `public/guide/`. They are real engine output over a drawn sprite (`scripts/guide-images.ts`); regenerate them when the engine or a default changes, and keep the guide's words in step with the dial labels and hints in `SettingsPanel.tsx`.

## UI design

The approved UI ("Cozy Studio": neutral greys, round 3D buttons, picture and palette first, settings in a pull-up drawer on phones) is described in `docs/design.md`, which links the design canvas artifact. Follow it for any UI work.

## Conventions

- **Comments:** only where the code can't speak for itself (a non-obvious why, a gotcha). One short line, plain words. No comments restating the code.
- **UI text:** minimal. If an icon can carry the meaning (add, remove, undo, save, download, settings, show/hide, etc.), use an icon instead of text, with an `aria-label`/`title` for accessibility. Keep any remaining labels and messages to a few words.
- **Icons:** use [lucide-react](https://lucide.dev) (free, ISC). Install it if it isn't a dependency yet, pinned to an exact version like the other deps. Import icons individually (`import { Plus } from 'lucide-react'`).
- TypeScript is strict with `noUncheckedIndexedAccess`, `verbatimModuleSyntax` (use `import type`), and no unused locals/params.
