#!/usr/bin/env python3
"""Build onion-garlic-free vegetarian recipes for every Indian state and UT.

Creates recipes/onion-garlic-free-indian/india-states/ with:
  README.md
  excel/ALL-STATES.xlsx
  excel/SHOPPING-LIST.xlsx
  <state>/README.md
  <state>/excel/<id>-recipes.xlsx
  <state>/<course>/<recipe>.md
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import build_continent_recipes as core
from india_state_recipe_data import STATES, build_recipes

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "recipes" / "onion-garlic-free-indian" / "india-states"

README = """# Indian state recipes — onion-garlic-free vegetarian

A full vegetarian menu for **every Indian state and union territory** (28 + 8).

Each dish is **no onion, no garlic, no other alliums**, and cooked in **stainless steel, cast iron, clay, enamel or glass — never aluminium**.

Open first:

- [`excel/ALL-STATES.xlsx`](excel/ALL-STATES.xlsx) — all 252 recipes, filter by state or course
- [`excel/SHOPPING-LIST.xlsx`](excel/SHOPPING-LIST.xlsx)

Diet rules: [../COOKWARE-AND-DIET-RULES.md](../COOKWARE-AND-DIET-RULES.md)

## What you get per state

Starter · Main · Side · Bread · Sweet · Dessert · Salad

## Zones

| Zone | States / UTs |
|------|----------------|
| North | Haryana, Himachal Pradesh, Punjab, Uttar Pradesh, Uttarakhand |
| South | Andhra Pradesh, Karnataka, Kerala, Tamil Nadu, Telangana |
| East | Bihar, Jharkhand, Odisha, West Bengal |
| West | Goa, Gujarat, Maharashtra, Rajasthan |
| Central | Chhattisgarh, Madhya Pradesh |
| Northeast | Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Sikkim, Tripura |
| Union Territory | Andaman and Nicobar, Chandigarh, Dadra and Nagar Haveli and Daman and Diu, Delhi, Jammu and Kashmir, Ladakh, Lakshadweep, Puducherry |

## Rebuild

