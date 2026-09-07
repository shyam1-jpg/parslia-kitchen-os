"""Professional recipe-card layout: measured ingredients, one dish per card."""

from __future__ import annotations

import html
import re

QTY = r"(?:\d+\s*)?(?:[½¼¾⅓⅔⅛]|[0-9]+/[0-9]+|[0-9]+(?:\.[0-9]+)?)"
UNITS = (
    "pods",
    "pod",
    "as needed",
    "tablespoons",
    "tablespoon",
    "teaspoons",
    "teaspoon",
    "tbsp",
    "tsp",
    "cups",
    "cup",
    "pinches",
    "pinch",
    "pieces",
    "piece",
    "pcs",
    "cloves",
    "clove",
    "sprigs",
    "sprig",
    "leaves",
    "leaf",
    "sticks",
    "stick",
    "handfuls",
    "handful",
    "bunches",
    "bunch",
    "slices",
    "slice",
    "packets",
    "packet",
    "cans",
    "can",
    "kg",
    "g",
    "ml",
    "l",
    "L",
    "cm",
    "inch",
    "in",
)
UNIT_RE = "|".join(re.escape(u) for u in UNITS)
LINE_RE = re.compile(rf"^\s*({QTY})\s+({UNIT_RE})\b\.?\s+(.*\S)\s*$", re.I)
COUNT_RE = re.compile(rf"^\s*({QTY})\s+(.*\S)\s*$")
PINCH_RE = re.compile(r"^\s*(?:a\s+)?pinch\s+of\s+(.*\S)\s*$", re.I)


def _norm_unit(unit: str) -> str:
    u = (unit or "").strip().lower()
    aliases = {
        "teaspoon": "tsp",
        "teaspoons": "tsp",
        "tablespoon": "tbsp",
        "tablespoons": "tbsp",
        "pcs": "pieces",
        "piece": "pieces",
        "l": "L",
        "in": "inch",
    }
    return aliases.get(u, u if u != "l" else "L") or unit


def parse_ingredient(item) -> dict:
    if isinstance(item, dict):
        qty = str(item.get("qty", "")).strip()
        unit = _norm_unit(str(item.get("unit", "")).strip())
        name = str(item.get("item") or item.get("name") or "").strip()
        return pack(qty, unit, name)
    if isinstance(item, (tuple, list)) and len(item) >= 3:
        return pack(item[0], item[1], item[2])
    text = str(item).strip()
    m = LINE_RE.match(text)
    if m:
        return pack(m.group(1), m.group(2), m.group(3))
    m = PINCH_RE.match(text)
    if m:
        return pack("1", "pinch", m.group(1))
    m = COUNT_RE.match(text)
    if m and not LINE_RE.match(text):
        return pack(m.group(1), "", m.group(2))
    return pack("", "", text)


def pack(qty, unit, name) -> dict:
    qty = str(qty).strip()
    unit = _norm_unit(str(unit).strip())
    name = str(name).strip().rstrip(".")
    parts = [p for p in (qty, unit, name) if p]
    return {"qty": qty, "unit": unit, "item": name, "line": " ".join(parts)}


def normalize_ingredients(items) -> list[dict]:
    if not items:
        return []
    if isinstance(items, str):
        items = [items]
    return [parse_ingredient(i) for i in items]


def ingredient_line(item) -> str:
    if isinstance(item, dict):
        return item.get("line") or pack(item.get("qty"), item.get("unit"), item.get("item")).get("line", "")
    return parse_ingredient(item)["line"]


def ingredient_blob(recipe: dict) -> str:
    return " ".join(ingredient_line(i) for i in recipe.get("ingredients") or [])


def measured(recipe: dict) -> list[dict]:
    out = []
    for item in recipe.get("ingredients") or []:
        row = parse_ingredient(item)
        if isinstance(item, dict) and item.get("approx"):
            row["approx"] = item["approx"]
        out.append(row)
    return out


