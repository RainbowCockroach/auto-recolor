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
| `--honey` | `#f8d27a` → `#e4a93f` (gradient), base `#b9852d`, ink `#3d2a0c` | "do it": main actions (Download, Add, Done), nothing else |
| `--sage` | `#8fb7a5` | "on or chosen": dial arc, switch on, pressed buttons, the open tab, pick mode |

The canvas draws `--soft` as `#7a7268` and `--muted` as `#8a8278`. Those are too faint to read on the grey backgrounds (2.9–4.3:1), so use the darker values above. They pass 4.5:1 on every surface. This overrides the canvas.

The selected color (and selected image, result or dial) is shown with a **thin warm-brown ring** (`--soft`, about 2.5px), never an accent color, so the UI never competes with the palette and the ring stays lighter than the candy drops it circles.

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
- **Paint drop** (swatch): a circle with the color as `background-color`, plus `background-image: radial-gradient(circle at 34% 28%, rgba(255,255,255,.6) 0, transparent 32%)` and `box-shadow: inset 0 -4px 6px rgba(0,0,0,.22), inset 0 2px 2px rgba(255,255,255,.3), 0 2px 0 rgba(60,50,40,.22)`. The glossy candy marble is on purpose: keep it. Selected: add `0 0 0 3px <surface>, 0 0 0 5.5px var(--soft)` and `scale(1.08)`. 30px in the phone tray (34px in the Colors drawer), 40px on tablet.
- **Pill toggle** (Painting/Flat/Manga, Original/Result): a sunken `--inset` track; the active option is a raised white pill.
- **Dial** (`DialButton` in `Controls.tsx`): every number setting shows as a small round dial (80px), 3 per row. A ridged rim (`repeating-conic-gradient`) with a raised center face that shows the value in Fredoka, a small ink notch that turns with the value through 270°, and a 6px sage arc around it. It only shows the value: tapping it opens the big gauge. The open one gets the thin brown selection ring.
- **Big gauge** (`Gauge.tsx`, board "Phone · Tap a dial → big gauge" in the canvas). Turning small dials with a thumb was too hard, so they open this instead:
  - A wide half circle: thick sage arc on a grey track, a round raised thumb at the end, 11 tick marks, min and max values under the ends, and the value in big Fredoka inside the arc, where the thumb never covers it.
  - Slide left or right anywhere on it; its full width covers the whole range. Never trace the curve. `touch-action: none`.
  - Round − and + buttons (56px) under it step by one. Double-tap resets to the default. Wheel and arrow keys work on desktop, Esc closes.
  - Header: ‹ and › step to the previous or next setting without closing, with dots showing which one; a honey ✓ closes it.
  - Phones: it rises as its own bottom sheet; the drawer slides out of view (keeping its state) and the download row and color picker hide, so the picture grows to fill the space above. Wide screens: it replaces the dial grid inside the side panel.
- **Switch:** 52×30 sage pill with a raised white knob.
- **Paint strip:** a 18px rounded bar, one flex segment per color. Used for folded palettes.

## Phone layout (narrower than 900px, also tablets held upright)

From top to bottom; nothing is fixed to the top. Keep it compact: 8–10px page margins, a thin card frame (5px) around the well, and the picture inset only 10px inside the well (18px on wide screens). This tighter phone layout overrides the canvas.

1. **Picture card** (takes all spare height). Inside the canvas well:
   - the recolored result, large
   - top-left: a 50px round **pick bubble** with a small pipette badge. It shows the mask view of the image (the part that gets recolored in color, the rest faded grey), so it's clear what the current pick covers. Tapping it starts pick mode: the bubble gets a sage ring, the big picture shows the original with a "Tap the color to replace" chip, and the next tap on the picture picks the color and ends pick mode
   - top-right, in this order: 36px round **Background**, **Original** (toggles the big picture to the original; holding C does the same) and **Mask** buttons. Original and Mask are toggles that switch each other off
   - bottom-left, only with 2+ images: a row of small round **image bubbles** (38px); tapping one switches the preview to that image. The drawer's Images tab still adds and removes images
   - bottom-right: round **View big** button (opens the viewer)
