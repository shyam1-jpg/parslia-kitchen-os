#!/usr/bin/env python3
"""Build a clean, editable plain-text recipe collection from scraped JSON."""

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "vegetarian-recipes.json"
OUT_PATH = ROOT / "vegetarian-recipes.txt"

BRAND_PATTERNS = [
    r"This is a Sanjeev Kapoor exclusive recipe\.?",
    r"This recipe is from FoodFood TV channel\.?",
    r"Sanjeev Kapoor exclusive recipe\.?",
    r"#ProVFoods\s*",
    r"@ProVFoods\s*",
]

PROV_REPLACEMENTS = [
    (r"ProV Fusion Omega Boost Trail Mix", "trail mix"),
    (r"ProV['\u2019]s Omega Boost Trail Mix", "trail mix"),
    (r"ProV Omega Boost Trail Mix", "trail mix"),
    (r"ProV Healthy Seed Mix", "mixed seeds"),
    (r"Pro V Healthy Seed Mix", "mixed seeds"),
    (r"Pro V Regal Jumbo Cranberries", "dried cranberries"),
    (r"Pro V Lite Activated Pecan Nuts", "pecans"),
    (r"Pro V Select Fard Whole Natural Dates", "dates"),
    (r"ProV Select Fard Whole Natural Dates", "dates"),
    (r"Pro V Select Figs \(anjeer\)", "dried figs"),
    (r"Pro V Zahidi Whole Natural Dates \(khajur\)", "dates"),
    (r"Pro V Select Whole Natural Cashew", "cashews"),
    (r"Pro V Cranberries", "dried cranberries"),
    (r"Pro V Regal Walnuts", "walnuts"),
    (r"Pro V Premium Chia Seeds", "chia seeds"),
    (r"Pro V Regal Jumbo Pistachios", "pistachios"),
    (r"Pro V Lite Activated Pecan Nuts", "pecans"),
    (r"Pro V\s+", ""),
    (r"ProV\s+", ""),
]

METADATA_RE = re.compile(
    r"Cuisine|Course|Prep Time|Cook time|Serve\s+\d|Taste|Level of Cooking|Others Veg|"
    r"Main [Ii]ngredients|Ingredients list for",
    re.I,
)

SKIP_LINE_RE = re.compile(
    r"^\d{1,2}$|^\d-\d$|^\d+-\d+$|"
    r"^\d+\s*minutes?\s+Serve$|"
    r"^list for\b",
    re.I,
)


def decode_text(text: str) -> str:
    if not text:
        return ""
    text = html.unescape(text)
    for _ in range(3):
        prev = text
        text = html.unescape(text)
        if text == prev:
            break
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("&quot;", '"').replace("&#39;", "'")
    return text.strip()


def strip_branding(text: str) -> str:
    text = decode_text(text)
    for pattern in BRAND_PATTERNS:
        text = re.sub(pattern, "", text, flags=re.I)
    for old, new in PROV_REPLACEMENTS:
        text = re.sub(old, new, text, flags=re.I)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r'^["\']+|["\']+$', "", text)
    return text.strip()


def simplify_description(desc: str) -> str:
    desc = strip_branding(desc)
    if not desc:
        return ""

    desc = re.sub(r"!\s*Give it a try.*$", ".", desc, flags=re.I)
    desc = re.sub(r"!\s*A perfect blend.*$", ".", desc, flags=re.I)
    desc = re.sub(r"makes up special Arugula", "— arugula", desc, flags=re.I)

    flowery = re.match(
        r"^(A zesty fusion of|A delectable fusion of|A savory symphony of|"
        r"Enriched with|Treat yourself to|Avocado toast gets a vibrant makeover)",
        desc,
        re.I,
    )
    if flowery:
        if re.search(r"avocado toast", desc, re.I):
            return "Toasted sourdough topped with avocado, cream cheese, and mixed seeds."
        if "." in desc:
            first = desc.split(".")[0].strip()
            if len(first) > 25:
                return first + "."

    if len(desc) > 200:
        cut = desc[:200].rsplit(" ", 1)[0]
        return cut.rstrip(",;") + "..."

    return desc


