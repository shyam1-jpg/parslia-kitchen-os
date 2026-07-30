# Fix: Menu Creator text alignment (center / left / right)

## Problem
Menu Creator had no control for menu text alignment. Some styles (especially **Modern Minimal**) force left-aligned dish text, so titles and dishes look off-centre with no way to fix them.

## Fix
Adds a **Menu text alignment** control under **Menu style**:

- **Left**
- **Center** (default)
- **Right**

The choice applies to live preview, print/PDF, ebook view, and Word export. It overrides template defaults. **Reset everything** restores center.

## Use now (this repo)
Open after merge / GitHub Pages deploy:

`https://parslia.app/menu-creator/`

Or locally:

```bash
python -m http.server 8000
# open http://localhost:8000/menu-creator/
```

Hard-refresh (**Ctrl+Shift+R**) so the service worker picks up the new cache.

## Apply to Kiteline (`kitline1`)
Cloud Agent cannot push to `kitline1`. From a local `kitline1` clone:

```bash
cd kitline1
git apply /path/to/parslia-kitchen-os/patches/kitline1-menu-creator-text-align.patch
# bump site/menu-creator/service-worker.js CACHE_NAME if needed
git commit -am "Menu Creator: add text alignment (center/left/right)"
git push
```

Then hard-refresh the kitchen PC / phone.

## Apply to standalone `menu-creator` repo
```bash
cd menu-creator
git apply /path/to/parslia-kitchen-os/patches/menu-creator-text-align.patch
git commit -am "Add menu text alignment control (center/left/right)"
git push
```
