# Menu Creator — Generate fix + Print Now

## If you need to print today
1. Run `patches/OPEN-PRINT-MENU-NOW.bat`
2. Or open `menu-creator/PRINT-NOW.html` in Chrome
3. Paste → Make menu → Print / Save PDF

Dishes cannot jump into Allergen Information in that tool.

## Fix Kiteline Menu Creator
1. Run `patches/APPLY-MENU-TEXT-ALIGN.bat`
2. Restart Kiteline → Menu Creator → Ctrl+Shift+R
3. Confirm green banner **Generate fix active** / **Build fix-v3**

## What was wrong
Old Generate could save pasted dishes into Allergen Information text.
Build fix-v3: Generate writes dishes only into Dishes, allergen footer stays the disclaimer.

Calendar / library menus are kept (same storage keys).
