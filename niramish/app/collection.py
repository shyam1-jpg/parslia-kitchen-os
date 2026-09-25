"""Read commercial cookbook-style recipe cards."""

from __future__ import annotations

import re

from app.config import ROOT
from app.parse import ParsedRecipe, parse_recipe

DIVIDER = re.compile(r"─{10,}")
SOURCE_PATH = ROOT / "samples" / "source-recipes.txt"


def parse_collection(text: str) -> list[ParsedRecipe]:
    chunks = [chunk.strip() for chunk in DIVIDER.split(text)]
    recipes: list[ParsedRecipe] = []
    index = 0
    while index < len(chunks):
        chunk = chunks[index]
        if not chunk or chunk.upper().startswith("VEGETARIAN RECIPE"):
            index += 1
            continue
        lines = [line.strip() for line in chunk.splitlines() if line.strip()]
        if len(lines) == 1 and index + 1 < len(chunks):
            title = lines[0]
            body = chunks[index + 1].strip()
            recipes.append(parse_recipe(f"{title}\n{body}"))
            index += 2
            continue
        index += 1
    return recipes


def load_source_recipes() -> list[ParsedRecipe]:
    if not SOURCE_PATH.exists():
        return []
    return parse_collection(SOURCE_PATH.read_text(encoding="utf-8"))