```bash
python3 scripts/build_india_state_recipes.py
python3 scripts/test_india_state_recipes.py
```
"""


def state_by_id(sid: str) -> dict:
    return next(s for s in STATES if s["id"] == sid)


def write_cover(ws, recipes: list[dict]) -> None:
    core.banner(
        ws,
        "All Indian states and union territories",
        "Vegetarian  ·  onion-garlic-free  ·  no aluminium  ·  28 states + 8 UTs",
        cols=7,
    )
    ws.merge_cells("A5:G5")
    intro = ws.cell(
        5,
        1,
        "252 recipes: seven courses for every state and union territory. "
        "Filter All Recipes, or open a zone sheet. Each state folder also has markdown files and its own Excel workbook.",
    )
    intro.alignment = core.WRAP
    intro.fill = core.SAND
    for col in range(1, 8):
        ws.cell(5, col).fill = core.SAND
    ws.row_dimensions[5].height = 40
    headers = ["State / UT", "Zone", "Kitchen", "Recipes", "Folder", "Workbook", "Courses"]
    for i, h in enumerate(headers, 1):
        cell = ws.cell(7, i, h)
        cell.fill = core.SLATE
        cell.font = core.HEADER_FONT
        cell.border = core.THIN
        cell.alignment = core.CENTER
    row = 8
    for st in STATES:
        recs = [x for x in recipes if x["continent_id"] == st["id"]]
        values = [
            st["name"],
            st["zone"],
            st["community"],
            len(recs),
            f"india-states/{st['folder']}/",
            f"{st['folder']}/excel/{st['id']}-recipes.xlsx",
            "Starter, Main, Side, Bread, Sweet, Dessert, Salad",
        ]
        for i, v in enumerate(values, 1):
            cell = ws.cell(row, i, v)
            cell.alignment = core.WRAP
            cell.border = core.THIN
            cell.font = core.BODY_FONT
            cell.fill = core.CREAM if row % 2 == 0 else core.WHITE
        ws.row_dimensions[row].height = 28
        row += 1
    ws.merge_cells(start_row=row + 1, start_column=1, end_row=row + 1, end_column=7)
    t = ws.cell(
        row + 1,
        1,
        f"Total recipes: {len(recipes)}  ·  States/UTs: {len(STATES)}  ·  Rebuild: python3 scripts/build_india_state_recipes.py",
    )
    t.fill = core.GREEN_SOFT
    t.font = core.BOLD
    for col in range(1, 8):
        ws.cell(row + 1, col).fill = core.GREEN_SOFT
    core.set_widths(ws, {1: 34, 2: 18, 3: 40, 4: 12, 5: 36, 6: 48, 7: 42})
    ws.freeze_panes = "A8"


def build_master(recipes: list[dict], path: Path) -> None:
    wb = core.Workbook()
    cover = wb.active
    cover.title = "Cover"
    write_cover(cover, recipes)
    rules = wb.create_sheet("Rules")
    core.write_rules_sheet(rules)
    all_rows = [core.recipe_row(rec, state_by_id(rec["continent_id"])) for rec in recipes]
    table = wb.create_sheet("All Recipes")
    core.write_table_sheet(
        table,
        "All Indian states — filterable recipe table",
        "Use the drop-downs on row 5 to filter by state (Continent column) or course",
        all_rows,
    )
    zones = []
    for st in STATES:
        if st["zone"] not in zones:
            zones.append(st["zone"])
    for zone in zones:
        recs = [x for x in recipes if state_by_id(x["continent_id"])["zone"] == zone]
        ws = wb.create_sheet(core.sheet_title(zone))
        core.write_table_sheet(
            ws,
            f"{zone} — onion-garlic-free vegetarian",
            "States and UTs in this zone",
            [core.recipe_row(r, state_by_id(r["continent_id"])) for r in recs],
        )
    for cat in ["Starter", "Main", "Side", "Bread", "Sweet", "Dessert", "Salad"]:
        recs = [x for x in recipes if x["category"] == cat]
        ws = wb.create_sheet(core.sheet_title(f"{cat}s"))
        core.write_table_sheet(
            ws,
            f"{cat} — every state",
            "Same course across India",
            [core.recipe_row(r, state_by_id(r["continent_id"])) for r in recs],
        )
    shop = wb.create_sheet("Shopping list")
    core.write_shopping_sheet(shop, recipes, "Master shopping list — all Indian states")
    path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(path)


def build_shopping(recipes: list[dict], path: Path) -> None:
    wb = core.Workbook()
    ws = wb.active
    ws.title = "All states"
    core.write_shopping_sheet(ws, recipes, "Master shopping list — all Indian states")
    zones = []
    for st in STATES:
        if st["zone"] not in zones:
            zones.append(st["zone"])
    for zone in zones:
        recs = [x for x in recipes if state_by_id(x["continent_id"])["zone"] == zone]
        sheet = wb.create_sheet(core.sheet_title(zone))
        core.write_shopping_sheet(sheet, recs, f"{zone} shopping list")
    path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(path)


def write_tree(recipes: list[dict]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    if OUT.exists():
        for path in sorted(OUT.rglob("*"), reverse=True):
            if path == OUT:
                continue
            if path.is_file():
                path.unlink()
            elif path.is_dir():
                path.rmdir()
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "README.md").write_text(README, encoding="utf-8")
    for st in STATES:
        recs = [x for x in recipes if x["continent_id"] == st["id"]]
        base = OUT / st["folder"]
        (base / "excel").mkdir(parents=True, exist_ok=True)
        (base / "README.md").write_text(core.continent_readme(st, recs), encoding="utf-8")
        for rec in recs:
            cat_dir = base / core.CAT_FOLDERS[rec["category"]]
            cat_dir.mkdir(parents=True, exist_ok=True)
            (cat_dir / f"{core.slug(rec['name'])}.md").write_text(
                core.md_for(rec, st), encoding="utf-8"
            )


def main() -> None:
    recipes = build_recipes(core.r)
    expected = len(STATES) * 7
    if len(recipes) != expected:
        from collections import Counter

        counts = Counter(x["continent_id"] for x in recipes)
        missing = [s["id"] for s in STATES if counts.get(s["id"], 0) != 7]
        raise SystemExit(
            f"Expected {expected} recipes, got {len(recipes)}. Uneven states: {missing} {dict(counts)}"
        )
    core.REGIONS = STATES
    write_tree(recipes)
    excel_dir = OUT / "excel"
    excel_dir.mkdir(parents=True, exist_ok=True)
    build_master(recipes, excel_dir / "ALL-STATES.xlsx")
    build_shopping(recipes, excel_dir / "SHOPPING-LIST.xlsx")
    for st in STATES:
        recs = [x for x in recipes if x["continent_id"] == st["id"]]
        core.build_continent_workbook(
            st, recs, OUT / st["folder"] / "excel" / f"{st['id']}-recipes.xlsx"
        )
    print(f"Wrote {len(recipes)} recipes for {len(STATES)} states/UTs")
    print(f"Markdown: {len(list(OUT.rglob('*.md')))}")
    print(f"Excel: {len(list(OUT.rglob('*.xlsx')))}")
    print(f"Root: {OUT}")


if __name__ == "__main__":
    main()
