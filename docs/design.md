# UI design: "Cozy Studio"

The approved look and layout for Auto Recolor on phone, tablet and desktop. Build the UI to match this.

**Design canvas (source of truth for visuals):** https://claude.ai/artifact/7RJHkG6sfRKu4P45D4MLgR
It is private to the repo owner. In Claude Code, read it with the Artifact tool (`action: "read"`, and `path` set to one of the files below), not WebFetch. Each board is a self-contained HTML file. Copy the exact numbers (sizes, shadows, colors) from it.

| Board | File | Shows |
|---|---|---|
| Kit | `project/Kit.dc.html` | fonts, color tokens, icons, the basic pieces |
| Phone · Main | `project/Main.dc.html` | main phone screen; drawer closed and open (interactive) |
| Phone · Colors drawer pulled up | `project/MobileColors.dc.html` | palette editor inside the drawer |
| Phone · View big | `project/Viewer.dc.html` | full-screen viewer (`ImageViewer.tsx`) |
| Tablet · landscape | `project/Tablet.dc.html` | wide layout, three columns |
| Sprite | `project/Sprite.dc.html` | demo pixel art only, not part of the app |

If the canvas and this file disagree, the canvas wins on visuals and this file wins on behavior.

## Goals (from the owner)

- **Simple.** Artists must not feel overwhelmed. Few things on screen, advanced options hidden.
- **Neutral background**, so palette colors read true. No colorful UI chrome near the swatches.
- **Mood:** an artsy canvas mixed with a cozy game. Not modern, techy, dark or HUD-like. A dark "game HUD" version was rejected.
- **Round buttons wherever possible, and 3D effects:** chunky, pressable, soft shadows.
- **On phones, the picture and the palette are the center.** Settings live in a drawer that peeks from the bottom.
- **No app name on screen.** Keep `<title>` only.
- **Download buttons sit right below the picture.**
- **Palettes can be huge** (Sorbets has 76 colors; users stack several, 100+ in total). Every color display must scale.

## Tokens

Light theme only. Drop the current `prefers-color-scheme: dark` block.

| Token | Value | Use |
|---|---|---|
| `--table` | `#e4e2de` | page background |
| `--card` | `#f6f5f2` | cards, drawer, raised surfaces |
| `--well` | `#cfccc6` | the "canvas well" behind the picture |
| `--inset` | `#e4e1dc` | sunken fields, pill tracks |
| `--inner` | `#ecebe7` | nested panels inside a card |
| `--ink` | `#3a3530` | text, selection ring |
| `--soft` | `#5d564e` | secondary text, inactive labels |
| `--muted` | `#655e55` | counts, hex codes, numbers |
| `--line` | `#c6c1b9` | the 3D "base" under raised things |
| `--honey` | `#f8d27a` → `#e4a93f` (gradient), base `#b9852d`, ink `#3d2a0c` | main action (Download) and the open tab, nothing else |
| `--sage` | `#8fb7a5` | slider fill, switch on |

The canvas draws `--soft` as `#7a7268` and `--muted` as `#8a8278`. Those are too faint to read on the grey backgrounds (2.9–4.3:1), so use the darker values above. They pass 4.5:1 on every surface. This overrides the canvas.

The selected color is shown with a **dark ink ring**, never an accent color, so the UI never competes with the palette.

Checker background for "checker" mode: `#d3d0cb` / `#c9c6c0`, 24px squares on the full-size viewer and smaller in wells.

## Type

Both fonts are free on Google Fonts. Install them as `@fontsource-variable/*` packages pinned to exact versions, and remove Bricolage Grotesque, Figtree and JetBrains Mono.

- **Fredoka** (500–600): color names, titles, numbers (%, counts, hex codes), button text on the Download pill.
- **Nunito** (600–800): labels and body. Labels are bold (700) at about 15px; tab captions are 11px bold.

There is no monospace font any more. Hex codes and file names use Fredoka.

## 3D recipes

