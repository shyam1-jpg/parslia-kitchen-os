#!/usr/bin/env python3
"""Unit checks for Parslia Kitchen OS spec-sheet fields."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from parslia_spec import professionalize
from recipe_cards import html_card, md_card


def fail(msg: str) -> None:
    print(f"FAIL: {msg}")
    sys.exit(1)


def main() -> None:
    rec = professionalize(
        {
            "name": "Hara bhara kebab (no onion garlic)",
            "category": "Starter",
            "community": "Punjabi langar",
            "servings": 4,
            "prep_min": 25,
            "cook_min": 20,
            "cookware": "Cast-iron tawa (not aluminium)",
            "why": "Signature Punjabi starter without onion or garlic.",
            "ingredients": [
                {"qty": "2", "unit": "cups", "item": "spinach blanched", "line": "2 cups spinach blanched"},
                {"qty": "1", "unit": "cup", "item": "peas", "line": "1 cup peas"},
                {"qty": "2", "unit": "tbsp", "item": "besan roasted", "line": "2 tbsp besan roasted"},
                {"qty": "20", "unit": "g", "item": "fresh ginger, crushed", "line": "20 g fresh ginger, crushed"},
                {"qty": "2", "unit": "tbsp", "item": "ghee", "line": "2 tbsp ghee"},
            ],
            "method": ["Mash. Shape. Shallow-fry on tawa."],
            "notes": "",
            "diet": "Vegetarian · no onion · no garlic · no allium · no aluminium",
        }
    )
    if len(rec["method"]) < 8:
        fail(f"override too short: {len(rec['method'])}")
    blob = " ".join(rec["method"]).lower()
    if "blanch" not in blob or "chill" not in blob:
        fail("override missing blanch/chill")
    nut = rec.get("nutrition") or {}
    if not isinstance(nut.get("kcal"), int) or nut["kcal"] <= 0:
        fail(f"nutrition kcal: {nut}")
    if not rec.get("allergens") or not rec.get("chef_notes") or not rec.get("service_notes"):
        fail("missing spec fields")
    kitchen = {"name": "Punjab", "folder": "16-punjab", "community": "Punjabi"}
    md = md_card(rec, kitchen)
    html = html_card(rec, kitchen)
    for text in (md, html):
        if "Parslia Kitchen OS" not in text:
            fail("missing brand")
        if "Nutrition per portion" not in text:
            fail("missing nutrition heading")
        if "Chef notes" not in text or "Service notes" not in text:
            fail("missing chef/service notes")
        if "Mash. Shape. Shallow-fry" in text:
            fail("one-line method leaked into card")
    print("PASS")
    print(f"  hara bhara steps: {len(rec['method'])}")
    print(f"  nutrition: {nut}")
    print(f"  allergens: {rec['allergens'][:3]}")


if __name__ == "__main__":
    main()
