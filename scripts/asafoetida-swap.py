#!/usr/bin/env python3
"""Replace onion/garlic/chives/spring onion/shallot/leek with asafoetida in Tofoo recipes."""

from __future__ import annotations

import json
import re
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEP = "──────────────────────────────────────────────────"

ALLIUM_RE = re.compile(
    r"(?i)\b(?:"
    r"spring\s*onions?|green\s*onions?|scallions?|"
    r"red\s*onions?|white\s*onions?|brown\s*onions?|yellow\s*onions?|"
    r"shallots?|leeks?|chives?|"
    r"garlic(?:\s*(?:cloves?|powder|paste|puree|purée|granules?))?|"
    r"onion(?:\s*(?:powder|paste))?|onions?"
    r")\b"
)

AF = "AFMARKER"


def ingredient_is_allium(text: str) -> bool:
    t = text.strip()
    if not ALLIUM_RE.search(t):
        return False
    rest = ALLIUM_RE.sub(" ", t)
    rest = re.sub(
        r"(?i)\b(\d+[\d/.]*|g|kg|ml|tsp|tbsp|teaspoons?|tablespoons?|cups?|cloves?|"
        r"large|medium|small|bunch|handful|pack|finely|roughly|thinly|chopped|sliced|"
        r"diced|minced|crushed|peeled|grated|trimmed|fresh|dried|roasted?|optional|"
        r"for|to|garnish|serve|plus|extra|or|and|of|a|an|the|into|strips|pieces|rings|"
        r"whole|half|halved|leaves|knob|x|save|later|toppings?)\b",
        " ",
        rest,
    )
    rest = re.sub(r"[^a-zA-Z\s]", " ", rest)
    rest = re.sub(r"\s+", " ", rest).strip()
    return len(rest) <= 10


def clean_mixed_ingredient(text: str) -> str | None:
    t = text
    t = re.sub(
        r"(?i)(?:(?:,\s*)?(?:\d+[\d/.\s]*)?(?:tsp|tbsp|g|cloves?|large|medium|small)?\s*"
        r"(?:roast(?:ed)?\s+)?"
        r"(?:spring\s*onions?|green\s*onions?|scallions?|red\s*onions?|white\s*onions?|"
        r"shallots?|leeks?|chives?|garlic(?:\s*(?:cloves?|powder|paste|puree|purée))?|"
        r"onions?(?:\s*powder)?)"
        r"(?:\s*,|\s+and)?)",
        " ",
        t,
    )
    t = ALLIUM_RE.sub(" ", t)
    t = re.sub(r"\s+", " ", t)
    t = re.sub(r"\s*,\s*,+", ", ", t)
    t = t.strip(" ,;-")
    t = re.sub(r"(?i)\(tomatoes,\s*,?\s*radish\)", "(tomatoes, radish)", t)
    if not t or ingredient_is_allium(t):
        return None
    return t


