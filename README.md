# auto-recolor

Recolor PNG sprites into every color of your palettes, sorted into folders.

```
recolored.zip
  tree/
    tree_warm_red.png
    tree_warm_pink.png
    tree_cool_blue.png
  lake/
    lake_warm_red.png
```

Live at https://rainbowcockroach.github.io/auto-recolor/ (deployed from `main` by GitHub Actions).

## Using it

1. **Images**: drop PNGs on the page.
2. **Palettes**: add palettes and colors (color picker or hex code). Names become file names. Saved in your browser.
3. **Mode**:
   - **Natural** keeps each pixel's shading and the small color differences, and only swaps hue and saturation.
   - **Stylized** is a gradient map: cool shadows, your color in the middle, warm highlights.
4. **What to recolor**: *Main color only* finds the image's main color (e.g. the leaves) and leaves the rest alone. Click the preview to choose a different color.
5. **Save**: “Save to folder…” (Chrome/Edge) writes the folders straight to disk. “Download ZIP” works everywhere.

## How it works

- **Color math** is done with [culori](https://culorijs.org) in OKLab/OKLCH, a color space where lightness matches what the eye sees. Colors the screen can't show are brought into sRGB with the CSS Color 4 gamut-mapping algorithm, which lowers saturation and keeps lightness and hue.
- **PNG files** are read and written with [fast-png](https://github.com/image-js/fast-png), not a browser canvas. That keeps semi-transparent edges exact (a canvas premultiplies alpha), keeps 16-bit images 16-bit, and never touches pixels that aren't recolored.
- **Speed**: the result depends only on a pixel's color, so each unique color is computed once (a 725×917 sprite has about 57k unique colors). The work runs in Web Workers ([Comlink](https://github.com/GoogleChromeLabs/comlink)), spread across CPU cores.
- **ZIP** files are made with [fflate](https://github.com/101arrowz/fflate).

```
src/engine/   color math, PNG, analysis, recoloring (no browser APIs, unit tested)
src/worker/   Web Worker and the pool that schedules work
src/components/  React UI
```

## Development

Needs Node 22.12 or newer.

```
npm install
npm run dev        # local dev server
npm test           # unit tests
npm run typecheck
npm run lint
npm run build      # production build into dist/
```
