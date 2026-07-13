#!/usr/bin/env python3
"""Export egg-free vegan/vegetarian recipes to CSV.

Filters out eggs, removes onion & garlic (and close alliums), adds hing
(asafoetida), and writes a UTF-8 CSV suitable for kitchen library import.
"""

from __future__ import annotations

import csv
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TXT_PATH = ROOT / "vegetarian-recipes.txt"
OUT_PATH = ROOT / "data" / "vegan-vegetarian-egg-free-no-onion-garlic.csv"

SEP = "─" * 50

EGG_RE = re.compile(
    r"\b(eggs?|egg whites?|egg yolks?|omelette|omelet|meringue|mayonnaise|mayo)\b",
    re.I,
)
HONEY_RE = re.compile(r"\bhoney\b", re.I)
DAIRY_RE = re.compile(
    r"\b(butter|ghee|paneer|cheese|milk|cream|yoghurt|yogurt|curd|khoya|mawa|"
    r"condensed milk|buttermilk|malai|ricotta|mozzarella|parmesan|cheddar|"
    r"whipped cream|sour cream|whey|labneh|cottage cheese|processed cheese|"
    r"cream cheese|feta|gruyere|cheddar|butter for)\b",
    re.I,
)
PLANT_DAIRY_RE = re.compile(
    r"\b(almond milk|soy milk|soya milk|oat milk|coconut milk|cashew milk|"
    r"rice milk|plant milk|nut milk|vegan butter|coconut cream|coconut yoghurt|"
    r"coconut yogurt)\b",
    re.I,
)

# Onion / garlic / close alliums to strip (Jain / no-onion-garlic style).
ALLIUM_PHRASE_RE = re.compile(
    r"""(?ix)
    \b(?:finely\s+|roughly\s+|chopped\s+|minced\s+|sliced\s+|crushed\s+)*
    (?:
        onions?|
        spring\s+onions?(?:\s+(?:bulbs?|greens?))?|
        green\s+onions?|
        scallions?|
        shallots?|
        garlic(?:\s+cloves?)?|
        ginger[- ]garlic(?:\s+paste)?|
        garlic[- ]ginger(?:\s+paste)?|
        lahsun|
        pyaz
    )
    (?:\s*,)?
    (?:\s+(?:finely\s+)?(?:chopped|minced|sliced|crushed|peeled))*
    """,
)

HING_ALREADY_RE = re.compile(r"\b(hing|asafoetida)\b", re.I)

META_KEYS = [
    ("cuisine", re.compile(r"Cuisine:\s*([^ ]+(?:\s+\S+)?)")),
    ("course", re.compile(r"Course:\s*(.+?)(?=\s{2,}Prep:|\s{2,}Cook:|\s*$)")),
    ("prep", re.compile(r"Prep:\s*(.+?)(?=\s{2,}Cook:|\s{2,}Serves:|\s*$)")),
    ("cook", re.compile(r"Cook:\s*(.+?)(?=\s{2,}Serves:|\s{2,}Taste:|\s*$)")),
    ("serves", re.compile(r"Serves:\s*(.+?)(?=\s{2,}Taste:|\s{2,}Difficulty:|\s*$)")),
    ("taste", re.compile(r"Taste:\s*(.+?)(?=\s{2,}Difficulty:|\s*$)")),
    ("difficulty", re.compile(r"Difficulty:\s*(.+?)\s*$")),
]


def parse_txt_recipes(text: str) -> list[dict]:
    parts = text.split("\n" + SEP + "\n")
    recipes: list[dict] = []
    i = 1
    while i < len(parts):
        title = parts[i].strip()
        body = parts[i + 1].strip() if i + 1 < len(parts) else ""
        recipes.append(parse_body(title, body, source="vegetarian-recipes.txt"))
        i += 2
    return recipes


