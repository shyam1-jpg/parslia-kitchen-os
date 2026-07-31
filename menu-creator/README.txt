Menu Creator — fresh rebuild
============================

Open index.html (or https://parslia.app/menu-creator/ after deploy).

Design rules
------------
- Dishes live only in the dish list / menu body
- Allergen Information is a short disclaimer footer only
- Pasting dish text into the allergen box is blocked
- Calendar library uses the same storage keys as before, so existing
  saved menus stay available

Toolbar should show: Build fresh-v1

Legacy
------
index.legacy.html is the previous complex build (kept for reference).

Kiteline apply
--------------
Use patches/APPLY-MENU-TEXT-ALIGN.bat (copies menu-creator-dropin/).
Then Ctrl+Shift+R and confirm Build fresh-v1.