def spec_meta(recipe: dict, kitchen: dict) -> dict:
    nut = recipe.get("nutrition") or {}
    return {
        "brand": recipe.get("brand") or "Parslia Kitchen OS",
        "pure": recipe.get("pure") or "Pure Prasad · No onion · No garlic · No eggs · No meat · No fish",
        "printed": recipe.get("printed") or "",
        "yield_label": recipe.get("yield_label") or f"{recipe.get('servings', 4)} portions",
        "portion_label": recipe.get("portion_label") or "1 portion",
        "service": recipe.get("service") or "Hot",
        "time_label": recipe.get("time_label")
        or f"Prep {recipe.get('prep_min', 0)} min · Cook {recipe.get('cook_min', 0)} min",
        "tags": recipe.get("tags") or ["Vegetarian", "No onion", "No garlic"],
        "allergens": recipe.get("allergens") or [],
        "chef_notes": recipe.get("chef_notes") or recipe.get("notes") or "",
        "service_notes": recipe.get("service_notes") or "",
        "disclaimer": recipe.get("nutrition_disclaimer")
        or "Nutrition is a kitchen estimate from typical produce values, not a laboratory analysis.",
        "kcal": nut.get("kcal", "—"),
        "protein": nut.get("protein_g", "—"),
        "carbs": nut.get("carbs_g", "—"),
        "fat": nut.get("fat_g", "—"),
        "fibre": nut.get("fibre_g", "—"),
        "course_line": f"{recipe.get('category', '')} {kitchen.get('name', '')}".strip(),
    }


def md_card(recipe: dict, kitchen: dict) -> str:
    meta = spec_meta(recipe, kitchen)
    rows = measured(recipe)
    body = [
        "| Qty | Unit | Approx | Ingredient |",
        "|-----|------|--------|------------|",
    ]
    for row in rows:
        qty = row["qty"] or "—"
        unit = row["unit"] or "—"
        approx = row.get("approx") or "—"
        body.append(f"| {qty} | {unit} | {approx} | {row['item']} |")
    steps = "\n".join(f"{n}. {s}" for n, s in enumerate(recipe["method"], 1))
    tags = ", ".join(meta["tags"])
    allergens = "\n".join(f"- {a}" for a in meta["allergens"]) or "- Verify labels before service"
    chef = meta["chef_notes"]
    service = meta["service_notes"]
    return f"""# {recipe['name']}

**{meta['brand']}** · RECIPE CARD

{meta['pure']}

Printed: {meta['printed']}

**{meta['course_line']}**

{recipe['why']}

| YIELD | PORTION | SERVICE | TIME |
|---|---|---|---|
| {meta['yield_label']} | {meta['portion_label']} | {meta['service']} | {meta['time_label']} |

**Tags:** {tags}

**Kitchen:** {kitchen['name']} — {recipe['community']}

**Cookware:** {recipe['cookware']}

**Diet:** {recipe['diet']}

## Ingredients *(for {meta['yield_label']})*

{chr(10).join(body)}

## Method

{steps}

## Nutrition per portion

| kcal | Protein | Carbs | Fat | Fibre |
|---|---|---|---|---|
| {meta['kcal']} | {meta['protein']} g | {meta['carbs']} g | {meta['fat']} g | {meta['fibre']} g |

{meta['disclaimer']}

## Allergens

{allergens}

## Chef notes

{chef}

## Service notes

{service}
"""


