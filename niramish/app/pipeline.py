from __future__ import annotations

from app.parse import ParsedRecipe, parse_recipe
from app.transform import TransformedRecipe, transform_recipe


def build_house_recipe(text: str) -> tuple[ParsedRecipe, TransformedRecipe]:
    parsed = parse_recipe(text)
    if not parsed.ingredients and not parsed.steps:
        raise ValueError("Could not find ingredients or method in that recipe.")
    transformed = transform_recipe(parsed)
    return parsed, transformed