def extract_ingredients(ingredient_lines: list[str]) -> list[str]:
    items: list[str] = []
    for line in ingredient_lines:
        line = decode_text(line)
        if METADATA_RE.search(line):
            if "Ingredients" in line:
                after = re.split(r"Ingredients\s+", line, flags=re.I)
                if len(after) > 1:
                    line = after[-1].strip()
                else:
                    continue
            else:
                continue

        line = strip_branding(line)
        line = re.sub(r"\s+", " ", line).strip()

        if not line or SKIP_LINE_RE.match(line):
            continue
        if len(line) < 3:
            continue
        if re.fullmatch(r"\d+/\d+", line):
            continue

        items.append(line)

    # Deduplicate while preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for item in items:
        key = item.lower()
        if key not in seen:
            seen.add(key)
            unique.append(item)
    return unique


def parse_method(method: str) -> list[str]:
    method = strip_branding(method)
    method = method.strip('"').strip()
    method = re.sub(r"\s+", " ", method)

    steps = re.split(r"(?<=[.!?])\s+(?=[A-Z])", method)
    cleaned: list[str] = []
    for step in steps:
        step = step.strip().rstrip(".")
        if step and len(step) > 5:
            cleaned.append(step)
    return cleaned


def clean_meta_value(val: str) -> str:
    val = decode_text(val)
    val = re.split(r"\s{2,}Prep time|\s{2,}Level of cooking", val, flags=re.I)[0]
    val = re.sub(r"\s+", " ", val).strip()
    return val


def format_metadata(meta: dict) -> str:
    parts = []
    mapping = [
        ("cuisine", "Cuisine"),
        ("course", "Course"),
        ("prep_time", "Prep"),
        ("cook_time", "Cook"),
        ("serve", "Serves"),
        ("taste", "Taste"),
        ("level_of_cooking", "Difficulty"),
    ]
    for key, label in mapping:
        val = meta.get(key, "")
        if val:
            val = clean_meta_value(str(val))
            parts.append(f"{label}: {val}")
    return "  ".join(parts)


def build_recipe_block(recipe: dict) -> str:
    title = decode_text(recipe.get("title", "Untitled"))
    desc = simplify_description(recipe.get("description", ""))
    meta = recipe.get("metadata", {})
    ingredients = extract_ingredients(recipe.get("ingredients", []))
    steps = parse_method(recipe.get("method", ""))

    lines = [
        "─" * 50,
        title,
        "─" * 50,
        "",
    ]

    if desc:
        lines.append(desc)
        lines.append("")

    meta_line = format_metadata(meta)
    if meta_line:
        lines.append(meta_line)
        lines.append("")

    lines.append("Ingredients")
    for item in ingredients:
        lines.append(f"• {item}")
    lines.append("")
    lines.append("Method")
    for i, step in enumerate(steps, 1):
        lines.append(f"{i}. {step}.")
    lines.append("")
    lines.append("")

    return "\n".join(lines)


def main() -> None:
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    recipes = data.get("recipes", [])
    recipes.sort(key=lambda r: decode_text(r.get("title", "")).lower())

    header = [
        "VEGETARIAN RECIPE COLLECTION",
        f"{len(recipes)} recipes",
        "",
        "Plain-text recipes — no source links or chef names.",
        "Edit titles, descriptions, and steps however you like.",
        "",
    ]

    blocks = [build_recipe_block(r) for r in recipes]
    OUT_PATH.write_text("\n".join(header) + "\n".join(blocks), encoding="utf-8")
    print(f"Wrote {OUT_PATH} ({len(recipes)} recipes)")


if __name__ == "__main__":
    main()
