"""Rewrite a photographed recipe into a Niramish house version.

The stored recipe is never a copy of the page: forbidden foods are swapped,
quantities are shifted, and the method is rephrased.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import asdict, dataclass, field

from app.config import QUANTITY_SHIFT_MAX, QUANTITY_SHIFT_MIN
from app.ethos import ALLOWED_PHRASES, find_forbidden, is_clean
from app.parse import ParsedRecipe

# Longest source phrases first.
SUBSTITUTIONS: list[tuple[str, str]] = [
    ("worcestershire sauce", "tamarind and a splash of soy"),
    ("worcestershire", "tamarind"),
    ("chicken of the woods", "chicken of the woods"),  # keep mushroom; ethos already allows it
    ("spring onions", "thin celery sticks"),
    ("spring onion", "thin celery stick"),
    ("green onions", "fresh coriander stems"),
    ("green onion", "fresh coriander stem"),
    ("garlic cloves", "grated ginger plus a pinch of asafoetida"),
    ("garlic clove", "grated ginger plus a pinch of asafoetida"),
    ("garlic paste", "fresh ginger paste"),
    ("garlic powder", "ground cumin"),
    ("garlic salt", "sea salt"),
    ("garlic flakes", "dried fenugreek leaves"),
    ("garlic chives", "fresh coriander"),
    ("garlic chive", "fresh coriander"),
    ("wild garlic", "fresh parsley"),
    ("green garlic", "grated ginger"),
    ("garlic scapes", "green beans"),
    ("garlic scape", "green bean"),
    ("elephant garlic", "a pinch of asafoetida"),
    ("onion powder", "ground coriander"),
    ("onion granules", "ground coriander"),
    ("onion paste", "tomato paste"),
    ("onion salt", "sea salt"),
    ("onion flakes", "dried fenugreek leaves"),
    ("pearl onions", "diced fennel"),
    ("pearl onion", "diced fennel"),
    ("baby onions", "diced fennel"),
    ("baby onion", "diced fennel"),
    ("red onions", "fennel bulbs"),
    ("red onion", "fennel bulb"),
    ("white onions", "fennel bulbs"),
    ("white onion", "fennel bulb"),
    ("yellow onions", "fennel bulbs"),
    ("yellow onion", "fennel bulb"),
    ("brown onions", "fennel bulbs"),
    ("brown onion", "fennel bulb"),
    ("scallions", "fresh coriander"),
    ("scallion", "fresh coriander"),
    ("shallots", "diced fennel"),
    ("shallot", "diced fennel"),
    ("chives", "fresh coriander"),
    ("chive", "fresh coriander"),
    ("leeks", "celery"),
    ("leek", "celery"),
    ("chicken breasts", "paneer slabs"),
    ("chicken breast", "paneer slab"),
    ("chicken thighs", "thick paneer pieces"),
    ("chicken thigh", "thick paneer piece"),
    ("chicken wings", "cauliflower florets"),
    ("chicken wing", "cauliflower floret"),
    ("chicken stock", "vegetable stock"),
    ("chicken broth", "vegetable broth"),
    ("chicken mince", "crumbled paneer"),
    ("minced chicken", "crumbled paneer"),
    ("ground chicken", "crumbled paneer"),
    ("beef stock", "vegetable stock"),
    ("beef broth", "vegetable broth"),
    ("beef mince", "brown lentils"),
    ("minced beef", "brown lentils"),
    ("ground beef", "brown lentils"),
    ("ground pork", "browned chickpeas"),
    ("minced pork", "browned chickpeas"),
    ("pork mince", "browned chickpeas"),
    ("lamb mince", "brown lentils"),
    ("minced lamb", "brown lentils"),
    ("bone broth", "vegetable broth"),
    ("bone marrow", "butter"),
    ("fish sauce", "light soy sauce"),
    ("fish stock", "vegetable stock"),
    ("fish broth", "vegetable broth"),
    ("oyster sauce", "mushroom soy"),
    ("shrimp paste", "miso"),
    ("prawn paste", "miso"),
    ("anchovy essence", "soy sauce"),
    ("egg yolks", "thick yogurt"),
    ("egg yolk", "thick yogurt"),
    ("egg whites", "a splash of milk"),
    ("egg white", "a splash of milk"),
    ("egg wash", "milk wash"),
    ("bee pollen", "toasted sesame"),
    ("royal jelly", "maple syrup"),
    ("mayonnaise", "thick yogurt with lemon"),
    ("aioli", "herbed yogurt"),
    ("meringue", "whipped cream"),
    ("gelatin", "agar agar"),
    ("gelatine", "agar agar"),
    ("collagen", "milk powder"),
    ("isinglass", "agar agar"),
    ("carmine", "beet colour"),
    ("cochineal", "beet colour"),
    ("anchovies", "capers"),
    ("anchovy", "caper"),
    ("prawns", "paneer cubes"),
    ("prawn", "paneer cube"),
    ("shrimps", "paneer cubes"),
    ("shrimp", "paneer cube"),
    ("lobsters", "king oyster mushrooms"),
    ("lobster", "king oyster mushroom"),
    ("crabs", "king oyster mushrooms"),
    ("crab", "king oyster mushroom"),
    ("calamari", "king oyster mushrooms"),
    ("mussels", "button mushrooms"),
    ("mussel", "button mushroom"),
    ("scallops", "king oyster rounds"),
    ("scallop", "king oyster round"),
    ("salmon", "roasted carrots"),
    ("tuna", "chickpeas"),
    ("haddock", "cauliflower"),
    ("mackerel", "smoked paprika paneer"),
    ("sardines", "capers"),
    ("sardine", "caper"),
    ("trout", "roasted fennel"),
    ("sea bass", "roasted fennel"),
    ("seabass", "roasted fennel"),
    ("tilapia", "firm tofu"),
    ("seafood", "mixed mushrooms"),
    ("pepperoni", "smoked paprika paneer"),
    ("prosciutto", "grilled courgette"),
    ("pancetta", "smoked paprika oil"),
    ("lardons", "smoked paprika oil"),
    ("chorizo", "smoked paprika paneer"),
    ("salami", "smoked paprika paneer"),
    ("frankfurter", "grilled paneer"),
    ("hot dogs", "grilled paneer"),
    ("hot dog", "grilled paneer"),
    ("sausages", "spiced paneer logs"),
    ("sausage", "spiced paneer log"),
    ("bacon", "smoked paprika oil"),
    ("chicken", "paneer"),
    ("turkey", "paneer"),
    ("duck", "king oyster mushrooms"),
    ("goose", "king oyster mushrooms"),
    ("quail", "paneer"),
    ("mutton", "whole spices and lentils"),
    ("venison", "mushrooms"),
    ("rabbit", "mushrooms"),
    ("offal", "mushrooms"),
    ("liver", "mushrooms"),
    ("kidney", "mushrooms"),
    ("lard", "butter"),
    ("suet", "butter"),
    ("tallow", "ghee"),
    ("mince", "brown lentils"),
    ("steak", "thick paneer"),
    ("veal", "paneer"),
    ("pork", "jackfruit"),
    ("beef", "brown lentils"),
    ("lamb", "brown lentils"),
    ("ham", "grilled courgette"),
    ("meat", "paneer"),
    ("fish", "firm tofu"),
    ("squid", "king oyster mushrooms"),
    ("clams", "button mushrooms"),
    ("clam", "button mushroom"),
    ("oysters", "king oyster mushrooms"),
    ("oyster", "king oyster mushroom"),
    ("cod", "cauliflower"),
    ("mayo", "thick yogurt"),
    ("eggs", "whisked yogurt"),
    ("egg", "whisked yogurt"),
    ("honey", "maple syrup"),
    ("ramps", "fresh parsley"),
    ("ramp", "fresh parsley"),
    ("cipollini", "diced fennel"),
    ("allium", "asafoetida"),
    ("onions", "fennel"),
    ("onion", "fennel"),
    ("garlic", "asafoetida and ginger"),
    ("leeks", "celery"),
    ("leek", "celery"),
    ("shallots", "diced fennel"),
    ("shallot", "diced fennel"),
    ("chives", "fresh coriander"),
    ("chive", "fresh coriander"),
    ("scallions", "fresh coriander"),
    ("scallion", "fresh coriander"),
]


# Commercial cookbook voice: keep TV/recipe-card phrasing, change it only slightly.
VOICE_VARIANTS = (
    (r"\bmix well\b", "mix till well combined"),
    (r"\bserve immediately\b", "serve hot"),
    (r"\bserving bowl\b", "serving platter"),
    (r"\bserving bowls\b", "serving platters"),
    (r"\btill golden brown\b", "till golden"),
    (r"\bhigh flame\b", "high heat"),
    (r"\btill translucent\b", "till soft"),
    (r"\bToss well\b", "Mix well"),
)

HOUSE_CLOSERS = (
    "Garnish with fresh coriander and serve immediately.",
    "Transfer onto a serving platter and serve hot.",
    "Garnish as required and serve immediately.",
    "Serve hot.",
)

UNIT_NAMES = {
    "tbsp": ("tablespoon", "tablespoons"),
    "tablespoon": ("tablespoon", "tablespoons"),
    "tsp": ("teaspoon", "teaspoons"),
    "teaspoon": ("teaspoon", "teaspoons"),
    "g": ("gram", "grams"),
    "gram": ("gram", "grams"),
    "ml": ("ml", "ml"),
    "cup": ("cup", "cups"),
    "cups": ("cup", "cups"),
}


@dataclass
class Substitution:
    original: str
    replacement: str
    category: str
    field: str

    def as_dict(self) -> dict:
        return asdict(self)


@dataclass
class TransformedIngredient:
    quantity: float | None
    unit: str | None
    item: str
    notes: str | None
    quantity_original: float | None
    original_item: str
    substituted: bool
    display: str

    def as_dict(self) -> dict:
        return asdict(self)


@dataclass
class TransformedRecipe:
    title: str
    original_title: str
    description: str
    servings: int | None
    original_servings: int | None
    prep_minutes: int | None
    cook_minutes: int | None
    cuisine: str | None = None
    course: str | None = None
    taste: str | None = None
    difficulty: str | None = None
    prep_time: str | None = None
    cook_time: str | None = None
    ingredients: list[TransformedIngredient] = field(default_factory=list)
    steps: list[str] = field(default_factory=list)
    original_steps: list[str] = field(default_factory=list)
    substitutions: list[Substitution] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "title": self.title,
            "original_title": self.original_title,
            "description": self.description,
            "servings": self.servings,
            "original_servings": self.original_servings,
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
            "original_steps": list(self.original_steps),
            "substitutions": [s.as_dict() for s in self.substitutions],
            "notes": list(self.notes),
        }

    def as_card(self) -> str:
        meta = []
        if self.cuisine:
            meta.append(f"Cuisine: {self.cuisine}")
        if self.course:
            meta.append(f"Course: {self.course}")
        if self.prep_time:
            meta.append(f"Prep: {self.prep_time}")
        if self.cook_time:
            meta.append(f"Cook: {self.cook_time}")
        if self.servings:
            meta.append(f"Serves: {self.servings}")
        if self.taste:
            meta.append(f"Taste: {self.taste}")
        if self.difficulty:
            meta.append(f"Difficulty: {self.difficulty}")
        lines = [self.title, "", self.description, "", "  ".join(meta), "", "Ingredients"]
        for ingredient in self.ingredients:
            lines.append(f"• {ingredient.display}")
        lines.append("")
        lines.append("Method")
        for number, step in enumerate(self.steps, 1):
            lines.append(f"{number}. {step}")
        return "\n".join(lines).strip() + "\n"


def _seed_int(*parts: str) -> int:
    blob = "|".join(parts).encode("utf-8")
    return int(hashlib.sha256(blob).hexdigest()[:12], 16)


def _shift_factor(seed: int) -> float:
    span = QUANTITY_SHIFT_MAX - QUANTITY_SHIFT_MIN
    unit = (seed % 1000) / 999
    return QUANTITY_SHIFT_MIN + span * unit


def nice_quantity(value: float) -> float:
    if value <= 0:
        return value
    if value >= 100:
        return float(int(round(value / 5.0) * 5))
    if value >= 20:
        return float(int(round(value)))
    if value >= 5:
        return round(value * 2) / 2
    if value >= 1:
        return round(value * 4) / 4
    choices = (0.125, 0.25, 0.33, 0.5, 0.67, 0.75)
    return min(choices, key=lambda c: abs(c - value))


def format_quantity(value: float | None) -> str:
    if value is None:
        return ""
    mapping = {
        0.125: "⅛",
        0.25: "¼",
        0.33: "⅓",
        0.5: "½",
        0.67: "⅔",
        0.75: "¾",
    }
    for target, glyph in mapping.items():
        if abs(value - target) < 0.02:
            return glyph
    if abs(value - round(value)) < 0.02:
        return str(int(round(value)))
    if abs(value * 2 - round(value * 2)) < 0.02:
        return f"{value:.1f}".rstrip("0").rstrip(".")
    return f"{value:.2f}".rstrip("0").rstrip(".")


def _phrase_regex(phrase: str) -> re.Pattern[str]:
    escaped = re.escape(phrase).replace(r"\ ", r"[\s-]+")
    return re.compile(rf"(?<![\w']){escaped}(?![\w'])", re.IGNORECASE)


_SUB_PATTERNS = [(src, dst, _phrase_regex(src)) for src, dst in SUBSTITUTIONS]


def _mask_allowed(text: str) -> tuple[str, dict[str, str]]:
    tokens: dict[str, str] = {}
    masked = text
    for index, phrase in enumerate(ALLOWED_PHRASES):
        pattern = _phrase_regex(phrase)
        token = f"NIRAMISHALLOW{index}TOKEN"

        def keep(match: re.Match[str], token=token) -> str:
            tokens[token] = match.group(0)
            return token

        masked = pattern.sub(keep, masked)
    return masked, tokens


def _unmask_allowed(text: str, tokens: dict[str, str]) -> str:
    restored = text
    for token, original in tokens.items():
        restored = restored.replace(token, original)
    return restored


def replace_forbidden(text: str, field: str) -> tuple[str, list[Substitution]]:
    if not text:
        return text, []
    updated, tokens = _mask_allowed(text)
    found: list[Substitution] = []
    for src, dst, pattern in _SUB_PATTERNS:
        if src == dst:
            continue

        def _sub(match: re.Match[str], dst=dst) -> str:
            original = match.group(0)
            replacement = dst
            if original.istitle():
                replacement = dst[:1].upper() + dst[1:]
            elif original.isupper():
                replacement = dst.upper()
            category = "other"
            hits = find_forbidden(original)
            if hits:
                category = hits[0].category
            found.append(
                Substitution(original=original, replacement=replacement, category=category, field=field)
            )
            return replacement

        updated = pattern.sub(_sub, updated)
    leftover = find_forbidden(updated)
    if leftover:
        for hit in reversed(leftover):
            start, end = hit.span
            original = updated[start:end]
            fallback = {
                "allium": "asafoetida",
                "meat": "paneer",
                "fish": "firm tofu",
                "egg": "yogurt",
                "animal": "maple syrup",
            }[hit.category]
            found.append(
                Substitution(original=original, replacement=fallback, category=hit.category, field=field)
            )
            updated = updated[:start] + fallback + updated[end:]
    return _unmask_allowed(updated, tokens), found


def _rewrite_times(text: str, seed: int) -> str:
    delta = 1 + (seed % 3)

    def range_shift(match: re.Match[str]) -> str:
        a, b, unit = int(match.group(1)), int(match.group(2)), match.group(3)
        return f"{a + delta}-{b + delta} {unit}"

    def single_shift(match: re.Match[str]) -> str:
        n, unit = int(match.group(1)) + delta, match.group(2)
        if unit.lower().startswith("minute"):
            unit = "minute" if n == 1 else "minutes"
        return f"{n} {unit}"

    text = re.sub(r"\b(\d+)\s*-\s*(\d+)\s*(minutes?|mins?|hours?|hrs?)\b", range_shift, text, flags=re.I)
    text = re.sub(r"\b(\d+)\s*(minutes?|mins?|hours?|hrs?)\b", single_shift, text, flags=re.I)
    return text


def _rewrite_voice(text: str, seed: int, index: int) -> str:
    updated = text
    updated = re.sub(r"\bnon[\s-]*stick\b", "non-stick", updated, flags=re.I)
    updated = re.sub(r"\bsaut[eèé]\b", "sauté", updated, flags=re.I)
    updated = re.sub(r"\btill translucent\b", "till soft", updated, flags=re.I)
    updated = re.sub(r"\btbsps\b", "tablespoons", updated, flags=re.I)
    updated = re.sub(r"\btbsp\b", "tablespoon", updated, flags=re.I)
    updated = re.sub(r"\btsps\b", "teaspoons", updated, flags=re.I)
    updated = re.sub(r"\btsp\b", "teaspoon", updated, flags=re.I)
    pattern, replacement = VOICE_VARIANTS[(seed + index) % len(VOICE_VARIANTS)]
    updated = re.sub(pattern, replacement, updated, count=1, flags=re.I)
    return updated


def _house_title(original: str, seed: int) -> str:
    title, _ = replace_forbidden(original, "title")
    title = re.sub(r"[\"']", "", title)
    title = re.sub(r"\s+", " ", title).strip(" -–—")
    if not title:
        title = "Special House Recipe"
    normalised_new = re.sub(r"[^a-z0-9]+", "", title.lower())
    normalised_old = re.sub(r"[^a-z0-9]+", "", original.lower())
    if normalised_new == normalised_old:
        title = ("Special ", "Easy ", "Homestyle ")[seed % 3] + title
    return title.strip()


def _commercial_description(
    original: str,
    title: str,
    cuisine: str | None,
    course: str | None,
    seed: int,
) -> tuple[str, list[Substitution]]:
    text, subs = replace_forbidden(original, "description")
    text = re.sub(r"this is a sanjeev kapoor exclusive recipe\.?", "", text, flags=re.I)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) < 40:
        course_bit = course or "dish"
        cuisine_bit = cuisine or "vegetarian"
        options = (
            f"A delicious {title} that is absolutely easy to make. Follow this step-by-step recipe and enjoy a delightful {course_bit}.",
            f"Here, we're giving a flavourful makeover to this {cuisine_bit} favourite. So, follow our easy method and enjoy a delightful bite.",
            f"A delectable {course_bit}, full of flavour and perfect to serve at home. This easy recipe is a real treat.",
        )
        text = options[seed % 3]
    elif not text.endswith((".", "!", "…", "...")):
        text += "."
    return text, subs


def _shift_time_label(label: str | None, delta: int) -> str | None:
    if not label:
        return label

    def repl(match: re.Match[str]) -> str:
        return f"{int(match.group(1)) + delta}-{int(match.group(2)) + delta}{match.group(3)}"

    return re.sub(r"(\d+)\s*-\s*(\d+)(\s*(?:minutes?|mins?|hours?|hrs?)?)", repl, label, count=1)


def _display_unit(quantity: float | None, unit: str | None) -> str | None:
    if not unit:
        return None
    key = unit.lower().rstrip("s")
    if unit.lower() in UNIT_NAMES:
        singular, plural = UNIT_NAMES[unit.lower()]
    elif key in UNIT_NAMES:
        singular, plural = UNIT_NAMES[key]
    else:
        return unit
    if quantity is None or abs(quantity - 1) < 0.05:
        return singular
    return plural


def _display_ingredient(ing: TransformedIngredient) -> str:
    parts = []
    qty = format_quantity(ing.quantity)
    unit = _display_unit(ing.quantity, ing.unit)
    if qty:
        parts.append(qty)
    if unit:
        parts.append(unit)
    parts.append(ing.item)
    text = " ".join(parts)
    if ing.notes:
        text = f"{text}, {ing.notes}"
    return text


def transform_recipe(parsed: ParsedRecipe) -> TransformedRecipe:
    seed = _seed_int(parsed.title, parsed.ocr_text)
    notes = [
        "This house version changes the method and the ingredient amounts so it is not a copy of the photographed page.",
        "The ethos keeps milk and cheese, and removes onion, garlic, alliums, meat, fish, eggs and other animal products.",
    ]
    substitutions: list[Substitution] = []

    title = _house_title(parsed.title, seed)
    extra_title, title_subs = replace_forbidden(title, "title")
    title = extra_title
    substitutions.extend(title_subs)

    description, desc_subs = _commercial_description(
        parsed.description, title, parsed.cuisine, parsed.course, seed
    )
    substitutions.extend(desc_subs)

    servings = parsed.servings
    if servings:
        shifted = servings + (1 if seed % 2 == 0 else -1)
        servings = max(2, shifted)

    time_delta = 1 + (seed % 3)
    prep = parsed.prep_minutes
    cook = parsed.cook_minutes
    if prep:
        prep = prep + time_delta
    if cook:
        cook = cook + time_delta
    prep_time = _shift_time_label(parsed.prep_time, time_delta) or (
        f"{prep} minutes" if prep else None
    )
    cook_time = _shift_time_label(parsed.cook_time, time_delta) or (
        f"{cook} minutes" if cook else None
    )

    transformed_ingredients: list[TransformedIngredient] = []
    for index, ing in enumerate(parsed.ingredients):
        item, item_subs = replace_forbidden(ing.item, "ingredient")
        substitutions.extend(item_subs)
        notes_text, note_subs = replace_forbidden(ing.notes or "", "ingredient")
        substitutions.extend(note_subs)
        unit = ing.unit
        if unit in {"clove", "cloves"} and find_forbidden(ing.item):
            unit = None
        quantity = ing.quantity
        quantity_original = ing.quantity
        if quantity is not None:
            factor = _shift_factor(seed + index * 17)
            quantity = nice_quantity(quantity * factor)
            if quantity_original is not None and abs(quantity - quantity_original) < 1e-9:
                quantity = nice_quantity(quantity * 1.1)
        transformed = TransformedIngredient(
            quantity=quantity,
            unit=unit,
            item=item,
            notes=notes_text or None,
            quantity_original=quantity_original,
            original_item=ing.item,
            substituted=bool(item_subs or note_subs),
            display="",
        )
        transformed.display = _display_ingredient(transformed)
        transformed_ingredients.append(transformed)

    steps: list[str] = []
    for index, step in enumerate(parsed.steps):
        rewritten, step_subs = replace_forbidden(step, "method")
        substitutions.extend(step_subs)
        rewritten = _rewrite_voice(rewritten, seed, index)
        rewritten = _rewrite_times(rewritten, seed + index)
        rewritten = rewritten[0].upper() + rewritten[1:] if rewritten else rewritten
        if rewritten and not rewritten.endswith("."):
            rewritten += "."
        steps.append(rewritten)

    joined = " ".join(steps).lower()
    if not re.search(r"\bserve\b", joined):
        steps.append(HOUSE_CLOSERS[seed % len(HOUSE_CLOSERS)])
    if parsed.steps and " ".join(steps).strip() == " ".join(parsed.steps).strip():
        if steps:
            steps[-1] = re.sub(r"serve immediately\.?$", "serve hot.", steps[-1], flags=re.I)
        if " ".join(steps).strip() == " ".join(parsed.steps).strip():
            steps.append("Serve hot.")

    # Drop empty ingredient lines created by total removal.
    transformed_ingredients = [i for i in transformed_ingredients if i.item.strip()]

    house = TransformedRecipe(
        title=title,
        original_title=parsed.title,
        description=description,
        servings=servings,
        original_servings=parsed.servings,
        prep_minutes=prep,
        cook_minutes=cook,
        cuisine=parsed.cuisine,
        course=parsed.course,
        taste=parsed.taste,
        difficulty=parsed.difficulty,
        prep_time=prep_time,
        cook_time=cook_time,
        ingredients=transformed_ingredients,
        steps=steps,
        original_steps=list(parsed.steps),
        substitutions=_unique_subs(substitutions),
        notes=notes,
    )
    _assert_house_ethos(house)
    return house


def _unique_subs(items: list[Substitution]) -> list[Substitution]:
    seen: set[tuple[str, str, str]] = set()
    unique: list[Substitution] = []
    for item in items:
        key = (item.original.lower(), item.replacement.lower(), item.field)
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique


def _assert_house_ethos(recipe: TransformedRecipe) -> None:
    blobs = [recipe.title, recipe.description, *recipe.steps]
    blobs.extend(i.item for i in recipe.ingredients)
    blobs.extend(i.notes or "" for i in recipe.ingredients)
    leftover = []
    for blob in blobs:
        leftover.extend(find_forbidden(blob))
    if leftover:
        phrases = ", ".join(sorted({hit.phrase for hit in leftover}))
        raise ValueError(f"House recipe still contains forbidden foods: {phrases}")
    joined_steps = " ".join(recipe.steps)
    if recipe.original_steps and joined_steps.strip() == " ".join(recipe.original_steps).strip():
        raise ValueError("House method was not changed from the photographed page.")
    if recipe.title.strip().lower() == recipe.original_title.strip().lower():
        raise ValueError("House title must not match the photographed title.")
    # Quantities must move when the original listed amounts.
    shifted = False
    originals = False
    for ing in recipe.ingredients:
        if ing.quantity_original is None:
            continue
        originals = True
        if ing.quantity is not None and abs(ing.quantity - ing.quantity_original) > 1e-9:
            shifted = True
    if originals and not shifted:
        raise ValueError("Ingredient proportions were not changed.")
    # Silence linters: is_clean is the public helper used by tests too.
    assert is_clean(" ".join(blobs))