def parse_body(title: str, body: str, source: str) -> dict:
    lines = [ln.rstrip() for ln in body.splitlines()]
    description = ""
    meta_line = ""
    ingredients: list[str] = []
    method: list[str] = []
    section = "pre"

    for ln in lines:
        stripped = ln.strip()
        if not stripped:
            continue
        if stripped == "Ingredients":
            section = "ingredients"
            continue
        if stripped == "Method":
            section = "method"
            continue
        if section == "pre":
            if stripped.startswith("Cuisine:"):
                meta_line = stripped
            elif not description:
                description = stripped
            continue
        if section == "ingredients":
            item = stripped.lstrip("•*- ").strip()
            if item:
                ingredients.append(item)
            continue
        if section == "method":
            step = re.sub(r"^\d+\.\s*", "", stripped).strip()
            if step:
                method.append(step)

    meta = {}
    if meta_line:
        for key, pattern in META_KEYS:
            m = pattern.search(meta_line)
            if m:
                meta[key] = m.group(1).strip()

    return {
        "title": title,
        "description": description,
        "cuisine": meta.get("cuisine", ""),
        "course": meta.get("course", ""),
        "prep": meta.get("prep", ""),
        "cook": meta.get("cook", ""),
        "serves": meta.get("serves", ""),
        "taste": meta.get("taste", ""),
        "difficulty": meta.get("difficulty", ""),
        "ingredients": ingredients,
        "method": method,
        "source": source,
    }


def contains_egg(recipe: dict) -> bool:
    blob = " ".join(
        [
            recipe["title"],
            recipe["description"],
            " ".join(recipe["ingredients"]),
            " ".join(recipe["method"]),
        ]
    )
    return bool(EGG_RE.search(blob))


def is_vegan(recipe: dict) -> bool:
    blob = " ".join(recipe["ingredients"] + recipe["method"] + [recipe["description"]])
    cleaned = PLANT_DAIRY_RE.sub(" ", blob)
    if DAIRY_RE.search(cleaned):
        return False
    if HONEY_RE.search(blob):
        return False
    return True


def strip_allium_phrases(text: str) -> str:
    text = ALLIUM_PHRASE_RE.sub(" ", text)
    text = re.sub(r"\s{2,}", " ", text)
    text = re.sub(r"\s+,", ",", text)
    text = re.sub(r",\s*,+", ",", text)
    text = re.sub(r"^\s*,\s*|\s*,\s*$", "", text)
    return text.strip(" ,;")


def is_allium_only_ingredient(item: str) -> bool:
    """True when the ingredient line is primarily onion/garlic/allium."""
    if not re.search(
        r"(?i)\b(onions?|spring\s+onions?|green\s+onions?|scallions?|shallots?|"
        r"garlic(?:\s+cloves?)?|lahsun|pyaz|ginger[- ]garlic(?:\s+paste)?|"
        r"garlic[- ]ginger(?:\s+paste)?)\b",
        item,
    ):
        return False
    # Keep compound ingredients that are mainly something else (e.g. tomato-onion mix).
    if re.search(
        r"(?i)\b(tomato|potato|broccoli|tofu|mushroom|capsicum|carrot|spinach|"
        r"paneer|lentil|dal|bean|rice|flour|sauce)\b",
        item,
    ):
        return False
    return True


