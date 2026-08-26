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
    return [parse_ingredient(i) for i in recipe.get("ingredients") or []]


def md_card(recipe: dict, kitchen: dict) -> str:
    rows = measured(recipe)
    total = int(recipe["prep_min"]) + int(recipe["cook_min"])
    body = [
        f"| Qty | Unit | Ingredient |",
        f"|-----|------|------------|",
    ]
    for row in rows:
        qty = row["qty"] or "—"
        unit = row["unit"] or "—"
        body.append(f"| {qty} | {unit} | {row['item']} |")
    steps = "\n".join(f"{n}. {s}" for n, s in enumerate(recipe["method"], 1))
    notes = f"\n## Chef notes\n\n{recipe['notes']}\n" if recipe.get("notes") else ""
    return f"""# {recipe['name']}

**Recipe card** · {kitchen['name']} kitchen · {recipe['category']}

| | |
|---|---|
| **Kitchen** | {kitchen['name']} — {recipe['community']} |
| **Course** | {recipe['category']} |
| **Serves** | {recipe['servings']} |
| **Prep** | {recipe['prep_min']} min |
| **Cook** | {recipe['cook_min']} min |
| **Total** | {total} min |
| **Cookware** | {recipe['cookware']} |
| **Diet** | {recipe['diet']} |

{recipe['why']}

## Ingredients *(for {recipe['servings']} servings)*

{chr(10).join(body)}

## Method

{steps}
{notes}"""


def html_card(recipe: dict, kitchen: dict) -> str:
    rows = measured(recipe)
    total = int(recipe["prep_min"]) + int(recipe["cook_min"])
    trs = []
    for row in rows:
        trs.append(
            "<tr>"
            f"<td class='qty'>{html.escape(row['qty'] or '—')}</td>"
            f"<td class='unit'>{html.escape(row['unit'] or '—')}</td>"
            f"<td>{html.escape(row['item'])}</td>"
            "</tr>"
        )
    steps = "".join(f"<li>{html.escape(s)}</li>" for s in recipe["method"])
    notes = (
        f"<section class='notes'><h2>Chef notes</h2><p>{html.escape(recipe['notes'])}</p></section>"
        if recipe.get("notes")
        else ""
    )
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(recipe['name'])} · {html.escape(kitchen['name'])} recipe card</title>
<style>
  :root {{ --ink:#1c1917; --saffron:#9a3412; --green:#14532d; --red:#7f1d1d; --cream:#fff7ed; --sand:#ffedd5; --line:#e7d5c4; }}
  * {{ box-sizing: border-box; }}
  body {{ margin:0; background:#f4efe6; color:var(--ink); font-family: Georgia, "Times New Roman", serif; }}
  .card {{ max-width: 820px; margin: 24px auto; background:#fffaf3; border: 8px solid var(--saffron); box-shadow: 0 12px 40px rgba(0,0,0,.12); }}
  header {{ background: var(--saffron); color:#fff; padding: 22px 28px 18px; }}
  .eyebrow {{ margin:0 0 6px; letter-spacing:.18em; font-size: 11px; font-family: Calibri, Arial, sans-serif; font-weight:700; }}
  h1 {{ margin:0 0 10px; font-size: 34px; line-height:1.15; }}
  .badges {{ margin:0; font-family: Calibri, Arial, sans-serif; font-size: 12px; letter-spacing:.04em; background:var(--red); display:inline-block; padding:6px 10px; }}
  .meta {{ display:grid; grid-template-columns: repeat(4,1fr); gap:0; border-bottom:1px solid var(--line); font-family: Calibri, Arial, sans-serif; }}
  .meta div {{ padding:12px 16px; border-right:1px solid var(--line); background: var(--sand); }}
  .meta div:last-child {{ border-right:0; }}
  .meta dt {{ font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:#7c2d12; margin:0; }}
  .meta dd {{ margin:2px 0 0; font-size:20px; font-weight:700; }}
  .why, .cookware {{ padding: 14px 28px; font-size: 16px; }}
  .cookware {{ background:#dcfce7; color:var(--green); font-family: Calibri, Arial, sans-serif; font-weight:700; }}
  .grid {{ display:grid; grid-template-columns: 1.05fr 1fr; }}
  section {{ padding: 8px 28px 24px; }}
  h2 {{ font-family: Calibri, Arial, sans-serif; font-size: 13px; letter-spacing:.16em; text-transform:uppercase; color:var(--saffron); border-bottom:2px solid var(--saffron); padding-bottom:6px; }}
  table {{ width:100%; border-collapse: collapse; font-family: Calibri, Arial, sans-serif; }}
  th {{ text-align:left; font-size:11px; letter-spacing:.08em; text-transform:uppercase; border-bottom:1px solid var(--line); padding:6px 8px; }}
  td {{ padding:7px 8px; border-bottom:1px solid var(--line); vertical-align:top; }}
  .qty, .unit {{ width:64px; font-variant-numeric: tabular-nums; font-weight:700; }}
  ol {{ margin:0; padding-left: 22px; }}
  li {{ margin: 0 0 10px; line-height:1.45; }}
  .notes {{ background:#fee2e2; }}
  footer {{ padding:12px 28px 18px; font-family: Calibri, Arial, sans-serif; font-size:12px; color:#57534e; }}
  @media print {{
    body {{ background:#fff; }}
    .card {{ margin:0; box-shadow:none; border-width:4px; }}
  }}
  @media (max-width: 700px) {{
    .meta, .grid {{ grid-template-columns: 1fr 1fr; }}
  }}
</style>
</head>
<body>
<article class="card">
  <header>
    <p class="eyebrow">{html.escape(kitchen['name'].upper())} · {html.escape(str(recipe['category']).upper())} · RECIPE CARD</p>
    <h1>{html.escape(recipe['name'])}</h1>
    <p class="badges">{html.escape(recipe['diet']).upper()}</p>
  </header>
  <dl class="meta">
    <div><dt>Serves</dt><dd>{html.escape(str(recipe['servings']))}</dd></div>
    <div><dt>Prep</dt><dd>{html.escape(str(recipe['prep_min']))} min</dd></div>
    <div><dt>Cook</dt><dd>{html.escape(str(recipe['cook_min']))} min</dd></div>
    <div><dt>Total</dt><dd>{total} min</dd></div>
  </dl>
  <p class="cookware">Cookware: {html.escape(recipe['cookware'])}</p>
  <p class="why">{html.escape(recipe['why'])}</p>
  <div class="grid">
    <section>
      <h2>Ingredients · {html.escape(str(recipe['servings']))} servings</h2>
      <table>
        <thead><tr><th>Qty</th><th>Unit</th><th>Ingredient</th></tr></thead>
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
  {notes}
  <footer>One recipe card · {html.escape(kitchen['name'])} kitchen folder · Never cook in aluminium · No onion or garlic</footer>
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
            items.append(
                f"<li><a href='{html.escape(href)}'>{html.escape(rec['name'])}</a>"
                f" <span>{rec['prep_min']+rec['cook_min']} min · serves {rec['servings']}</span></li>"
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
    <p>Kitchen workbook (one sheet = one recipe card): <a href="excel/{html.escape(xlsx_name)}">{html.escape(xlsx_name)}</a></p>
    <p>Open a card below. Print from the browser for a kitchen copy.</p>
  </div>
  {''.join(blocks)}
</main>
</body>
</html>
"""