- **Round button** (`.rb`): 48px circle (40px small), `background: linear-gradient(#fdfcfa, #e9e6e0)`, `box-shadow: inset 0 2px 0 #fff, inset 0 -2px 0 rgba(0,0,0,.05), 0 3px 0 var(--line), 0 5px 9px rgba(70,60,50,.13)` (toned down from the canvas, which is deeper). On press: move it down 3px and shrink the base shadow, so it "pushes in". Lucide icon at 19–22px, stroke 2.2. Icon only, with `aria-label` and `title`.
- **Honey button:** same shape with the honey gradient and base `#b9852d`. Download is a wide honey pill: "⬇ Download 103".
- **Card:** radius 24px (28px on tablet), `box-shadow: inset 0 2px 0 #fff, 0 5px 0 #d3cfc8, 0 10px 22px rgba(70,60,50,.1)`.
- **Canvas well** (behind the picture): `--well` with `inset 0 3px 8px rgba(60,50,40,.18)`, radius 16px, inside a card with 10px padding.
- **Paint drop** (swatch): a circle with the color as `background-color`, plus `background-image: radial-gradient(circle at 34% 28%, rgba(255,255,255,.6) 0, transparent 32%)` and `box-shadow: inset 0 -4px 6px rgba(0,0,0,.22), inset 0 2px 2px rgba(255,255,255,.3), 0 2px 0 rgba(60,50,40,.22)`. Selected: add `0 0 0 3px <surface>, 0 0 0 6px var(--ink)` and `scale(1.08)`. 30px in the phone tray (34px in the Colors drawer), 40px on tablet.
- **Pill toggle** (Natural/Legacy/Stylized, Original/Result): a sunken `--inset` track; the active option is a raised white pill.
- **Slider:** 14px round track, sage fill up to the value, sunken shadow; 30px round raised knob.
- **Switch:** 52×30 sage pill with a raised white knob.
- **Paint strip:** a 18px rounded bar, one flex segment per color. Used for folded palettes.

## Phone layout (narrower than 900px, also tablets held upright)

From top to bottom; nothing is fixed to the top. Keep it compact: 8–10px page margins, a thin card frame (5px) around the well, and the picture inset only 10px inside the well (18px on wide screens). This tighter phone layout overrides the canvas.

1. **Picture card** (takes all spare height). Inside the canvas well:
   - the recolored result, large
   - top-left: a 50px round **original bubble** with a small pipette badge. Tapping it starts pick mode: the bubble gets a honey ring, the big picture shows the original with a "Tap the color to replace" chip, and the next tap on the picture picks the color and ends pick mode
   - top-right: 36px round **Background** and **Mask** buttons
   - bottom-left, only with 2+ images: a row of small round **image bubbles** (38px); tapping one switches the preview to that image. The drawer's Images tab still adds and removes images
   - bottom-right: round **View big** button (opens the viewer)
2. **Color name + download row** (one row): round ◀ and ▶ around the color name (Fredoka 16px) with "hex · 14/76", then a compact honey download pill showing only the icon and the file count, plus the round **Save to folder** button when `canSaveToFolder()`.
3. **Palette pills:** hidden when there is only one palette. Otherwise one per palette (34px tall), scrolling sideways. Each shows 3 overlapping sample dots (first, middle, last color), the name and the count. The active pill is raised.
4. **Color tray:** only the active palette's drops (30px on phones) in 2 rows that scroll sideways, with a fade at the right edge. On wide screens it is a grid where about 2½ rows are visible; the rest scrolls inside the tray, with a fade mask at the bottom.
5. **Drawer** (bottom sheet, shadow cast upward). Closed, it is nearly hidden: only a thin 32px semi-transparent (frosted) strip with a small grab handle peeks out, and no buttons. This overrides the canvas, which still draws the 4 tab buttons in the closed state. Open, it has a row of 4 round tab buttons on top:
   - **Images:** round image bubbles plus a dashed + bubble to add PNGs
   - **Colors:** the palette editor (see below)
   - **Tune:** Natural/Legacy/Stylized, Strength, "Only the main color" switch, then Hue range, Brightness match, Hue variety, Saturation, Contrast (Legacy has no Contrast; Stylized has Shadow/highlight shift and Contrast)
   - **Results:** the output grid of recolored thumbnails; tap one to select that image and color

   **How the drawer opens and closes:**
   - Tapping or dragging up the handle opens the drawer on the last used tab (Tune at first).
   - Inside, tapping a tab button switches to it, and the button turns honey. Tapping the open tab, or the handle, closes it.
   - Dragging the handle follows the finger and snaps to closed or open.
   - Open height is about 520px of 844, so the top of the picture stays visible while tuning.
   - When the Colors tab is open it goes taller (about 640px).