def clean_prose(text: str, *, allow_af_cook: bool = True) -> str:
    if not text:
        return text
    s = ALLIUM_RE.sub(AF, text)

    s = re.sub(rf"(?i)(?:finely|roughly|thinly)\s+{AF}", AF, s)
    s = re.sub(
        rf"(?i)(?:chopped|sliced|diced|minced|crushed|grated|peeled|shredded)\s+{AF}",
        AF,
        s,
    )
    s = re.sub(
        rf"(?i){AF}\s*,\s*(?:peeled\s+and\s+)?"
        rf"(?:finely\s+|roughly\s+|thinly\s+)?(?:chopped|sliced|diced|minced)",
        AF,
        s,
    )
    s = re.sub(rf"(?i)\d+\s+{AF}", AF, s)
    s = re.sub(rf"(?i)(?:an?|the|your)\s+{AF}", AF, s)
    s = re.sub(rf"(?i)\d+\s+cloves\s+of\s+{AF}", AF, s)
    s = re.sub(rf"(?i)remaining\s+{AF}", AF, s)

    # Garnish / topping uses — remove
    s = re.sub(
        rf"(?i)(?:,\s*)?(?:and\s+)?(?:pickled|crispy|caramelised|caramelized)\s+{AF}",
        "",
        s,
    )
    s = re.sub(rf"(?i)garnish with {AF}(?:,\s*|\s+and\s+)?", "garnish with ", s)
    s = re.sub(rf"(?i)sprinkle(?:d)? with {AF}(?:,\s*|\s+and\s+)?", "sprinkle with ", s)
    s = re.sub(rf"(?i)top(?:ped)? with(?: the)? {AF}(?:,\s*|\s+and\s+)?", "top with ", s)
    s = re.sub(rf"(?i)serve sprinkled with {AF}\.?", "Serve.", s)
    s = re.sub(
        rf"(?i),\s*{AF} and (sesame|chilli|coriander|cucumber|peanuts|nori|ginger)",
        r" and \1",
        s,
    )

    # Cutting / chopping asafoetida like a vegetable — remove that action
    s = re.sub(
        rf"(?i)(?:finely\s+|roughly\s+|thinly\s+)?"
        rf"(?:slice|chop|dice|shred|cut|peel)(?:\s+the|\s+your)?\s+{AF}"
        rf"(?:\s+into\s+\w+)?\s+and\s+",
        "",
        s,
    )
    s = re.sub(
        rf"(?i)(?:finely\s+|roughly\s+|thinly\s+)?"
        rf"(?:slice|chop|dice|shred|cut|peel)(?:\s+the|\s+your)?\s+{AF}"
        rf"(?:\s+into\s+\w+)?\.?",
        "",
        s,
    )
    s = re.sub(rf"(?i)and cut the {AF} into fine batons\.?", ".", s)
    s = re.sub(rf"(?i)slice the {AF} into rings and\s*", "", s)
    s = re.sub(
        rf"(?i)dice the cucumber, tomatoes and {AF}",
        "dice the cucumber and tomatoes",
        s,
    )
    s = re.sub(rf"(?i)cucumber, tomatoes and {AF}", "cucumber and tomatoes", s)
    s = re.sub(rf"(?i)tomatoes and {AF}", "tomatoes", s)
    s = re.sub(rf"(?i)finely dice \d+ tomatoes and {AF}", lambda m: re.sub(rf"(?i) and {AF}", "", m.group(0)), s)
    s = re.sub(rf"(?i) and an? {AF}", "", s)
    s = re.sub(rf"(?i), {AF},", ",", s)
    s = re.sub(rf"(?i), {AF} and", " and", s)
    s = re.sub(rf"(?i) and {AF},", ",", s)
    s = re.sub(rf"(?i) and {AF} and", " and", s)
    s = re.sub(rf"(?i) and {AF}\.", ".", s)
    s = re.sub(rf"(?i), {AF}\.", ".", s)

    # Crispy-leek style frying clauses
    s = re.sub(
        rf"(?i)if the oil is hot enough the {AF} will sizzle when placed[^.]+\.",
        "",
        s,
    )
    s = re.sub(rf"(?i)f\s*ry the {AF} for 1-2 mins[^.]*\.", "", s)
    s = re.sub(
        rf"(?i)remove the green part of the {AF}\s*\([^)]*\)\s*then cut the {AF} in half lengthways\.?",
        "",
        s,
    )
    s = re.sub(
        rf"(?i)pile up the salad leaves and top with the {AF}\s*\.",
        "Pile up the salad leaves.",
        s,
    )

    if AF in s:
        if allow_af_cook and re.search(
            r"(?i)\b(mix|heat|fry|toast|sauce|oil|pan|wok|marinade|cook|add)\b", s
        ):
            s = s.replace(AF, "%%AF%%", 1)
            s = s.replace(AF, "")
            s = s.replace("%%AF%%", "a pinch of asafoetida")
        else:
            s = s.replace(AF, "")

    s = re.sub(r"(?i)\ba pinch of a pinch of asafoetida\b", "a pinch of asafoetida", s)
    s = re.sub(r"(?i)\bthe a pinch of asafoetida\b", "a pinch of asafoetida", s)
    s = re.sub(r"(?i)\byour a pinch of asafoetida\b", "a pinch of asafoetida", s)
    s = re.sub(r"(?i)\badd the a pinch\b", "add a pinch", s)
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"\s+([,.])", r"\1", s)
    s = re.sub(r",\s*,+", ",", s)
    s = re.sub(r"\band\s+and\b", "and", s)
    s = re.sub(r",\s*and\s*", " and ", s)
    s = re.sub(r"\(\s*\)", "", s)
    s = re.sub(r"\s+\.", ".", s)
    s = re.sub(r"\.\s*\.", ".", s)
    s = re.sub(r"(?i)\bgarnish with\s*$", "", s)
    s = re.sub(r"(?i)\bgarnish with\.", "Serve.", s)
    s = re.sub(r"(?i)\btop with\s*\.", ".", s)
    s = re.sub(r"(?i)\bsprinkle with\s*\.", ".", s)
    return s.strip(" ,")


def fix_title(title: str) -> str:
    t = title
    t = re.sub(r"(?i)garlic\s*&\s*herb", "Herb", t)
    t = re.sub(r"(?i)garlic\s+and\s+herb", "Herb", t)
    t = re.sub(r"(?i)tofoo\s+leek\s+and\s+", "Tofoo and ", t)
    t = re.sub(r"(?i)\s+leek\s+and\s+", " and ", t)
    t = re.sub(r"(?i)\s+and\s+leek\b", "", t)
    t = ALLIUM_RE.sub("", t)
    t = re.sub(r"\s{2,}", " ", t)
    t = re.sub(r"\s+and\s+and\s+", " and ", t)
    return t.strip(" -|&")