def transform_recipe(recipe: dict) -> dict:
    """Remove onion/garlic and add hing only when alliums were removed."""
    notes: list[str] = []
    new_ingredients: list[str] = []
    removed_allium = False
    hing_present = any(HING_ALREADY_RE.search(x) for x in recipe["ingredients"])

    for item in recipe["ingredients"]:
        if is_allium_only_ingredient(item):
            removed_allium = True
            continue

        before = item
        cleaned = strip_allium_phrases(item)
        if HING_ALREADY_RE.search(cleaned):
            hing_present = True
        if not cleaned or len(cleaned) < 2:
            # Phrase stripping cleared an allium-heavy line.
            if before != cleaned:
                removed_allium = True
            continue
        if cleaned != before and re.search(
            r"(?i)\b(onions?|garlic|shallots?|spring\s+onions?|scallions?)\b",
            before,
        ):
            removed_allium = True
        new_ingredients.append(cleaned)

    new_method: list[str] = []
    for step in recipe["method"]:
        before = step
        cleaned = strip_allium_phrases(step)
        cleaned = re.sub(
            r"(?i)\b(add|saut[eé]|fry|cook)\b\s+(the\s+)?(?:onion|garlic|shallot)s?\b"
            r"[^.]*?(?:until\s+translucent)?",
            r"\1 until fragrant",
            cleaned,
        )
        cleaned = re.sub(r"\s{2,}", " ", cleaned).strip(" ,;")
        if cleaned and len(cleaned) > 3:
            if cleaned != before and re.search(
                r"(?i)\b(onions?|garlic|shallots?|spring\s+onions?|scallions?)\b",
                before,
            ):
                removed_allium = True
            new_method.append(cleaned)

    hing_added = False
    if removed_allium and not hing_present:
        insert_at = 0
        for idx, item in enumerate(new_ingredients):
            if re.search(r"\b(oil|ghee|cumin|mustard seeds|temper)\b", item, re.I):
                insert_at = idx + 1
                break
        new_ingredients.insert(insert_at, "1 pinch hing (asafoetida)")
        hing_added = True
        for i, step in enumerate(new_method):
            if re.search(
                r"(?i)\b(heat oil|heat.*oil|temper|tadka|mustard seeds|cumin seeds)\b",
                step,
            ):
                if not HING_ALREADY_RE.search(step):
                    new_method[i] = step.rstrip(".") + ", then add a pinch of hing."
                break
        else:
            if new_method:
                new_method.insert(
                    min(1, len(new_method)),
                    "Warm a pinch of hing in a little hot oil before adding the main ingredients.",
                )

    if removed_allium:
        notes.append("Removed onion/garlic (and related alliums).")
    if hing_added:
        notes.append("Added hing (asafoetida).")
    notes.append("Egg-free.")
    diet = ["vegetarian", "egg-free"]
    if is_vegan({**recipe, "ingredients": new_ingredients, "method": new_method}):
        diet.insert(0, "vegan")
    else:
        diet.append("lacto-vegetarian")

    return {
        **recipe,
        "ingredients": new_ingredients,
        "method": new_method,
        "diet_tags": "; ".join(diet),
        "adaptations": " ".join(notes),
    }


