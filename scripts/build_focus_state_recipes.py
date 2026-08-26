#!/usr/bin/env python3
"""Build deep vegetarian libraries for the requested Indian kitchens."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import build_continent_recipes as core
from focus_state_recipe_data import FOCUS_STATES, build_recipes

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "recipes" / "onion-garlic-free-indian" / "focus-states"

README = """# Focus kitchens — lots of vegetarian recipes

Deep onion-garlic-free vegetarian libraries for the states (and Mithila) you asked for.

Each dish is **no onion, no garlic**, cooked in **steel, iron, clay or glass — never aluminium**.

Open first:

- [`excel/FOCUS-STATES.xlsx`](excel/FOCUS-STATES.xlsx) — all recipes, filter by kitchen or course
- [`excel/SHOPPING-LIST.xlsx`](excel/SHOPPING-LIST.xlsx)

Diet rules: [../COOKWARE-AND-DIET-RULES.md](../COOKWARE-AND-DIET-RULES.md)

## Kitchens (21 recipes each)

| Folder | Kitchen | Why this list is big |
|--------|---------|----------------------|
| `01-goa` | Goa | Coconut, kokum, khatkhate, sannas, bebinca |
| `02-maharashtra` | Maharashtra | Pithla, varan, modak, koshimbir, vrat food |
| `03-odisha` | Odisha | Jagannath-style dalma, pitha, chhena sweets |
| `04-west-bengal` | West Bengal | Niramish shukto, posto, sandesh, payesh |
| `05-andhra-pradesh` | Andhra Pradesh | Gongura, pulihora, pesarattu, pachadi |
| `06-kerala` | Kerala | Full sadya: avial, olan, puttu, payasam |
| `07-manipur` | Manipur | Chamthong, ooti, singju, chak-hao |
| `08-meghalaya` | Meghalaya | Rice cakes, sesame greens, pumpkin stew |
| `09-uttarakhand` | Uttarakhand | Kafuli, phaanu, chainsoo, bal mithai |
| `10-uttar-pradesh` | Uttar Pradesh | Braj temple kachori, aloo tamatar, petha |
| `11-bihar` | Bihar | Litti-chokha, sattu, thekua, ghugni |
| `12-mithila` | Mithila | Maithil makhana, pua, dahi-chura, kadhi |
| `13-karnataka` | Karnataka | Udupi bisi bele, neer dosa, obbattu |
| `14-rajasthan` | Rajasthan | Dal baati, gatte, ker sangri, ghevar, churma |
| `15-gujarat` | Gujarat | Dhokla, khandvi, undhiyu, thepla, shrikhand |
| `16-punjab` | Punjab | Sarson saag, langar dal, makki roti, pinni |
| `17-pan-india` | Pan-India | Dal tadka, palak paneer, roti, gulab jamun, kheer |

3 starters, 3 mains, 3 sides, 3 breads, 3 sweets, 3 desserts, 3 salads per kitchen.

## Rebuild