def process_recipe(r: dict) -> dict:
    r = deepcopy(r)
    r["title"] = fix_title(r.get("title", ""))
    r["description"] = clean_prose(r.get("description", ""), allow_af_cook=False)

    had = False
    new_ings: list[str] = []
    for ing in r.get("ingredients") or []:
        if ingredient_is_allium(ing):
            had = True
            continue
        if ALLIUM_RE.search(ing):
            had = True
            cleaned = clean_mixed_ingredient(ing)
            if cleaned:
                new_ings.append(cleaned)
            continue
        new_ings.append(ing)

    new_methods: list[str] = []
    for step in r.get("method") or []:
        cleaned = clean_prose(step, allow_af_cook=True).strip()
        if len(cleaned) < 8:
            continue
        cleaned = cleaned[0].upper() + cleaned[1:]
        if cleaned[-1] not in ".!":
            cleaned += "."
        new_methods.append(cleaned)

    if had:
        if not any(re.search(r"(?i)asafoetida", x) for x in new_ings):
            new_ings.append("¼ tsp asafoetida")
        if new_methods and not any(re.search(r"(?i)asafoetida", m) for m in new_methods):
            for i, m in enumerate(new_methods):
                if re.search(r"(?i)\b(mix|heat|fry|toast|sauce|oil|pan|wok)\b", m):
                    new_methods[i] = m.rstrip(".") + ", then add a pinch of asafoetida."
                    break
            else:
                new_methods[0] = new_methods[0].rstrip(".") + ", then add a pinch of asafoetida."

    final: list[str] = []
    seen = False
    for x in new_ings:
        if re.search(r"(?i)asafoetida", x):
            if seen:
                continue
            seen = True
            final.append("¼ tsp asafoetida")
        else:
            final.append(x)
    r["ingredients"] = final
    r["method"] = new_methods
    return r


def write_txt(recipes: list[dict], path: Path) -> None:
    lines = [
        "TOFOO RECIPE COLLECTION",
        f"{len(recipes)} recipes",
        "",
        "Plain-text recipes — no source links or chef names.",
        "Onion, garlic, chives, spring onion, shallot and leek replaced with asafoetida.",
        "Edit titles, descriptions, and steps however you like.",
    ]
    for r in recipes:
        lines.append(SEP)
        lines.append(r["title"])
        lines.append(SEP)
        lines.append("")
        if r.get("description"):
            lines.append(r["description"])
            lines.append("")
        meta = []
        if r.get("categories"):
            meta.append("Tags: " + ", ".join(r["categories"]))
        if r.get("prep"):
            meta.append(f"Prep: {r['prep']}")
        if r.get("cook"):
            meta.append(f"Cook: {r['cook']}")
        if r.get("serves"):
            meta.append(f"Serves: {r['serves']}")
        if meta:
            lines.append("  ".join(meta))
            lines.append("")
        lines.append("Ingredients")
        for ing in r["ingredients"]:
            lines.append(f"• {ing}")
        lines.append("")
        lines.append("Method")
        for i, step in enumerate(r["method"], 1):
            lines.append(f"{i}. {step}")
        lines.append("")
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def main() -> None:
    src = ROOT / "tofoo-recipes.json"
    data = json.loads(src.read_text(encoding="utf-8"))
    if len(data) != 201:
        raise SystemExit(f"Expected 201 recipes, found {len(data)}")

    processed = [process_recipe(r) for r in data]
    processed.sort(key=lambda r: r["title"].lower())

    src.write_text(json.dumps(processed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_txt(processed, ROOT / "tofoo-recipes.txt")
    (ROOT / "tofoo-recipes-index.txt").write_text(
        f"Tofoo recipes ({len(processed)})\n\n"
        + "\n".join(f"{i}. {r['title']}" for i, r in enumerate(processed, 1))
        + "\n",
        encoding="utf-8",
    )

    text = (ROOT / "tofoo-recipes.txt").read_text(encoding="utf-8")
    allium_lines = [
        m.group(0)
        for m in re.finditer(
            r"(?i)^.*(?:spring\s*onion|onion|garlic|leek|shallot|chive|scallion).*$",
            text,
            re.M,
        )
    ]
    print(f"recipes={len(processed)}")
    print(f"allium_lines={len(allium_lines)}")
    for line in allium_lines:
        print(" ", line[:160])

    empty = [r["title"] for r in processed if not r["ingredients"] or not r["method"]]
    print("empty=", empty)

    for name in [
        "Easy Sticky Hoisin Stir Fry",
        "Herb Nugget Flatbreads with Tzatziki",
        "Tofoo and Sundried Tomato Quiche",
        "Baked Tofoo with Spinach and Almonds",
        "Hoisin Tofoo Wraps",
    ]:
        r = next((x for x in processed if x["title"] == name), None)
        print("\n===", name, "===")
        if not r:
            print("MISSING")
            continue
        print("ings:", r["ingredients"])
        for s in r["method"][:6]:
            print("-", s)


if __name__ == "__main__":
    main()
