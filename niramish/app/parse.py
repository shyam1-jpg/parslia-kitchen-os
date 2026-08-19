"""Turn photographed or pasted recipe text into structured fields."""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field

FRACTION_VALUES = {
    "½": 0.5,
    "⅓": 1 / 3,
    "⅔": 2 / 3,
    "¼": 0.25,
    "¾": 0.75,
    "⅛": 0.125,
    "⅜": 0.375,
    "⅝": 0.625,
    "⅞": 0.875,
    "1/2": 0.5,
    "1/3": 1 / 3,
    "2/3": 2 / 3,
    "1/4": 0.25,
    "3/4": 0.75,
    "1/8": 0.125,
    "3/8": 0.375,
    "5/8": 0.625,
    "7/8": 0.875,
}

UNITS = (
    "tablespoons",
    "tablespoon",
    "teaspoons",
    "teaspoon",
    "tbsp",
    "tsp",
    "cups",
    "cup",
    "grams",
    "gram",
    "kilograms",
    "kilogram",
    "millilitres",
    "milliliters",
    "millilitre",
    "milliliter",
    "litres",
    "liters",
    "litre",
    "liter",
    "ounces",
    "ounce",
    "pounds",
    "pound",
    "ml",
    "g",
    "kg",
    "oz",
    "lb",
    "lbs",
    "cloves",
    "clove",
    "slices",
    "slice",
    "pieces",
    "piece",
    "pinch",
    "pinches",
    "handful",
    "handfuls",
    "bunch",
    "bunches",
    "cans",
    "can",
    "tins",
    "tin",
    "packets",
    "packet",
)

INGREDIENT_HEADER = re.compile(
    r"^\s*(ingredients?|you will need|shopping list)\s*:?\s*$",
    re.I,
)
METHOD_HEADER = re.compile(
    r"^\s*(method|directions|instructions|steps|preparation|how to make it|how to make)\s*:?\s*$",
    re.I,
)
SERVES_RE = re.compile(r"\bserves?\s*:?\s*(\d+)\b", re.I)
PREP_RE = re.compile(r"\bprep(?:\s*time)?\s*:?\s*(\d+)\s*(?:-|to)?\s*(?:minutes?|mins?|m)?", re.I)
COOK_RE = re.compile(r"\bcook(?:ing)?(?:\s*time)?\s*:?\s*(\d+)\s*(?:-|to)?\s*(?:minutes?|mins?|m)?", re.I)
META_LABELS = ("Cuisine", "Course", "Prep", "Cook", "Serves", "Taste", "Difficulty")
META_LINE_RE = re.compile(
    r"\b(?:Cuisine|Course|Prep|Cook|Serves|Taste|Difficulty)\s*:",
    re.I,
)
BULLET_RE = re.compile(r"^[\s•\-\*\u2022\u00b7]+")
STEP_NUM_RE = re.compile(r"^\s*\d+[\.\)]\s+")
QTY_LEAD = re.compile(
    r"^\s*(?P<qty>(?:\d+\s*)?(?:\d+/\d+|[½⅓⅔¼¾⅛⅜⅝⅞])|\d+(?:\.\d+)?)?"
    r"(?:\s*(?P<unit>" + "|".join(re.escape(u) for u in UNITS) + r")\b)?\s*",
    re.I,
)


@dataclass
class IngredientLine:
    raw: str
    quantity: float | None
    unit: str | None
    item: str
    notes: str | None = None

    def as_dict(self) -> dict:
        return asdict(self)


@dataclass
class ParsedRecipe:
    title: str
    description: str
    servings: int | None
    prep_minutes: int | None
    cook_minutes: int | None
    cuisine: str | None = None
    course: str | None = None
    taste: str | None = None
    difficulty: str | None = None
    prep_time: str | None = None
    cook_time: str | None = None
    ingredients: list[IngredientLine] = field(default_factory=list)
    steps: list[str] = field(default_factory=list)
    ocr_text: str = ""

    def as_dict(self) -> dict:
        return {
            "title": self.title,
            "description": self.description,
            "servings": self.servings,
            "prep_minutes": self.prep_minutes,
            "cook_minutes": self.cook_minutes,
            "cuisine": self.cuisine,
            "course": self.course,
            "taste": self.taste,
            "difficulty": self.difficulty,
            "prep_time": self.prep_time,
            "cook_time": self.cook_time,
            "ingredients": [i.as_dict() for i in self.ingredients],
            "steps": list(self.steps),
            "ocr_text": self.ocr_text,
        }


def _fraction_to_float(token: str) -> float:
    token = token.strip()
    mixed = re.match(r"^(\d+)\s*([½⅓⅔¼¾⅛⅜⅝⅞])$", token)
    if mixed:
        return float(mixed.group(1)) + FRACTION_VALUES[mixed.group(2)]
    if token in FRACTION_VALUES:
        return FRACTION_VALUES[token]
    if " " in token:
        whole, rest = token.split(None, 1)
        return float(whole) + _fraction_to_float(rest)
    if "/" in token:
        num, den = token.split("/", 1)
        return float(num) / float(den)
    return float(token)


