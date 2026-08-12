#!/usr/bin/env python3
"""Adapt vegetarian recipes: rename dishes, remove aluminium, add hing, tweak methods."""

from __future__ import annotations

import hashlib
import re
from pathlib import Path

SRC = Path("/workspace/vegetarian-recipes.txt")
OUT_DIR = Path("/workspace/D_Drive")
OUT_FILE = OUT_DIR / "Vegetarian_Recipes_Hing_Edition.txt"
ARTIFACT = Path("/opt/cursor/artifacts/Vegetarian_Recipes_Hing_Edition.txt")

SEP = "──────────────────────────────────────────────────"

# Dish-name soft renames (slight wording changes)
PREFIXES = [
    "Homestyle",
    "Kitchen",
    "Everyday",
    "Simple",
    "Fresh",
    "Classic",
    "Comfort",
    "Quick",
    "Spiced",
    "Wholesome",
]
SUFFIXES = [
    "Delight",
    "Special",
    "Twist",
    "Bowl",
    "Plate",
    "Style",
    "Treat",
    "Favourite",
    "Edition",
    "Mix",
]

WORD_SWAPS = [
    (r"\bToast\b", "Crisps"),
    (r"\bSmoothie\b", "Blend"),
    (r"\bSalad\b", "Toss"),
    (r"\bSoup\b", "Broth"),
    (r"\bPancakes\b", "Hotcakes"),
    (r"\bIce Cream\b", "Frozen Cream"),
    (r"\bBread\b", "Loaf"),
    (r"\bBurger\b", "Patty Stack"),
    (r"\bPizza\b", "Flatbake"),
    (r"\bBiryani\b", "Dum Rice"),
    (r"\bMilkshake\b", "Shake"),
    (r"\bChutney\b", "Relish"),
    (r"\bSabzi\b", "Subzi"),
    (r"\bCurry\b", "Gravy"),
]

METHOD_REWORDS = [
    (r"\bHeat a non-stick\b", "Warm a non-stick"),
    (r"\bHeat a nonstick\b", "Warm a nonstick"),
    (r"\bHeat\b", "Warm"),
    (r"\bmix well\b", "stir until combined"),
    (r"\bMix well\b", "Stir until combined"),
    (r"\bcook till\b", "cook until"),
    (r"\bCook till\b", "Cook until"),
    (r"\bTransfer into\b", "Spoon into"),
    (r"\bTransfer onto\b", "Move onto"),
    (r"\bTransfer in\b", "Place in"),
    (r"\bserve immediately\b", "serve at once"),
    (r"\bServe immediately\b", "Serve at once"),
    (r"\bserve hot\b", "serve warm"),
    (r"\bServe hot\b", "Serve warm"),
    (r"\bPreheat the oven\b", "Heat the oven"),
    (r"\bTake the pan off the heat\b", "Remove the pan from the heat"),
    (r"\bTake a bowl\b", "Put a bowl"),
    (r"\bsauté\b", "fry gently"),
    (r"\bSauté\b", "Fry gently"),
]

# Sweet / cold / bake-only cues: still add hing lightly for collection consistency,
# but mark as optional pinch in tempering-style recipes vs drinks.
SWEET_CUES = re.compile(
    r"mithai|sweet|dessert|ice cream|smoothie|milkshake|shake|phirni|"
    r"toffee|bar|cake|pudding|kheer|halwa|ladoo|laddu|rabri|jaggery|"
    r"chocolate|cookie|biscuit|fudge|payasam|sheera",
    re.I,
)
SAVORY_CUES = re.compile(
    r"sabzi|subzi|dal|curry|gravy|chaat|masala|fry|tadka|temper|"
    r"mustard|cumin|chilli|onion|garlic|paneer|paratha|roti|rice|"
    r"snack|starter|main|soup|salad|toast|burger|pizza|biryani",
    re.I,
)


def stable_index(text: str, modulus: int) -> int:
    digest = hashlib.md5(text.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) % modulus


def rename_dish(title: str, body: str = "") -> str:
    new_title = title.strip()
    for pattern, repl in WORD_SWAPS:
        new_title = re.sub(pattern, repl, new_title)

    # If no word swap applied, attach a light prefix/suffix
    if new_title == title.strip():
        idx = stable_index(title, len(PREFIXES))
        sweetish = bool(
            re.search(r"Course:\s*(Beverages|Mithais|Desserts)", body, re.I)
            or re.search(r"Taste:\s*Sweet\b", body, re.I)
        )
        prefixes = (
            ["Homestyle", "Kitchen", "Everyday", "Simple", "Fresh", "Classic", "Comfort", "Quick", "Creamy", "Wholesome"]
            if sweetish
            else PREFIXES
        )
        # Prefer short prefix for short titles; suffix for long ones
        if len(title.split()) <= 3:
            new_title = f"{prefixes[idx]} {new_title}"
        else:
            new_title = f"{new_title} {SUFFIXES[idx]}"

    # Avoid accidental double spaces
    return re.sub(r"\s+", " ", new_title).strip()


