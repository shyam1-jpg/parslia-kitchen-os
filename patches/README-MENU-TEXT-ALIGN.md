# Fix: Menu Creator layout (centre text + clean allergen footer)

## What you are seeing
On `https://kiteline.uk/menu-creator/` the live preview can show:

- Titles/dishes stuck left, or text tracks shoved sideways
- **No Align control** in the top bar
- **Messy bottom section**: dishes dumped under **Allergen Information**, tiny left-aligned text, QR looking off to the side

That is the old / broken build (or leftover dish text saved in the allergen box).

## What this fix does
- **Align: Left / Center / Right** next to Live preview (Center default)
- Page fit no longer shoves text tracks sideways
- Allergen footer stays a **short centred blurb + centred QR** (never a second dish list)
- Allergen text **does not shrink** when the dish list is long (only dishes are compressed to fit)
- Auto-clears dish dumps pasted into Allergen Information
- Button: **Fix allergen footer layout**

## Fastest fix on the kitchen PC (Kiteline)
1. Open `parslia-kitchen-os\patches\`
2. Double-click **`APPLY-MENU-TEXT-ALIGN.bat`**
3. Point it at your `kitline1` folder if asked
4. Restart Kiteline → open Menu Creator → **Ctrl+Shift+R**
5. Use **Align → Center** in the top bar
6. If the bottom is still messy, click **Fix allergen footer layout** (left panel)

Drop-in files (manual copy):

- `patches/menu-creator-dropin/index.html` → `kitline1/site/menu-creator/index.html`
- `patches/menu-creator-dropin/service-worker.js` → `kitline1/site/menu-creator/service-worker.js`

## Tip
Paste full menus into **Paste full menu — auto generate**, not into **Allergen information text**.

## This repo (GitHub Pages)
After merge: `https://parslia.app/menu-creator/`