2. **Color name + download row** (one row): round ◀ and ▶ around the color name (Fredoka 16px) with "hex · 14/76", then a compact honey download pill showing only the icon and the file count, plus the round **Save to folder** button when `canSaveToFolder()`.
3. **Palette pills:** hidden when there is only one palette. Otherwise one per palette (34px tall), scrolling sideways. Each shows 3 overlapping sample dots (first, middle, last color), the name and the count. The active pill is raised.
4. **Color tray:** only the active palette's drops (30px on phones) in 2 rows that scroll sideways, with a fade at the right edge. On wide screens it is a grid where about 2½ rows are visible; the rest scrolls inside the tray, with a fade mask at the bottom.
5. **Drawer** (bottom sheet, shadow cast upward). Closed, it is nearly hidden: only a thin 32px semi-transparent (frosted) strip with a small grab handle peeks out, and no buttons. This overrides the canvas, which still draws the 4 tab buttons in the closed state. Open, it has a row of 4 round tab buttons on top:
   - **Images:** round image bubbles plus a dashed + bubble to add PNGs
   - **Colors:** the palette editor (see below)
   - **Tune:** first a tinted "main color" box: the detected color, the colors found in the image, and the "Only the main color" switch, since they belong together. Then Painting/Flat/Manga with a round Reset all button beside it, then a grid of dials (tap one to open the big gauge): Strength, Hue range, Brightness, Hue variety, Saturation, Contrast (Flat has no Contrast; Manga has Shadow shift and Contrast instead of the three middle ones). All dials show at once, with no "More settings" fold. Phone dials are a bit smaller (68px) to keep the drawer short. Under the dials, a round **?** button opens the **guide** (`Guide.tsx`): a full-screen scroll of cards in the same style, one per control, each showing the control's effect on the same demo sprite, with a round close button fixed top-right. The Style row has no room for it on phones
   - **Results:** the output grid of recolored thumbnails; tap one to select that image and color

   **How the drawer opens and closes:**
   - Tapping or dragging up the handle opens the drawer on the last used tab (Tune at first).
   - Inside, tapping a tab button switches to it, and the button turns sage and sinks in. Tapping the open tab, or the handle, closes it.
   - Dragging the handle follows the finger and snaps to closed or open.
   - Open height is about 520px of 844, so the top of the picture stays visible while tuning.
   - When the Colors tab is open it goes taller (about 640px).

**Palette editor (Colors tab):**
- **Header:** "Palettes · 3 · 103 colors", plus round **Library** and **New palette** buttons.
- **One palette open at a time.** It shows:
  - its name field, a delete button and a fold button
  - an **edit box** for the selected color: a big round color-picker drop on the left; next to it the name field gets a full row, and the shorter hex field and the remove button sit under it. One row for all four left the name about 80px wide in the 340px side panel, too small for normal names. It sits above the grid, so it stays reachable in long palettes.
  - an 8-column grid of drops ending with a dashed **+** drop
- **The other palettes are folded:** name, count and a paint strip.
- The undo toast after a removal is a dark ink pill above the drawer, with a round Undo button.

## Tablet and desktop layout (900px and wider)

No top bar. Three columns, with 24px padding:

1. **Left rail** (84px): round image bubbles (selected one has the thin brown selection ring) and a dashed + bubble.
2. **Center:**
   - a big picture card. The pick bubble (112px, showing the mask view) sits at top-left; Background, Original and Mask buttons sit at top-right, View big at bottom-right; a color name chip at bottom-left.
   - under it, one row: on the left ◀ color name ▶ (with "hex · 14/76"); on the right a quiet "3 images × 103 colors" note, the Download pill and the folder button
   - then the palette pills and a wider color tray (40px drops, `auto-fill`, about 2 rows visible), all lined up on the left