def parse_quantity_line(line: str) -> IngredientLine:
    cleaned = BULLET_RE.sub("", line).strip()
    match = QTY_LEAD.match(cleaned)
    quantity = None
    unit = None
    rest = cleaned
    if match and (match.group("qty") or match.group("unit")):
        if match.group("qty"):
            try:
                quantity = _fraction_to_float(match.group("qty"))
            except ValueError:
                quantity = None
        if match.group("unit"):
            unit = match.group("unit").lower()
        rest = cleaned[match.end() :].strip(" ,")
    notes = None
    if "," in rest:
        item, notes = rest.split(",", 1)
        rest = item.strip()
        notes = notes.strip() or None
    return IngredientLine(raw=line.strip(), quantity=quantity, unit=unit, item=rest or cleaned, notes=notes)


def _looks_like_ingredient(line: str) -> bool:
    stripped = BULLET_RE.sub("", line).strip()
    if not stripped or METHOD_HEADER.match(stripped) or INGREDIENT_HEADER.match(stripped):
        return False
    if STEP_NUM_RE.match(stripped):
        return False
    if QTY_LEAD.match(stripped) and (QTY_LEAD.match(stripped).group("qty") or QTY_LEAD.match(stripped).group("unit")):
        return True
    if stripped.startswith(("•", "-", "*")):
        return True
    return False


def _clean_lines(text: str) -> list[str]:
    lines = []
    for raw in text.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        line = re.sub(r"[ \t]+", " ", raw).strip()
        if line:
            lines.append(line)
    return lines


def parse_metadata(text: str) -> dict[str, str | None]:
    found = {label.lower(): None for label in META_LABELS}
    for line in text.splitlines():
        if not META_LINE_RE.search(line):
            continue
        for label in META_LABELS:
            match = re.search(
                rf"{label}\s*:\s*(.+?)(?=\s+(?:Cuisine|Course|Prep|Cook|Serves|Taste|Difficulty)\s*:|$)",
                line,
                re.I,
            )
            if match:
                found[label.lower()] = match.group(1).strip()
    return found


def _first_int(value: str | None) -> int | None:
    if not value:
        return None
    match = re.search(r"\d+", value)
    return int(match.group(0)) if match else None


def parse_recipe(text: str) -> ParsedRecipe:
    lines = _clean_lines(text)
    meta = parse_metadata(text)
    servings = _first_int(meta.get("serves"))
    prep_minutes = _first_int(meta.get("prep"))
    cook_minutes = _first_int(meta.get("cook"))
    blob = "\n".join(lines)
    if servings is None:
        if m := SERVES_RE.search(blob):
            servings = int(m.group(1))
    if prep_minutes is None:
        if m := PREP_RE.search(blob):
            prep_minutes = int(m.group(1))
    if cook_minutes is None:
        if m := COOK_RE.search(blob):
            cook_minutes = int(m.group(1))

    title = "Untitled house recipe"
    description = ""
    body_start = 0
    if lines:
        title = re.sub(r"^recipe\s*:?\s*", "", lines[0], flags=re.I).strip() or title
        body_start = 1
        if len(lines) > 1 and not INGREDIENT_HEADER.match(lines[1]) and not _looks_like_ingredient(lines[1]):
            if not METHOD_HEADER.match(lines[1]) and not META_LINE_RE.search(lines[1]):
                if not STEP_NUM_RE.match(lines[1]) and len(lines[1]) > 28:
                    description = lines[1]
                    body_start = 2

    section = "unknown"
    ingredients: list[IngredientLine] = []
    steps: list[str] = []
    loose_steps: list[str] = []

    for line in lines[body_start:]:
        if INGREDIENT_HEADER.match(line):
            section = "ingredients"
            continue
        if METHOD_HEADER.match(line):
            section = "method"
            continue
        if META_LINE_RE.search(line):
            continue
        if section == "ingredients" or (section == "unknown" and _looks_like_ingredient(line)):
            if section == "unknown":
                section = "ingredients"
            ingredients.append(parse_quantity_line(line))
            continue
        if section == "method" or STEP_NUM_RE.match(line):
            section = "method"
            steps.append(STEP_NUM_RE.sub("", line).strip())
            continue
        if section == "unknown":
            loose_steps.append(line)

    if not steps and loose_steps:
        steps = [STEP_NUM_RE.sub("", line).strip() for line in loose_steps]

    return ParsedRecipe(
        title=title,
        description=description,
        servings=servings,
        prep_minutes=prep_minutes,
        cook_minutes=cook_minutes,
        cuisine=meta.get("cuisine"),
        course=meta.get("course"),
        taste=meta.get("taste"),
        difficulty=meta.get("difficulty"),
        prep_time=meta.get("prep"),
        cook_time=meta.get("cook"),
        ingredients=ingredients,
        steps=steps,
        ocr_text=text,
    )