def botanical_kitchen_miso_recipe() -> dict:
    """Adapted from Botanical Kitchen public description.

    Full member-only ingredient amounts were not publicly readable; this version
    follows the published dish concept (sheet-pan tofu, broccoli & cashews in a
    sesame-ginger-miso marinade), kept vegan/egg-free, with no onion/garlic and hing added.
    """
    recipe = {
        "title": "Miso Chilli Roasted Tofu, Broccoli & Cashews (No Onion/Garlic)",
        "description": (
            "Easy sheet-pan dinner: tofu, broccoli and cashews roasted in an umami-rich "
            "sesame, ginger and miso marinade. Adapted egg-free vegan style without onion "
            "or garlic; hing stands in for allium depth. Serve over noodles, steamed vegetables "
            "or a crunchy cabbage salad."
        ),
        "cuisine": "Fusion",
        "course": "Main Course",
        "prep": "15 minutes",
        "cook": "25-30 minutes",
        "serves": "4",
        "taste": "Umami & Spicy",
        "difficulty": "Easy",
        "ingredients": [
            "400 g firm tofu, pressed and cubed",
            "1 large head broccoli, cut into florets",
            "75 g raw cashews",
            "2 tablespoons white or chickpea miso paste",
            "2 tablespoons tamari or soy sauce",
            "1 tablespoon toasted sesame oil",
            "1 tablespoon neutral oil",
            "1 tablespoon maple syrup",
            "1 tablespoon rice vinegar",
            "1 tablespoon grated fresh ginger",
            "1-2 teaspoons chilli flakes or chilli paste, to taste",
            "1 pinch hing (asafoetida)",
            "1 tablespoon sesame seeds (optional)",
            "Fresh mint or coriander leaves, to finish (optional)",
        ],
        "method": [
            "Heat the oven to 200°C / 400°F. Line a large baking tray.",
            "Warm the neutral oil briefly, bloom the hing in it for a few seconds, then whisk with miso, tamari, sesame oil, maple syrup, rice vinegar, ginger and chilli until smooth.",
            "Toss the tofu cubes in half the marinade and spread on the tray.",
            "Toss broccoli and cashews with the remaining marinade and arrange around the tofu in a single layer.",
            "Roast 25-30 minutes, turning once, until the tofu is golden at the edges and the broccoli is tender with charred tips.",
            "Scatter sesame seeds and herbs if using, and serve hot.",
        ],
        "source": "https://www.botanicalkitchen.com/recipes/miso-chill-roasted-tofu-broccoli-cashews/",
    }
    adapted = transform_recipe(recipe)
    adapted["adaptations"] = (
        "Reconstructed from Botanical Kitchen public recipe description "
        "(member-only full amounts were not publicly readable). "
        "Kept vegan and egg-free; no onion or garlic; hing (asafoetida) added for allium-free savoury depth."
    )
    adapted["diet_tags"] = "vegan; vegetarian; egg-free"
    return adapted


def to_row(recipe: dict) -> dict:
    return {
        "title": recipe["title"],
        "description": recipe["description"],
        "cuisine": recipe["cuisine"],
        "course": recipe["course"],
        "prep": recipe["prep"],
        "cook": recipe["cook"],
        "serves": recipe["serves"],
        "taste": recipe["taste"],
        "difficulty": recipe["difficulty"],
        "diet_tags": recipe["diet_tags"],
        "ingredients": " | ".join(recipe["ingredients"]),
        "method": " | ".join(f"{i}. {s}" for i, s in enumerate(recipe["method"], 1)),
        "adaptations": recipe["adaptations"],
        "source": recipe["source"],
    }


def main() -> None:
    text = TXT_PATH.read_text(encoding="utf-8")
    parsed = parse_txt_recipes(text)

    kept: list[dict] = []
    skipped_egg = 0
    for recipe in parsed:
        if contains_egg(recipe):
            skipped_egg += 1
            continue
        kept.append(transform_recipe(recipe))

    # Prefer the adapted Botanical Kitchen recipe at the top of the export.
    kept.insert(0, botanical_kitchen_miso_recipe())

    # Deduplicate by normalised title (keep first / adapted version).
    seen: set[str] = set()
    unique: list[dict] = []
    for recipe in kept:
        key = re.sub(r"[^a-z0-9]+", "", recipe["title"].lower())
        # Collapse the adapted BK title with any close local title.
        key_simple = key.replace("nooniongarlic", "")
        if key in seen or key_simple in seen:
            continue
        seen.add(key)
        seen.add(key_simple)
        unique.append(recipe)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "title",
        "description",
        "cuisine",
        "course",
        "prep",
        "cook",
        "serves",
        "taste",
        "difficulty",
        "diet_tags",
        "ingredients",
        "method",
        "adaptations",
        "source",
    ]
    with OUT_PATH.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fieldnames, quoting=csv.QUOTE_MINIMAL)
        writer.writeheader()
        for recipe in unique:
            writer.writerow(to_row(recipe))

    vegan_n = sum(1 for r in unique if "vegan" in r["diet_tags"])
    print(
        f"Wrote {OUT_PATH} with {len(unique)} recipes "
        f"({vegan_n} vegan-tagged, skipped {skipped_egg} with egg)."
    )


if __name__ == "__main__":
    main()
