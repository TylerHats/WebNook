# Dual-Anchor Visual Sticker Studio

The **Visual Sticker Studio** lets you layer preset and custom uploaded stickers over or behind your Nook cards while keeping positions deterministic across desktop, tablet, and mobile viewports.

## How Dual Anchoring Works

In WebNook v3.4.0+, both the **Visual Sticker Studio** and the live **Nook View** share the same `1200px` `.nook-container` geometry and expose `data-sticker-anchor` targets for every card (`header`, `c_bio`, `c_music`, ..., `guestbook`).

Every sticker supports two anchor modes:
1. **Pin to Card (`anchor_type: 'card'`, default for new stickers):**
   - Stores `(pos_x, pos_y)` as `0.0–100.0%` relative to the target card's bounding box (`Profile Header Banner`, `About Me`, `Top Friends`, `Guestbook Notes`, etc.).
   - Measured dynamically via `ResizeObserver` and `MutationObserver` so even if async widgets expand or desktop 2-column grids reflow to 1 column on mobile, **card-pinned stickers stay locked to their card**.
2. **Free Canvas (`anchor_type: 'container'`):**
   - Stores `(pos_x, pos_y)` as `0.0–100.0%` relative to `.nook-container`.
   - Switching between **Pin to Card** and **Free Canvas** (or changing target cards) uses `convertStickerAnchor()` so the sticker stays visually in place without jumping.

## Studio Controls & Keyboard Shortcuts

- **Viewport Preview Switcher:** Toggle live between **Desktop (`1200px`)**, **Tablet (`768px`)**, and **Mobile (`390px`)** right inside the studio to verify layout stability before saving.
- **Direct On-Canvas Handles:** Click any sticker to reveal top rotation (`↻`, hold `Shift` for 15° snapping), bottom-right scale (`↘`), and quick delete (`🗑`) handles. Dragging preserves pointer capture and initial grab offset cleanly.
- **Ghost Cards Mode:** Makes cards translucent and click-through so you can grab and adjust stickers placed on the **Behind Cards** layer.
- **Upload Custom Stickers:** Click **Upload Image** inside the studio toolbar to convert PNG/JPG/WebP/GIF images to lossless WebP stickers directly.
- **Keyboard Shortcuts:**
  - `Ctrl+Z` / `Cmd+Z`: Undo
  - `Ctrl+Y` / `Ctrl+Shift+Z`: Redo
  - `Arrow Keys`: Nudge selected sticker by `0.5%` (hold `Shift` for `2.5%` steps)
  - `Delete` / `Backspace`: Remove selected sticker