def remove_aluminium(text: str) -> str:
    replacements = [
        (r"\ban aluminium sheet\b", "a parchment sheet"),
        (r"\ban aluminum sheet\b", "a parchment sheet"),
        (r"\baluminium sheet\b", "parchment sheet"),
        (r"\baluminum sheet\b", "parchment sheet"),
        (r"\ban aluminum tray\b", "a steel tray"),
        (r"\ban aluminium tray\b", "a steel tray"),
        (r"\baluminum tray\b", "steel tray"),
        (r"\baluminium tray\b", "steel tray"),
        (r"\ban aluminium kadai\b", "an iron kadai"),
        (r"\ban aluminum kadai\b", "an iron kadai"),
        (r"\baluminium kadai\b", "iron kadai"),
        (r"\baluminum kadai\b", "iron kadai"),
        (r"\baluminium foil\b", "parchment paper"),
        (r"\baluminum foil\b", "parchment paper"),
        (r"\baluminium\b", "steel"),
        (r"\baluminum\b", "steel"),
        (r"\balum\b", ""),  # cooking alum / fitkari if present
        (r"\bfitkari\b", ""),
    ]
    out = text
    for pattern, repl in replacements:
        out = re.sub(pattern, repl, out, flags=re.I)

    # Clean leftover empty bullet points / double spaces from alum removal
    out = re.sub(r"•\s*\n", "", out)
    out = re.sub(r"[ \t]{2,}", " ", out)
    out = re.sub(r" ,", ",", out)
    return out


def tweak_method_line(line: str) -> str:
    out = line
    for pattern, repl in METHOD_REWORDS:
        out = re.sub(pattern, repl, out)
    return out


def has_hing(text: str) -> bool:
    return bool(re.search(r"\b(asafoetida|hing)\b", text, re.I))


def should_add_hing(title: str, body: str) -> bool:
    blob = f"{title}\n{body}"
    # Skip drinks and mithai/desserts
    if re.search(r"Course:\s*(Beverages|Mithais|Desserts)", body, re.I):
        return False
    if re.search(r"Taste:\s*Sweet\b", body, re.I) and not SAVORY_CUES.search(blob):
        return False
    # Skip if clearly a cold drink / dessert title
    if re.search(
        r"smoothie|milkshake|shake|phirni|ice cream|toffee|fudge|kheer|halwa|ladoo|laddu|payasam",
        title,
        re.I,
    ):
        return False
    return True


def inject_hing(body: str) -> str:
    if has_hing(body):
        return body

    # Ingredients block
    if "Ingredients" in body and "Method" in body:
        ingredients, method = body.split("Method", 1)
        hing_line = "• A pinch of hing (asafoetida)\n"
        # Insert hing near end of ingredients list
        ingredients = ingredients.rstrip() + "\n" + hing_line + "\n"
        method = "Method" + method

        # Add a method step after first oil/ghee/heat step if possible
        lines = method.splitlines()
        new_lines: list[str] = []
        inserted = False
        step_pat = re.compile(r"^(\d+)\.\s+(.*)$")
        pending_renumber: list[str] = []

        for line in lines:
            m = step_pat.match(line.strip())
            if m and not inserted:
                step_text = m.group(2)
                new_lines.append(line)
                if re.search(
                    r"\b(oil|ghee|butter|mustard seeds|cumin seeds|temper|tadka|heat|warm)\b",
                    step_text,
                    re.I,
                ):
                    # Insert hing step next; renumber later
                    new_lines.append("HING_STEP_PLACEHOLDER")
                    inserted = True
                continue
            new_lines.append(line)

        if not inserted:
            # Insert after Method header / first step
            rebuilt: list[str] = []
            placed = False
            for line in new_lines:
                rebuilt.append(line)
                if (not placed) and step_pat.match(line.strip()):
                    rebuilt.append("HING_STEP_PLACEHOLDER")
                    placed = True
            new_lines = rebuilt
            inserted = placed

        # Replace placeholder and renumber
        final: list[str] = []
        step_no = 0
        for line in new_lines:
            if line == "HING_STEP_PLACEHOLDER":
                step_no += 1
                final.append(
                    f"{step_no}. Sprinkle a pinch of hing (asafoetida) and let it bloom for a few seconds."
                )
                continue
            m = step_pat.match(line.strip())
            if m:
                step_no += 1
                rest = m.group(2)
                # Preserve original indentation if any
                indent = line[: len(line) - len(line.lstrip())]
                final.append(f"{indent}{step_no}. {rest}")
            else:
                final.append(line)

        return ingredients + "\n".join(final)

    # Fallback: append ingredient + note
    return (
        body.rstrip()
        + "\n\n• A pinch of hing (asafoetida)\n"
        + "Note: Sprinkle a pinch of hing while cooking for aroma.\n"
    )


