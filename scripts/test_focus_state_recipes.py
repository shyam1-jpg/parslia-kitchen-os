#!/usr/bin/env python3
"""Check deep-kitchen (focus-state) recipe folders and Excel workbooks."""

from __future__ import annotations

import sys
from collections import Counter
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "recipes" / "onion-garlic-free-indian" / "focus-states"
COURSES = [
    "01-starters",
    "02-mains",
    "03-sides",
    "04-breads",
    "05-sweets",
    "06-desserts",
    "07-salads",
]
REQUIRED_KITCHENS = {
    "14-rajasthan",
    "15-gujarat",
    "16-punjab",
    "17-pan-india",
}
KITCHEN_COUNT = 17
RECIPES_EACH = 21
EXPECTED_RECIPES = KITCHEN_COUNT * RECIPES_EACH  # 357
EXPECTED_MD = 1 + KITCHEN_COUNT + EXPECTED_RECIPES  # cover + kitchen readmes + recipes
EXPECTED_XLSX = 2 + KITCHEN_COUNT  # master + shopping + per kitchen


def fail(msg: str) -> None:
    print(f"FAIL: {msg}")
    sys.exit(1)


def main() -> None:
    if not OUT.is_dir():
        fail(f"missing {OUT}")
    kitchens = sorted(p for p in OUT.iterdir() if p.is_dir() and p.name[:2].isdigit())
    if len(kitchens) != KITCHEN_COUNT:
        fail(f"expected {KITCHEN_COUNT} kitchen folders, got {len(kitchens)}")
    names = {p.name for p in kitchens}
    missing_k = REQUIRED_KITCHENS - names
    if missing_k:
        fail(f"missing requested kitchens: {missing_k}")
    for folder in kitchens:
        if not (folder / "README.md").is_file():
            fail(f"missing README in {folder.name}")
        xlsx = list((folder / "excel").glob("*-recipes.xlsx"))
        if len(xlsx) != 1:
            fail(f"{folder.name} workbooks: {xlsx}")
        for course in COURSES:
            md = list((folder / course).glob("*.md"))
            if len(md) != 3:
                fail(f"{folder.name}/{course}: expected 3 recipes, got {md}")

    master = OUT / "excel" / "FOCUS-STATES.xlsx"
    shopping = OUT / "excel" / "SHOPPING-LIST.xlsx"
    if not master.is_file():
        fail("missing FOCUS-STATES.xlsx")
    if not shopping.is_file():
        fail("missing SHOPPING-LIST.xlsx")

    wb = load_workbook(master, read_only=True, data_only=True)
    required_sheets = {
        "Cover",
        "Rules",
        "All Recipes",
        "Rajasthan",
        "Gujarat",
        "Punjab",
        "Pan-India",
        "Starters",
        "Mains",
        "Sides",
        "Breads",
        "Sweets",
        "Desserts",
        "Salads",
        "Shopping list",
    }
    missing = required_sheets - set(wb.sheetnames)
    if missing:
        fail(f"master missing sheets: {missing}")

    rows = []
    for row in wb["All Recipes"].iter_rows(min_row=6, values_only=True):
        if row[3]:
            rows.append((row[0], row[2], row[3], row[7], row[8], row[9], row[11]))
    if len(rows) != EXPECTED_RECIPES:
        fail(f"All Recipes has {len(rows)} dishes, expected {EXPECTED_RECIPES}")
    if set(Counter(r[0] for r in rows).values()) != {RECIPES_EACH}:
        fail(f"per-kitchen counts {Counter(r[0] for r in rows)}")
    if set(Counter(r[1] for r in rows).values()) != {KITCHEN_COUNT * 3}:
        fail(f"per-course counts {Counter(r[1] for r in rows)}")

    heartland = {"Rajasthan", "Gujarat", "Punjab", "Pan-India"}
    if heartland - {r[0] for r in rows}:
        fail(f"All Recipes missing kitchens: {heartland - {r[0] for r in rows}}")

    for kitchen, _cat, name, cookware, _ings, _method, diet in rows:
        diet_l = (diet or "").lower()
        cook_l = (cookware or "").lower()
        if "no onion" not in diet_l or "no garlic" not in diet_l:
            fail(f"{kitchen}/{name} diet: {diet}")
        if "aluminium" not in cook_l and "aluminum" not in cook_l and "steel" not in cook_l and "iron" not in cook_l and "glass" not in cook_l and "clay" not in cook_l:
            fail(f"{kitchen}/{name} cookware looks unsafe: {cookware}")
        if "aluminium" in cook_l and "never" not in cook_l and "not" not in cook_l:
            fail(f"{kitchen}/{name} aluminium without never/not: {cookware}")

    banner = wb["Cover"]["A3"].value
    if banner is None or "NO ONION" not in str(banner).upper():
        fail(f"cover banner: {banner!r}")
    shop_rows = sum(1 for row in wb["Shopping list"].iter_rows(min_row=6, values_only=True) if row[0])
    wb.close()
    if shop_rows < 400:
        fail(f"shopping list too short: {shop_rows}")

    md_count = len(list(OUT.rglob("*.md")))
    xlsx_count = len(list(OUT.rglob("*.xlsx")))
    if md_count != EXPECTED_MD:
        fail(f"expected {EXPECTED_MD} markdown files, got {md_count}")
    if xlsx_count != EXPECTED_XLSX:
        fail(f"expected {EXPECTED_XLSX} Excel workbooks, got {xlsx_count}")

    print("PASS")
    print(f"  recipes: {EXPECTED_RECIPES} ({KITCHEN_COUNT} kitchens x {RECIPES_EACH})")
    print(f"  markdown: {md_count}")
    print(f"  excel workbooks: {xlsx_count}")
    print(f"  shopping-list rows: {shop_rows}")
    print("  includes: Rajasthan, Gujarat, Punjab, Pan-India")


if __name__ == "__main__":
    main()
