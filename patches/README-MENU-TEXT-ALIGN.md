# Fix: Menu Creator text stuck on the left (no way to centre)

## What you are seeing
On `https://kiteline.uk/menu-creator/` the live preview can show:

- Titles and dishes stuck on the **left** / tracks shoved sideways
- Empty space on one side of the page
- **No Align control** in the top bar
- **Dishes mixed under “Allergen Information”** (menu items appear in the allergen block)

That is the old / broken build. This fix:

- Adds **Align: Left / Center / Right** in the Live preview toolbar (Center default)
- Stops page fit/scale from shoving left-aligned lines sideways
- Detects dishes wrongly saved in Allergen Information and moves them back into the menu
- Adds button **Fix: move dishes out of Allergen info**

## Fastest fix on the kitchen PC (Kiteline)
1. Open this folder: `parslia-kitchen-os\patches\`
2. Double-click **`APPLY-MENU-TEXT-ALIGN.bat`**
3. Point it at your `kitline1` folder if asked
4. Restart Kiteline, open Menu Creator, press **Ctrl+Shift+R**
5. Use the green **Align → Center** buttons next to **Live preview**

Drop-in files (manual copy):

- `patches/menu-creator-dropin/index.html` → `kitline1/site/menu-creator/index.html`
- `patches/menu-creator-dropin/service-worker.js` → `kitline1/site/menu-creator/service-worker.js`

## Git apply (developers)
```bash
cd kitline1
git apply /path/to/parslia-kitchen-os/patches/kitline1-menu-creator-text-align.patch
# also copy service-worker.js CACHE_NAME bump from menu-creator-dropin/
```

## This repo (GitHub Pages)
After merge: `https://parslia.app/menu-creator/`

## Standalone `menu-creator` repo
Copy `patches/menu-creator-dropin/index.html` over that repo’s `index.html` (Kiteline build is the newer base).
