#!/usr/bin/env python3
"""Make vegetarian-recipes.txt onion / allium-free for Pure Prasad Kitchen.

Strips onion, garlic, shallot, leek, chives, spring/green onion (and common
Hindi names), then adds hing (asafoetida) when alliums were removed.
Also renames dishes that still advertise garlic/onion in the title.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TXT_PATH = ROOT / "vegetarian-recipes.txt"
SEP = "─" * 50

ALLIUM_PHRASE_RE = re.compile(
    r"""(?ix)
    \b(?:finely\s+|roughly\s+|thinly\s+|chopped\s+|minced\s+|sliced\s+|crushed\s+|
       peeled\s+|grated\s+|chopped\s+)*
    (?:
        spring\s+onions?(?:\s+(?:bulbs?|greens?|whites?))?|
        green\s+onions?|
        scallions?|
        red\s+onions?|white\s+onions?|brown\s+onions?|yellow\s+onions?|
        pickled\s+onion\s+rings?|
        onion\s+rings?|
        onions?|
        shallots?|
        leeks?|
        chives?|
        garlic(?:\s*(?:cloves?|powder|paste|puree|purée|granules?|bread))?|
        ginger[- ]garlic(?:\s+paste)?|
        garlic[- ]ginger(?:\s+paste)?|
        lahsun|lehsun|pyaaz|pyaz|hare\s+pyaaz
    )
    (?:\s*,)?
    (?:\s+(?:finely\s+|roughly\s+|thinly\s+)?(?:chopped|minced|sliced|crushed|peeled|grated|cloves?))*
    """,
)

HING_RE = re.compile(r"\b(hing|asafoetida)\b", re.I)

TITLE_FIXES = [
    (re.compile(r"(?i)^Burnt Garlic Vegetable Fried Rice$"), "Spiced Vegetable Fried Rice"),
    (re.compile(r"(?i)^Hare Pyaaz\s*,\s*Neem aur Imli ki Chutney$"), "Neem aur Imli ki Chutney"),
    (re.compile(r"(?i)garlic\s*&\s*herb"), "Herb"),
    (re.compile(r"(?i)garlic\s+and\s+herb"), "Herb"),
    (re.compile(r"(?i)\bgastric\b"), "gastric"),  # no-op guard
    (re.compile(r"(?i)\burnt\s+garlic\b"), "spiced"),
    (re.compile(r"(?i)\bgallic\b"), "gallic"),
    (re.compile(r"(?i)\bgarlic\b"), ""),
    (re.compile(r"(?i)\bonion\b"), ""),
    (re.compile(r"(?i)\bpyaaz\b"), ""),
]

MANUAL_METHOD_OVERRIDES: dict[str, list[str]] = {
    "Spiced Vegetable Fried Rice": [
        "Soak the basmati rice, then boil in salted water until about three-quarters cooked; drain and spread on a plate to cool",
        "String and finely chop the French beans; shred the cabbage; peel and grate the carrot",
        "Heat oil in a non-stick wok, bloom a pinch of hing on high heat until fragrant",
        "Add French beans, carrot and cabbage, mix and sauté for 1 minute",
        "Add salt and soy sauce and mix well",
        "Add the rice, adjust salt, toss and cook for 1 minute",
        "Cover and cook on low heat for 2 minutes",
        "Finish with vinegar, toss, and serve hot with coriander if using",
    ],
}

MANUAL_DESC_OVERRIDES: dict[str, str] = {
    "Spiced Vegetable Fried Rice": (
        "Rice tossed with fresh-cut vegetables and hing for an onion/garlic-free wok finish."
    ),
}


def strip_allium_phrases(text: str) -> str:
    # Protect intentional diet labels from being eaten by the allium scrub
    protected: list[str] = []

    def _protect(match: re.Match) -> str:
        protected.append(match.group(0))
        return f"__PPK_KEEP_{len(protected) - 1}__"

    text = re.sub(
        r"(?i)\bonion\s*/\s*garlic-free\b|\ballium-free\b|\bno[- ]onion(?:/garlic)?\b|"
        r"\bwithout onion(?: and garlic)?\b|\bonion[- ]free\b|\bgarlic[- ]free\b",
        _protect,
        text,
    )
    text = ALLIUM_PHRASE_RE.sub(" ", text)
    # ginger-garlic / garlic-ginger paste leftovers
    text = re.sub(r"(?i)\bginger\s*[- ]\s*paste\b", "ginger paste", text)
    text = re.sub(r"(?i)\bgreen chilli\s*[- ]\s*paste\b", "green chilli paste", text)
    text = re.sub(r"\s{2,}", " ", text)
    text = re.sub(r"\s+,", ",", text)
    text = re.sub(r",\s*,+", ",", text)
    text = re.sub(r"^\s*,\s*|\s*,\s*$", "", text)
    text = re.sub(r"\band\s+and\b", "and", text, flags=re.I)
    text = re.sub(r"\s+\.", ".", text)
    for i, phrase in enumerate(protected):
        text = text.replace(f"__PPK_KEEP_{i}__", phrase)
    return text.strip(" ,;.")


def is_allium_only_ingredient(item: str) -> bool:
    if item.endswith(":"):
        return False
    if not re.search(
        r"(?i)\b(onions?|spring\s+onions?|green\s+onions?|scallions?|shallots?|leeks?|"
        r"chives?|garlic(?:\s+cloves?)?|lahsun|lehsun|pyaaz|pyaz|"
        r"ginger[- ]garlic(?:\s+paste)?|garlic[- ]ginger(?:\s+paste)?|"
        r"pickled\s+onion|onion\s+rings?)\b",
        item,
    ):
        return False
    # Keep compound lines that are mainly another food (rare after strip).
    if re.search(
        r"(?i)\b(tomato|potato|broccoli|tofu|mushroom|capsicum|carrot|spinach|"
        r"paneer|lentil|dal|bean|rice|flour|sauce|basil|walnut|cashew|yogurt|"
        r"besan|gram flour|pesto)\b",
        item,
    ):
        return False
    return True


def fix_title(title: str) -> str:
    t = title
    for pattern, repl in TITLE_FIXES:
        t = pattern.sub(repl, t)
    t = re.sub(r"\s{2,}", " ", t)
    t = re.sub(r"\s+,\s+", ", ", t)
    t = re.sub(r"^\s*,\s*|\s*,\s*$", "", t)
    t = re.sub(r"\s+and\s+and\s+", " and ", t, flags=re.I)
    return t.strip(" -|&,")


def clean_method_step(step: str) -> str:
    before = step
    cleaned = strip_allium_phrases(step)
    # Common sauté clauses left empty / awkward
    cleaned = re.sub(
        r"(?i)\b(add|saut[eé]|fry|cook)\b\s+(the\s+)?until fragrant",
        r"\1 until fragrant",
        cleaned,
    )
    cleaned = re.sub(
        r"(?i)\b(saut[eé]|fry)\b\s+until\s+(golden|translucent|soft)[^.]*",
        r"cook until fragrant",
        cleaned,
    )
    cleaned = re.sub(
        r"(?i)\bheat oil in a non-stick wok,\s*add and sauté on high heat till golden brown",
        "heat oil in a non-stick wok, bloom a pinch of hing on high heat until fragrant",
        cleaned,
    )
    cleaned = re.sub(r"(?i)\badd and sauté\b", "sauté", cleaned)
    cleaned = re.sub(r"(?i)\badd mix and sauté\b", "mix and sauté", cleaned)
    cleaned = re.sub(r"(?i)\bslice and finely chop the stalk\.?", "", cleaned)
    cleaned = re.sub(r"(?i)\bfinely chop string the\b", "string the", cleaned)
    cleaned = re.sub(
        r"(?i)\bfinely chop and cut paneer\b",
        "cut paneer",
        cleaned,
    )
    cleaned = re.sub(
        r"(?i)\bgrease (?:the )?(?:tawa|pan|griddle) with onion\b",
        "grease the tawa with oil",
        cleaned,
    )
    cleaned = re.sub(
        r"(?i)\bdip onion half in oil and grease\b",
        "dip a cut potato in oil and grease",
        cleaned,
    )
    cleaned = re.sub(r"(?i)\bonion for greasing\b", "oil for greasing", cleaned)
    cleaned = re.sub(r"(?i)\bburnt\.?$", "spiced.", cleaned)
    cleaned = re.sub(r"(?i)\band burnt\.?$", "and spiced vegetables.", cleaned)
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip(" ,;.")
    if cleaned and cleaned[0].islower():
        cleaned = cleaned[0].upper() + cleaned[1:]
    # Drop steps that became empty / nonsense after stripping
    if len(cleaned) < 8:
        return ""
    if re.fullmatch(r"(?i)(add|mix|cook|sauté|saute|fry|until fragrant)", cleaned):
        return ""
    if cleaned != before and not cleaned.endswith("."):
        cleaned += "."
    elif cleaned == before and not cleaned.endswith("."):
        cleaned += "."
    return cleaned


def transform_recipe(title: str, description: str, meta: str, ingredients: list[str], method: list[str]):
    new_title = fix_title(title)
    new_desc = MANUAL_DESC_OVERRIDES.get(new_title) or strip_allium_phrases(description)
    if new_title in MANUAL_METHOD_OVERRIDES:
        method = MANUAL_METHOD_OVERRIDES[new_title]
    removed = False
    hing_present = any(HING_RE.search(x) for x in ingredients)
    new_ings: list[str] = []

    for item in ingredients:
        if item.endswith(":"):
            new_ings.append(item)
            continue
        # Drop scrape junk that is only a time range / bare minutes
        if re.fullmatch(r"\d+\s*-\s*\d+\s*minutes?", item.strip(), flags=re.I):
            continue
        if is_allium_only_ingredient(item) or re.search(
            r"(?i)^(onion for greasing|garlic bread.*|pickled onion rings.*|"
            r"spring-onion-free garnish:.*)$",
            item.strip(),
        ):
            removed = True
            continue
        before = item
        cleaned = strip_allium_phrases(item)
        # Specific greasing swap
        cleaned = re.sub(r"(?i)^onion for greasing$", "oil, for greasing", cleaned)
        cleaned = re.sub(r"(?i)\bonion for greasing\b", "oil for greasing", cleaned)
        if HING_RE.search(cleaned):
            hing_present = True
        if not cleaned or len(cleaned) < 2:
            if before != cleaned:
                removed = True
            continue
        if cleaned != before and re.search(
            r"(?i)\b(onions?|garlic|shallots?|leeks?|chives?|spring\s+onions?|scallions?|pyaaz)\b",
            before,
        ):
            removed = True
        new_ings.append(cleaned)

    new_method: list[str] = []
    for step in method:
        before = step
        cleaned = clean_method_step(step)
        if not cleaned:
            if re.search(
                r"(?i)\b(onions?|garlic|shallots?|leeks?|chives?|spring\s+onions?)\b",
                before,
            ):
                removed = True
            continue
        if cleaned.rstrip(".") != strip_allium_phrases(before).rstrip(".") and re.search(
            r"(?i)\b(onions?|garlic|shallots?|leeks?|chives?|spring\s+onions?)\b",
            before,
        ):
            removed = True
        new_method.append(cleaned.rstrip("."))

    hing_added = False
    if removed and not hing_present:
        insert_at = 0
        for idx, item in enumerate(new_ings):
            if item.endswith(":"):
                continue
            if re.search(r"\b(oil|ghee|cumin|mustard seeds|temper|olive oil)\b", item, re.I):
                insert_at = idx + 1
                break
        new_ings.insert(insert_at, "a pinch of hing (asafoetida)")
        hing_added = True
        for i, step in enumerate(new_method):
            if re.search(
                r"(?i)\b(heat oil|heat.*oil|heat ghee|temper|tadka|mustard seeds|cumin seeds|warm olive oil)\b",
                step,
            ):
                if not HING_RE.search(step):
                    new_method[i] = step.rstrip(".") + ", then add a pinch of hing"
                break
        else:
            new_method.insert(
                min(1, len(new_method)),
                "Warm a pinch of hing in a little hot oil before adding the main ingredients",
            )

    # Deduplicate hing only within the same section (headers end with ":")
    final_ings: list[str] = []
    seen_hing_in_section = False
    for item in new_ings:
        if item.endswith(":"):
            seen_hing_in_section = False
            final_ings.append(item)
            continue
        if HING_RE.search(item):
            if seen_hing_in_section:
                continue
            seen_hing_in_section = True
            final_ings.append("a pinch of hing (asafoetida)")
        else:
            final_ings.append(item)

    note = ""
    if removed or hing_added:
        note = "Onion/allium-free (Pure Prasad Kitchen): onion and garlic removed; hing used for savoury depth."

    return new_title, new_desc, meta, final_ings, new_method, note


def parse_recipes(text: str) -> tuple[list[str], list[dict]]:
    header_end = text.find(SEP)
    header_lines = text[:header_end].strip().splitlines()
    blocks = re.findall(
        rf"{re.escape(SEP)}\n([^\n]+)\n{re.escape(SEP)}\n(.*?)(?=\n{re.escape(SEP)}|\Z)",
        text,
        re.S,
    )
    recipes = []
    for title, body in blocks:
        desc = ""
        meta = ""
        ingredients: list[str] = []
        method: list[str] = []
        section = "pre"
        for ln in body.splitlines():
            s = ln.strip()
            if not s:
                continue
            if s == "Ingredients":
                section = "ingredients"
                continue
            if s == "Method":
                section = "method"
                continue
            if section == "pre":
                if s.startswith("Cuisine:"):
                    meta = s
                elif not desc:
                    desc = s
                continue
            if section == "ingredients":
                if s.endswith(":") and not s.startswith("•"):
                    ingredients.append(s)
                else:
                    ingredients.append(s.lstrip("• ").strip())
                continue
            if section == "method":
                method.append(re.sub(r"^\d+\.\s*", "", s).rstrip("."))
        recipes.append(
            {
                "title": title,
                "description": desc,
                "meta": meta,
                "ingredients": ingredients,
                "method": method,
            }
        )
    return header_lines, recipes


def format_recipe(title, desc, meta, ingredients, method, note: str = "") -> str:
    lines = [SEP, title, SEP, ""]
    if desc:
        if not desc.endswith("."):
            desc += "."
        lines += [desc, ""]
    if meta:
        lines += [meta, ""]
    if note:
        lines += [note, ""]
    lines.append("Ingredients")
    for item in ingredients:
        if item.endswith(":"):
            lines.append(item)
        else:
            lines.append(f"• {item}")
    lines.append("")
    lines.append("Method")
    for i, step in enumerate(method, 1):
        lines.append(f"{i}. {step.rstrip('.')}." )
    lines.append("")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    text = TXT_PATH.read_text(encoding="utf-8")
    header_lines, recipes = parse_recipes(text)

    # Refresh header for Pure Prasad allium-free standard
    new_header = []
    for ln in header_lines:
        if ln.startswith("VEGETARIAN RECIPE COLLECTION"):
            new_header.append(ln)
            continue
        if re.fullmatch(r"\d+ recipes", ln.strip()):
            continue
        if ln.startswith("Plain-text") or ln.startswith("Edit titles") or ln.startswith("Ingredient"):
            continue
        if ln.strip():
            new_header.append(ln)
    # rebuilt below after count known

    out_recipes = []
    changed = 0
    for r in recipes:
        title, desc, meta, ings, method, note = transform_recipe(
            r["title"], r["description"], r["meta"], r["ingredients"], r["method"]
        )
        if (
            title != r["title"]
            or ings != r["ingredients"]
            or method != [m.rstrip(".") for m in r["method"]]
            or note
        ):
            changed += 1
        out_recipes.append(
            {
                "title": title,
                "description": desc,
                "meta": meta,
                "ingredients": ings,
                "method": method,
                "note": note,
            }
        )

    out_recipes.sort(key=lambda r: r["title"].lower())
    header = [
        "VEGETARIAN RECIPE COLLECTION",
        f"{len(out_recipes)} recipes",
        "",
        "Plain-text recipes for Pure Prasad Kitchen — onion / allium-free.",
        "No onion, garlic, shallot, leek, chives, or spring onion. Hing (asafoetida) used instead.",
        "Edit titles, descriptions, and steps however you like.",
        "",
    ]
    body = "".join(
        format_recipe(
            r["title"], r["description"], r["meta"], r["ingredients"], r["method"], r["note"]
        )
        for r in out_recipes
    )
    TXT_PATH.write_text("\n".join(header) + "\n" + body, encoding="utf-8")

    # Audit leftovers
    text2 = TXT_PATH.read_text(encoding="utf-8")
    leftovers = []
    for m in re.finditer(
        r"(?i)^.*\b(?:onions?|garlic|shallots?|leeks?|chives?|spring\s+onions?|scallions?|pyaaz|lehsun)\b.*$",
        text2,
        re.M,
    ):
        line = m.group(0).strip()
        # allow words like "gastric" already handled; skip hing lines
        if re.search(r"(?i)allium-free|no onion|without onion", line):
            continue
        leftovers.append(line[:160])

    print(f"Wrote {TXT_PATH} ({len(out_recipes)} recipes, {changed} changed)")
    print(f"leftover allium lines: {len(leftovers)}")
    for line in leftovers[:40]:
        print(" ", line)


if __name__ == "__main__":
    main()
