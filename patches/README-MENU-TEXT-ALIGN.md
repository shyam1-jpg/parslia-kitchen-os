# Menu Creator — fresh rebuild (keeps calendar menus)

## Why
The old Menu Creator mixed dishes into **Allergen Information** and became hard to use.

## What this does
Replaces Menu Creator with a **clean rebuild** (`Build fresh-v1`):

- Dishes only in the menu body
- Allergen Information = short disclaimer footer only (dish paste blocked)
- Same calendar / library storage keys — menus already saved stay available
- Paste full menu → dishes only
- Add dish, multi-day, styles, align, Print/PDF, Word, Save/Open project
- Loads existing bank from `imports/menu-calendar-bundle.json`

## How to tell you have the new build
Toolbar / sidebar shows **Build fresh-v1**.

If you still see the old messy allergen mix and no `Build fresh-v1`, Kiteline has not been updated yet.

## Apply on kitchen PC (Kiteline)
1. Open `parslia-kitchen-os\patches\`
2. Run **`APPLY-MENU-TEXT-ALIGN.bat`**
3. Restart Kiteline → Menu Creator → **Ctrl+Shift+R**
4. Confirm **Build fresh-v1**
5. Open **Browse library** — your calendar menus are still there

Drop-in files:

- `patches/menu-creator-dropin/index.html` → `kitline1/site/menu-creator/index.html`
- `patches/menu-creator-dropin/service-worker.js` → `kitline1/site/menu-creator/service-worker.js`

## Tip
Use **Paste full menu** or **Add dish** for food items. Never put dish names in Allergen Information.