```bash
python3 scripts/build_focus_state_recipes.py
python3 scripts/test_focus_state_recipes.py
```
"""


def by_id(sid: str) -> dict:
    return next(s for s in FOCUS_STATES if s["id"] == sid)


def write_cover(ws, recipes: list[dict]) -> None:
    core.banner(
        ws,
        "Focus Indian kitchens — lots of vegetarian recipes",
        "Goa · Maharashtra · Odisha · Bengal · Andhra · Kerala · Manipur · Meghalaya · Uttarakhand · UP · Bihar · Mithila · Karnataka · Rajasthan · Gujarat · Punjab · Pan-India",
        cols=6,
    )
    ws.merge_cells("A5:F5")
    intro = ws.cell(
        5,
        1,
        f"{len(recipes)} onion-garlic-free vegetarian recipes. 21 dishes per kitchen. "
        "Each kitchen folder has markdown files and its own Excel workbook.",
    )
    intro.alignment = core.WRAP
    intro.fill = core.SAND
    for col in range(1, 7):
        ws.cell(5, col).fill = core.SAND
    ws.row_dimensions[5].height = 36
    headers = ["Kitchen", "Zone", "Recipes", "Folder", "Workbook", "Courses"]
    for i, h in enumerate(headers, 1):
        cell = ws.cell(7, i, h)
        cell.fill = core.SLATE
        cell.font = core.HEADER_FONT
        cell.border = core.THIN
    row = 8
    for st in FOCUS_STATES:
        recs = [x for x in recipes if x["continent_id"] == st["id"]]
        values = [
            st["name"],
            st["zone"],
            len(recs),
            f"focus-states/{st['folder']}/",
            f"{st['folder']}/excel/{st['id']}-recipes.xlsx",
            "3 each: starter, main, side, bread, sweet, dessert, salad",
        ]
        for i, v in enumerate(values, 1):
            cell = ws.cell(row, i, v)
            cell.alignment = core.WRAP
            cell.border = core.THIN
            cell.font = core.BODY_FONT
            cell.fill = core.CREAM if row % 2 == 0 else core.WHITE
        ws.row_dimensions[row].height = 24
        row += 1
    ws.merge_cells(start_row=row + 1, start_column=1, end_row=row + 1, end_column=6)
    t = ws.cell(row + 1, 1, f"Total: {len(recipes)} recipes · Rebuild: python3 scripts/build_focus_state_recipes.py")
    t.fill = core.GREEN_SOFT
    t.font = core.BOLD
    for col in range(1, 7):
        ws.cell(row + 1, col).fill = core.GREEN_SOFT
    core.set_widths(ws, {1: 22, 2: 14, 3: 12, 4: 28, 5: 42, 6: 48})
    ws.freeze_panes = "A8"


def build_master(recipes: list[dict], path: Path) -> None:
    wb = core.Workbook()
    cover = wb.active
    cover.title = "Cover"
    write_cover(cover, recipes)
    core.write_rules_sheet(wb.create_sheet("Rules"))
    all_rows = [core.recipe_row(rec, by_id(rec["continent_id"])) for rec in recipes]
    core.write_table_sheet(
        wb.create_sheet("All Recipes"),
        "Focus kitchens — filterable table",
        "Filter Continent column by kitchen, or Category by course",
        all_rows,
    )
    for st in FOCUS_STATES:
        recs = [x for x in recipes if x["continent_id"] == st["id"]]
        core.write_table_sheet(
            wb.create_sheet(core.sheet_title(st["name"])),
            st["name"],
            st["community"],
            [core.recipe_row(r, st) for r in recs],
        )
    for cat in ["Starter", "Main", "Side", "Bread", "Sweet", "Dessert", "Salad"]:
        recs = [x for x in recipes if x["category"] == cat]
        core.write_table_sheet(
            wb.create_sheet(core.sheet_title(f"{cat}s")),
            f"{cat} — all focus kitchens",
            "Same course across all focus kitchens",
            [core.recipe_row(r, by_id(r["continent_id"])) for r in recs],
        )
    core.write_shopping_sheet(
        wb.create_sheet("Shopping list"),
        recipes,
        "Shopping list — focus kitchens",
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(path)


def write_tree(recipes: list[dict]) -> None:
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
    for st in FOCUS_STATES:
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
    from collections import Counter

    recipes = build_recipes(core.r)
    expected = len(FOCUS_STATES) * 21
    if len(recipes) != expected:
        counts = Counter(x["continent_id"] for x in recipes)
        raise SystemExit(f"Expected {expected}, got {len(recipes)} {dict(counts)}")
    by_cat = Counter((x["continent_id"], x["category"]) for x in recipes)
    bad = [k for k, v in by_cat.items() if v != 3]
    if bad:
        raise SystemExit(f"Need 3 per course per kitchen, uneven: {bad[:12]}")

    core.REGIONS = FOCUS_STATES
    write_tree(recipes)
    excel = OUT / "excel"
    excel.mkdir(parents=True, exist_ok=True)
    build_master(recipes, excel / "FOCUS-STATES.xlsx")
    shop_wb_path = excel / "SHOPPING-LIST.xlsx"
    wb = core.Workbook()
    ws = wb.active
    ws.title = "All kitchens"
    core.write_shopping_sheet(ws, recipes, "Shopping list — all focus kitchens")
    for st in FOCUS_STATES:
        recs = [x for x in recipes if x["continent_id"] == st["id"]]
        core.write_shopping_sheet(
            wb.create_sheet(core.sheet_title(st["name"])),
            recs,
            f"{st['name']} shopping list",
        )
    wb.save(shop_wb_path)
    for st in FOCUS_STATES:
        recs = [x for x in recipes if x["continent_id"] == st["id"]]
        core.build_continent_workbook(
            st, recs, OUT / st["folder"] / "excel" / f"{st['id']}-recipes.xlsx"
        )
    print(f"Wrote {len(recipes)} recipes for {len(FOCUS_STATES)} kitchens")
    print(f"Markdown: {len(list(OUT.rglob('*.md')))}")
    print(f"Excel: {len(list(OUT.rglob('*.xlsx')))}")


if __name__ == "__main__":
    main()