**Palette editor (Colors tab):**
- **Header:** "Palettes · 3 · 103 colors", plus round **Library** and **New palette** buttons.
- **One palette open at a time.** It shows:
  - its name field, a delete button and a fold button
  - an **edit box** for the selected color: a round color-picker drop, a name field, a hex field and a remove button. It sits above the grid, so it stays reachable in long palettes.
  - an 8-column grid of drops ending with a dashed **+** drop
- **The other palettes are folded:** name, count and a paint strip.
- The undo toast after a removal is a dark ink pill above the drawer, with a round Undo button.

## Tablet and desktop layout (900px and wider)

No top bar. Three columns, with 24px padding:

1. **Left rail** (84px): round image bubbles (selected one has an ink ring) and a dashed + bubble.
2. **Center:**
   - a big picture card. The original sits in a 112px bubble at top-left; Background, Mask and View big buttons sit at top-right; a color name chip at bottom-left.
   - under it: the Download pill, the folder button and a quiet "3 images × 103 colors" note
   - then the palette pills, the ◀ "14 of 76" ▶ control and a wider color tray (40px drops, `auto-fill`, about 2 rows visible)
3. **Right panel** (340px card): tabs as round buttons with captions (Colors / Tune / Results), showing the same content as the phone drawer. Tune shows the basic controls first and keeps the rest behind "More settings".

## Viewer (`ImageViewer.tsx`)

- **Full screen**, with a checker or neutral background.
- **Top:** a floating rounded bar with the Original/Result pill, a caption (file name or "palette · color") and a round close button.
- **Bottom:** a floating bar with round 3D zoom-out and zoom-in buttons and a % button between them; tapping the % fits the picture to the screen. Buttons go faint at the zoom limits.
- A small hint above it: "Pinch to zoom" ("Scroll to zoom" with a mouse), or "Drag to look around" once zoomed in.
- The behavior already exists in `ImageViewer.tsx` and `ZoomStage.tsx`. Only restyle them.

## Things to keep from the current app

All existing behavior stays the same:
- picking the replace color by tapping the original
- mask view
- background modes
- undo after removing a palette or color
- the preset library (keep the `credit` line visible)
- drag-and-drop of PNGs anywhere on the page
- localStorage persistence

Where things that had no spot in the boards now go:
- **Export progress:** inside the Download pill (e.g. "12/103"), with a thin honey progress bar under it.
- **Status and warning messages** ("Saved 103 files into …", load errors, "That spot is transparent…"): the same dark ink toast pill as Undo, shown briefly above the drawer (phone) or at the bottom of the center column (tablet).
- **Main color info and reset:** the first line of the Tune tab shows a small dot and "Main color: green · 62%", plus "auto" or a round reset button when the color was picked by hand ("Back to auto-detect"). On tablet, the same line appears under the original bubble.
- **"Recoloring…":** a small card-colored pill in the middle of the picture well.

The Mode descriptions ("Keeps shading" / "Gradient map") can shrink to the pill labels; put any longer explanation in `title` tooltips.

## Suggested build order

1. Tokens, fonts, and the base pieces (`.rb`, honey, card, well, drop, pill, slider, switch) in `styles.css`.
2. The phone layout and the drawer component (a new `Drawer.tsx`; tabs reuse `ImagesPanel`, `PalettesPanel`, `SettingsPanel`, `OutputPanel`).
3. The color picker: palette pills, tray, ◀ ▶ stepping (a new `ColorPicker.tsx`, fed by `palettes` and `selectedColorId` from `App.tsx`).
4. The palette editor rework: fold/unfold, edit box, paint strips.
5. The tablet/desktop three-column layout at 900px and wider.
6. Restyle the viewer, the preset library dialog and the toasts.

Check each step at 390×844 (phone), 834×1194 (tablet held upright) and 1194×834 (tablet landscape).
