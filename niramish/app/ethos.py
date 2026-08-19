"""Dietary ethos for Niramish house recipes.

Allowed animal products: milk and cheese, including cream, butter, ghee,
yogurt, curd, buttermilk, paneer and other dairy made from milk.

Forbidden:
- allium family (onion, garlic, chives, spring onion, leeks, shallots, …)
- meat, fish and any other seafood
- eggs
- other animal products such as honey, gelatin, lard and fish sauce
"""

from __future__ import annotations

import re
from dataclasses import dataclass

# Mask these first so they are never treated as forbidden.
ALLOWED_PHRASES = (
    "chicken of the woods",
    "beefsteak tomato",
    "beef steak tomato",
    "buffalo mozzarella",
    "buffalo milk",
    "eggplant",
    "egg plant",
    "egg-plant",
    "eggless",
    "egg-less",
    "meatless",
    "meat-free",
    "fishless",
    "onion seeds",
    "onion seed",
    "nigella",
    "kalonji",
    "black cumin",
    "adauri",
)

# Longest phrases first so "spring onion" wins over "onion".
ALLIUM_PHRASES = (
    "spring onions",
    "spring onion",
    "green onions",
    "green onion",
    "red onions",
    "red onion",
    "white onions",
    "white onion",
    "yellow onions",
    "yellow onion",
    "brown onions",
    "brown onion",
    "pearl onions",
    "pearl onion",
    "baby onions",
    "baby onion",
    "onion powder",
    "onion granules",
    "onion paste",
    "onion salt",
    "onion flakes",
    "garlic cloves",
    "garlic clove",
    "garlic powder",
    "garlic granules",
    "garlic paste",
    "garlic salt",
    "garlic flakes",
    "garlic scapes",
    "garlic scape",
    "wild garlic",
    "green garlic",
    "garlic chives",
    "garlic chive",
    "elephant garlic",
    "scallions",
    "scallion",
    "shallots",
    "shallot",
    "chives",
    "chive",
    "leeks",
    "leek",
    "ramps",
    "ramp",
    "cipollini",
    "allium",
    "onions",
    "onion",
    "garlic",
)

MEAT_PHRASES = (
    "chicken breasts",
    "chicken breast",
    "chicken thighs",
    "chicken thigh",
    "chicken wings",
    "chicken wing",
    "chicken stock",
    "chicken broth",
    "chicken mince",
    "minced chicken",
    "ground chicken",
    "beef stock",
    "beef broth",
    "beef mince",
    "minced beef",
    "ground beef",
    "ground pork",
    "minced pork",
    "pork mince",
    "lamb mince",
    "minced lamb",
    "bone broth",
    "bone marrow",
    "chicken",
    "turkey",
    "duck",
    "goose",
    "quail",
    "beef",
    "veal",
    "pork",
    "bacon",
    "ham",
    "lardons",
    "pancetta",
    "prosciutto",
    "chorizo",
    "salami",
    "pepperoni",
    "sausage",
    "sausages",
    "hot dog",
    "hot dogs",
    "frankfurter",
    "mutton",
    "lamb",
    "venison",
    "rabbit",
    "liver",
    "kidney",
    "offal",
    "lard",
    "suet",
    "tallow",
    "gelatin",
    "gelatine",
    "collagen",
    "isinglass",
    "meat",
    "mince",
    "steak",
    "mutton",
)

FISH_PHRASES = (
    "fish sauce",
    "fish stock",
    "fish broth",
    "oyster sauce",
    "shrimp paste",
    "prawn paste",
    "anchovy essence",
    "worcestershire sauce",
    "worcestershire",
    "nam pla",
    "anchovies",
    "anchovy",
    "prawns",
    "prawn",
    "shrimps",
    "shrimp",
    "lobsters",
    "lobster",
    "crabs",
    "crab",
    "squid",
    "calamari",
    "mussels",
    "mussel",
    "clams",
    "clam",
    "oysters",
    "oyster",
    "scallops",
    "scallop",
    "salmon",
    "tuna",
    "cod",
    "haddock",
    "mackerel",
    "sardines",
    "sardine",
    "trout",
    "sea bass",
    "seabass",
    "tilapia",
    "fish",
    "seafood",
)

EGG_PHRASES = (
    "egg yolks",
    "egg yolk",
    "egg whites",
    "egg white",
    "egg wash",
    "eggs",
    "egg",
    "mayonnaise",
    "mayo",
    "aioli",
    "meringue",
)

OTHER_ANIMAL_PHRASES = (
    "bee pollen",
    "royal jelly",
    "honey",
    "carmine",
    "cochineal",
)

FORBIDDEN_GROUPS = (
    ("allium", ALLIUM_PHRASES),
    ("meat", MEAT_PHRASES),
    ("fish", FISH_PHRASES),
    ("egg", EGG_PHRASES),
    ("animal", OTHER_ANIMAL_PHRASES),
)


@dataclass(frozen=True)
class EthosHit:
    category: str
    phrase: str
    span: tuple[int, int]


def _phrase_regex(phrase: str) -> re.Pattern[str]:
    escaped = re.escape(phrase).replace(r"\ ", r"[\s-]+")
    return re.compile(rf"(?<![\w']){escaped}(?![\w'])", re.IGNORECASE)


_ALLOWED_PATTERNS = [_phrase_regex(p) for p in ALLOWED_PHRASES]
_FORBIDDEN_PATTERNS: list[tuple[str, str, re.Pattern[str]]] = []
for category, phrases in FORBIDDEN_GROUPS:
    for phrase in phrases:
        _FORBIDDEN_PATTERNS.append((category, phrase, _phrase_regex(phrase)))


def _mask_allowed(text: str) -> str:
    masked = text
    for pattern in _ALLOWED_PATTERNS:
        masked = pattern.sub(lambda m: " " * len(m.group(0)), masked)
    return masked


def find_forbidden(text: str) -> list[EthosHit]:
    if not text:
        return []
    masked = _mask_allowed(text)
    hits: list[EthosHit] = []
    occupied = [False] * (len(masked) + 1)
    # Longer phrases are listed first within each group; scan all and skip overlaps.
    for category, phrase, pattern in _FORBIDDEN_PATTERNS:
        for match in pattern.finditer(masked):
            start, end = match.span()
            if any(occupied[start:end]):
                continue
            for i in range(start, end):
                occupied[i] = True
            hits.append(EthosHit(category=category, phrase=phrase, span=(start, end)))
    hits.sort(key=lambda h: h.span[0])
    return hits


def is_clean(text: str) -> bool:
    return not find_forbidden(text)