def html_card(recipe: dict, kitchen: dict) -> str:
    meta = spec_meta(recipe, kitchen)
    rows = measured(recipe)
    slug = re.sub(r"[^a-z0-9]+", "-", recipe["name"].lower()).strip("-")
    trs = []
    for row in rows:
        trs.append(
            "<tr>"
            f"<td class='qty'>{html.escape(row['qty'] or '—')}</td>"
            f"<td class='unit'>{html.escape(row['unit'] or '—')}</td>"
            f"<td class='approx'>{html.escape(row.get('approx') or '')}</td>"
            f"<td>{html.escape(row['item'])}</td>"
            "</tr>"
        )
    steps = "".join(f"<li>{html.escape(s)}</li>" for s in recipe["method"])
    tags = "".join(f"<span>{html.escape(t)}</span>" for t in meta["tags"])
    allergens = "".join(f"<li>{html.escape(a)}</li>" for a in meta["allergens"]) or "<li>Verify labels before service</li>"
    chef = html.escape(meta["chef_notes"])
    service = html.escape(meta["service_notes"])
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(recipe['name'])} · {html.escape(meta['brand'])}</title>
<style>
  * {{ box-sizing: border-box; }}
  body {{ margin:0; background:#f4f4f5; color:#111; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; }}
  .sheet {{ max-width: 880px; margin: 20px auto; background:#fff; padding: 28px 32px 40px; border: 1px solid #e5e5e5; }}
  .topline {{ display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }}
  .brand {{ margin:0; letter-spacing:.18em; font-size:11px; font-weight:700; text-transform:uppercase; }}
  .pure {{ margin:4px 0 0; font-size:12px; color:#444; }}
  .printed {{ margin:0; font-size:11px; color:#666; white-space:nowrap; }}
  .course {{ margin:18px 0 0; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:#555; }}
  h1 {{ margin:4px 0 10px; font-size:32px; line-height:1.15; font-weight:700; }}
  .lead {{ margin:0 0 16px; font-size:15px; color:#333; line-height:1.45; }}
  .meta {{ display:grid; grid-template-columns: repeat(4,1fr); border:1px solid #ddd; margin: 0 0 12px; }}
  .meta div {{ padding:10px 12px; border-right:1px solid #ddd; }}
  .meta div:last-child {{ border-right:0; }}
  .meta dt {{ font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:#666; margin:0; }}
  .meta dd {{ margin:4px 0 0; font-size:15px; font-weight:700; }}
  .tags {{ margin: 0 0 14px; }}
  .tags span {{ display:inline-block; border:1px solid #ccc; padding:3px 8px; margin:0 6px 6px 0; font-size:11px; }}
  .cookware {{ margin:0 0 16px; font-size:13px; color:#14532d; font-weight:700; }}
  .grid {{ display:grid; grid-template-columns: 0.95fr 1.05fr; gap: 28px; }}
  h2 {{ font-size:12px; letter-spacing:.16em; text-transform:uppercase; border-bottom:1px solid #111; padding-bottom:6px; margin: 18px 0 10px; }}
  table {{ width:100%; border-collapse: collapse; font-size:13px; }}
  th {{ text-align:left; font-size:10px; letter-spacing:.08em; text-transform:uppercase; border-bottom:1px solid #ddd; padding:6px 6px; color:#555; }}
  td {{ padding:6px; border-bottom:1px solid #eee; vertical-align:top; }}
  .qty, .unit, .approx {{ width:58px; font-variant-numeric: tabular-nums; font-weight:700; }}
  ol {{ margin:0; padding-left: 20px; }}
  li {{ margin: 0 0 9px; line-height:1.45; font-size:14px; }}
  .nut {{ display:grid; grid-template-columns: repeat(5,1fr); border:1px solid #ddd; margin: 8px 0; }}
  .nut div {{ padding:10px 8px; text-align:center; border-right:1px solid #ddd; }}
  .nut div:last-child {{ border-right:0; }}
  .nut dt {{ font-size:10px; letter-spacing:.12em; text-transform:uppercase; color:#666; }}
  .nut dd {{ margin:3px 0 0; font-size:18px; font-weight:700; }}
  .disc {{ font-size:12px; color:#555; }}
  .notes p, .allergens li {{ font-size:14px; line-height:1.5; }}
  footer {{ margin-top:22px; padding-top:12px; border-top:1px solid #ddd; font-size:11px; color:#555; }}
  .dl a {{ display:inline-block; margin:10px 8px 0 0; padding:8px 12px; background:#111; color:#fff !important; text-decoration:none; font-size:13px; }}
  @media print {{
    body {{ background:#fff; }}
    .sheet {{ margin:0; border:0; max-width:none; }}
    .dl {{ display:none; }}
  }}
  @media (max-width: 700px) {{
    .meta, .grid, .nut {{ grid-template-columns: 1fr 1fr; }}
    .sheet {{ padding: 18px; }}
  }}
</style>
</head>
<body>
<article class="sheet">
  <div class="topline">
    <div>
      <p class="brand">{html.escape(meta['brand'])}</p>
      <p class="pure">{html.escape(meta['pure'])}</p>
    </div>
    <p class="printed">Printed {html.escape(str(meta['printed']))}</p>
  </div>
  <p class="course">{html.escape(meta['course_line'])}</p>
  <h1>{html.escape(recipe['name'])}</h1>
  <p class="lead">{html.escape(recipe['why'])}</p>
  <p class="dl">
    <a href="{html.escape(slug)}.pdf" download>Download this recipe (PDF)</a>
    <a href="../../download/{html.escape(kitchen['folder'])}.zip" download>Download {html.escape(kitchen['name'])} kitchen ZIP</a>
  </p>
  <dl class="meta">
    <div><dt>Yield</dt><dd>{html.escape(meta['yield_label'])}</dd></div>
    <div><dt>Portion</dt><dd>{html.escape(meta['portion_label'])}</dd></div>
    <div><dt>Service</dt><dd>{html.escape(str(meta['service']))}</dd></div>
    <div><dt>Time</dt><dd>{html.escape(meta['time_label'])}</dd></div>
  </dl>
  <div class="tags">{tags}</div>
  <p class="cookware">Cookware: {html.escape(recipe['cookware'])}</p>
  <div class="grid">
    <section>
      <h2>Ingredients · {html.escape(meta['yield_label'])}</h2>
      <table>
        <thead><tr><th>Qty</th><th>Unit</th><th>Approx</th><th>Ingredient</th></tr></thead>
        <tbody>
          {''.join(trs)}
        </tbody>
      </table>
    </section>
    <section>
      <h2>Method</h2>
      <ol>{steps}</ol>
    </section>
  </div>
  <section>
    <h2>Nutrition per portion</h2>
    <dl class="nut">
      <div><dt>kcal</dt><dd>{html.escape(str(meta['kcal']))}</dd></div>
      <div><dt>Protein</dt><dd>{html.escape(str(meta['protein']))} g</dd></div>
      <div><dt>Carbs</dt><dd>{html.escape(str(meta['carbs']))} g</dd></div>
      <div><dt>Fat</dt><dd>{html.escape(str(meta['fat']))} g</dd></div>
      <div><dt>Fibre</dt><dd>{html.escape(str(meta['fibre']))} g</dd></div>
    </dl>
    <p class="disc">{html.escape(meta['disclaimer'])}</p>
  </section>
  <section class="allergens">
    <h2>Allergens</h2>
    <ul>{allergens}</ul>
  </section>
  <section class="notes">
    <h2>Chef notes</h2>
    <p>{chef}</p>
  </section>
  <section class="notes">
    <h2>Service notes</h2>
    <p>{service}</p>
  </section>
  <footer>{html.escape(meta['brand'])} · Pure Prasad · {html.escape(kitchen['name'])} kitchen · Never cook in aluminium</footer>
</article>
</body>
</html>
"""


def html_kitchen_index(kitchen: dict, recipes: list[dict], xlsx_name: str) -> str:
    order = ["Starter", "Main", "Side", "Bread", "Sweet", "Dessert", "Salad"]
    folders = {
        "Starter": "01-starters",
        "Main": "02-mains",
        "Side": "03-sides",
        "Bread": "04-breads",
        "Sweet": "05-sweets",
        "Dessert": "06-desserts",
        "Salad": "07-salads",
    }
    blocks = []
    for cat in order:
        recs = [x for x in recipes if x["category"] == cat]
        if not recs:
            continue
        items = []
        for rec in recs:
            slug = re.sub(r"[^a-z0-9]+", "-", rec["name"].lower()).strip("-")
            href = f"{folders[cat]}/{slug}.html"
            pdf = f"{folders[cat]}/{slug}.pdf"
            items.append(
                f"<li><a href='{html.escape(href)}'>{html.escape(rec['name'])}</a>"
                f" <span>{rec['prep_min']+rec['cook_min']} min · serves {rec['servings']}</span>"
                f" · <a href='{html.escape(pdf)}' download>PDF</a></li>"
            )
        blocks.append(f"<h2>{html.escape(cat)}</h2><ul>{''.join(items)}</ul>")
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(kitchen['name'])} · recipe cards</title>
<style>
  body {{ margin:0; background:#fff7ed; color:#1c1917; font-family: Calibri, Arial, sans-serif; }}
  main {{ max-width: 880px; margin: 0 auto; padding: 28px 20px 60px; }}
  h1 {{ color:#9a3412; margin-bottom: 6px; }}
  .lead {{ font-size: 18px; }}
  .warn {{ background:#7f1d1d; color:#fff; padding:10px 14px; font-weight:700; }}
  a {{ color:#9a3412; font-weight:700; }}
  ul {{ line-height: 1.8; }}
  span {{ color:#57534e; font-weight:400; }}
  .box {{ background:#fff; border:1px solid #e7d5c4; padding:16px 18px; margin: 16px 0; }}
</style>
</head>
<body>
<main>
  <h1>{html.escape(kitchen['name'])} recipe cards</h1>
  <p class="lead">{html.escape(kitchen['community'])}. {len(recipes)} dishes. Each dish is its own card with measurements.</p>
  <p class="warn">VEGETARIAN · NO ONION · NO GARLIC · NO ALUMINIUM COOKWARE</p>
  <div class="box">
    <p><strong>Download this kitchen</strong></p>
    <p><a href="../download/{html.escape(kitchen['folder'])}.zip" download>ZIP pack</a>
       (Excel + 21 PDF cards + HTML)</p>
    <p><a href="../download/{html.escape(kitchen['folder'])}-recipes.pdf" download>All 21 cards in one PDF</a></p>
    <p>Kitchen workbook: <a href="excel/{html.escape(xlsx_name)}" download>{html.escape(xlsx_name)}</a></p>
  </div>
  {''.join(blocks)}
</main>
</body>
</html>
"""