def tweak_description(desc: str, old_title: str, new_title: str) -> str:
    out = desc
    if old_title and old_title in out:
        out = out.replace(old_title, new_title)
    # Light phrasing nudge
    out = re.sub(r"\bdelicious\b", "flavourful", out, flags=re.I)
    out = re.sub(r"\birresistible\b", "moreish", out, flags=re.I)
    out = re.sub(r"\bdelightful\b", "satisfying", out, flags=re.I)
    return out


def process_recipe(title: str, body: str) -> tuple[str, str]:
    new_title = rename_dish(title, body)
    body = remove_aluminium(body)

    # Split description vs rest roughly
    lines = body.splitlines()
    # Body typically starts with blank or description
    # Apply method rewords only to Method section
    if "Method" in body:
        pre, method = body.split("Method", 1)
        pre = tweak_description(pre, title, new_title)
        method_lines = []
        for line in method.splitlines():
            if re.match(r"^\d+\.\s+", line.strip()):
                method_lines.append(tweak_method_line(line))
            else:
                method_lines.append(line)
        body = pre + "Method" + "\n".join(method_lines)
        # fix accidental missing newline after Method
        body = re.sub(r"Method(?!\n)", "Method\n", body, count=1)
    else:
        body = tweak_description(body, title, new_title)

    if should_add_hing(new_title, body):
        body = inject_hing(body)

    # Final aluminium scrub after edits
    body = remove_aluminium(body)
    return new_title, body.strip() + "\n"


def parse_recipes(text: str) -> tuple[str, list[tuple[str, str]]]:
    chunks = text.split(f"\n{SEP}\n")
    header = chunks[0].rstrip()
    recipes: list[tuple[str, str]] = []
    # Pattern: title, body, title, body...
    i = 1
    while i + 1 < len(chunks):
        title = chunks[i].strip()
        body = chunks[i + 1]
        # Body may include trailing whitespace; keep content after title separator
        # In source, after title chunk comes body chunk that starts with description
        recipes.append((title, body))
        i += 2
    return header, recipes


def main() -> None:
    text = SRC.read_text(encoding="utf-8")
    header, recipes = parse_recipes(text)

    new_header = (
        "VEGETARIAN RECIPE COLLECTION — HING EDITION\n"
        f"{len(recipes)} recipes\n\n"
        "Adapted plain-text recipes: dish names and methods lightly reworded.\n"
        "Aluminium/alum references removed; hing (asafoetida) added where suitable.\n"
        "Saved for use from D_Drive folder.\n"
    )

    out_parts = [new_header]
    for title, body in recipes:
        new_title, new_body = process_recipe(title, body)
        out_parts.append(SEP)
        out_parts.append(new_title)
        out_parts.append(SEP)
        out_parts.append("")
        out_parts.append(new_body.rstrip())
        out_parts.append("")

    output = "\n".join(out_parts).rstrip() + "\n"
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(output, encoding="utf-8")
    ARTIFACT.write_text(output, encoding="utf-8")

    # Sanity checks (ignore header explanatory text)
    body_only = "\n".join(output.splitlines()[7:])
    alum_hits = len(re.findall(r"alumini?um|\balum\b|fitkari", body_only, flags=re.I))
    hing_hits = len(re.findall(r"\bhing\b|\basafoetida\b", body_only, flags=re.I))
    print(f"Recipes processed: {len(recipes)}")
    print(f"Wrote: {OUT_FILE}")
    print(f"Artifact: {ARTIFACT}")
    print(f"Remaining alum/aluminium mentions in recipes: {alum_hits}")
    print(f"Hing/asafoetida mentions: {hing_hits}")
    # Show a few renamed titles
    print("Sample renames:")
    for t, b in recipes[:8]:
        nt, _ = process_recipe(t, b)
        print(f"  {t} -> {nt}")

    # Verify aluminium replacements landed
    for needle in ("parchment sheet", "steel tray", "iron kadai"):
        print(f"  has {needle}: {needle in output}")


if __name__ == "__main__":
    main()