3. **Right panel** (340px card): tabs as round buttons with captions (Colors / Tune / Results), showing the same content as the phone drawer. Tune shows the same dial grid as the phone. The card hugs its content (up to full height, then it scrolls) instead of standing as a tall, mostly empty card.

## Viewer (`ImageViewer.tsx`)

- **Full screen**, with a checker or neutral background.
- **Bars are subtle:** slim bars of the same warm clay as the cards (slightly see-through, a light blur, a thin base under them, small 36px clay buttons), sized to their content, so the picture shows through. They fade while you drag a zoomed picture.
- **Top:** a floating rounded bar with the Original/Result pill, a caption (file name or "palette · color") and a round close button.
- **Bottom:** a floating bar with round zoom-out and zoom-in buttons and a % button between them; tapping the % fits the picture to the screen. Buttons go faint at the zoom limits.
- A small hint above it: "Pinch to zoom" ("Scroll to zoom" with a mouse), or "Drag to look around" once zoomed in.
- The behavior already exists in `ImageViewer.tsx` and `ZoomStage.tsx`. Only restyle them.

## Sound and motion

It should feel like a cozy old game: every touch answers right away.

- **Sound** (`src/sound.ts`): cozy, vintage short knocks on a wooden box (no ringing notes) made with Web Audio, no sound files. One listener on the document picks a sound by class, or by `data-sound` (`close`, `rewind`, `poof`, `none`, …) when a button needs a different one. Round buttons sound on press, picks (drops, bubbles, thumbs) on click, so scrolling a row stays quiet. Rows with `data-tick="<px>"` tick once per item scrolled by. Picks are tuned to a pentatonic scale, so runs of them sound like music.
- The gauge makes a tiny soft tap once per step (a touch higher as the value rises), with a soft low bump at either end. Keep it above ~500 Hz: phone speakers barely play anything lower. Fast drags skip ticks rather than buzz.
- Big moments: a quick rising knock-knock-knock when an image is added, a coin when a download finishes (plus a star burst from the Download button) or a color is picked, a gentle "uh-oh" on errors.
- Phones that can vibrate (Android) get a tiny buzz with each press. iPhones ignore it.
- There is no mute button on purpose: people turn the page or device volume down instead.
- **Motion:** presses are instant (≈40ms) and releases spring back with overshoot (`--spring`). Chosen things boing (`@keyframes boing`), the pill and toggled buttons squish, the switch knob stretches while held, dials spin to new values, and the drawer and gauge sheet bounce into place. `prefers-reduced-motion` turns all of it off.

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
- **Main color choices:** under that line, when the image has more than one real color, a row of paint drops (30px) shows the hues found in the image, strongest first; the first is picked by default. Tapping one uses that hue; tapping the first goes back to auto. Each drop's title gives the hue name and coverage ("brown · 23%").
- **"Recoloring…":** a small card-colored pill in the middle of the picture well.

The Mode descriptions ("Keeps shading" / "Gradient map") can shrink to the pill labels; put any longer explanation in `title` tooltips.

## Suggested build order

1. Tokens, fonts, and the base pieces (`.rb`, honey, card, well, drop, pill, dial, switch) in `styles.css`.
2. The phone layout and the drawer component (a new `Drawer.tsx`; tabs reuse `ImagesPanel`, `PalettesPanel`, `SettingsPanel`, `OutputPanel`).
3. The color picker: palette pills, tray, ◀ ▶ stepping (a new `ColorPicker.tsx`, fed by `palettes` and `selectedColorId` from `App.tsx`).
4. The palette editor rework: fold/unfold, edit box, paint strips.
5. The tablet/desktop three-column layout at 900px and wider.
6. Restyle the viewer, the preset library dialog and the toasts.

Check each step at 390×844 (phone), 834×1194 (tablet held upright) and 1194×834 (tablet landscape).
