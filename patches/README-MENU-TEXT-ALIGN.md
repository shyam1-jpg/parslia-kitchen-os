# Fix: Menu Creator — allergens mixed with menus + centre text

## What you are seeing
On Menu Creator the live preview can show:

- **Dinner menu empty** (“No dishes yet”) while **Allergen Information** lists real dishes
- Dishes stuck under the allergen footer so you cannot manage them as menu items
- Titles/dishes not centred / no Align control (older builds)

That happens when dish lines (e.g. `DISH NAME: Contains: Gluten. (Vegan)`) were saved into **Allergen information text** instead of the dish list.

## How to tell you have the new build
In the Live preview toolbar you should see:
- **Build v9**
- **Align** Left / Center / Right

If those are missing, Kiteline is still on the old Menu Creator — run the bat file below.
- Detects dish dumps in the allergen box (including `Name: Contains: …` lines)
- **Moves those dishes into the menu** and restores the normal allergen blurb
- Blocks pasting menus into the allergen footer (auto-rescue)
- Button: **Fix mixed allergens / move dishes to menu**
- Align: Left / Center / Right (Center default)
- Allergen footer stays full size; only the dish list compresses if needed

## Fastest fix on the kitchen PC (Kiteline)
1. Open `parslia-kitchen-os\patches\`
2. Double-click **`APPLY-MENU-TEXT-ALIGN.bat`**
3. Point it at your `kitline1` folder if asked
4. Restart Kiteline → open Menu Creator → **Ctrl+Shift+R**
5. If dishes still sit under Allergen Information, click **Fix mixed allergens / move dishes to menu**
6. Add further dishes with **Add dish** or **Paste full menu** (not the allergen box)

Drop-in files (manual copy):

- `patches/menu-creator-dropin/index.html` → `kitline1/site/menu-creator/index.html`
- `patches/menu-creator-dropin/service-worker.js` → `kitline1/site/menu-creator/service-worker.js`

## Tip
Paste full menus into **Paste full menu — auto generate**, not into **Allergen information text**.

## This repo (GitHub Pages)
After merge: `https://parslia.app/menu-creator/`
