"""Parslia Kitchen OS recipe spec: nutrition, allergens, chef method, service notes.

Kitchen values are estimates for a professional card, not lab analysis.
Always verify allergens before service.
"""

from __future__ import annotations

import re
from datetime import date

from parslia_methods import METHOD_OVERRIDES

FRACTIONS = {"½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125}

# kcal, protein, carbs, fat, fibre per 100 g edible
NUT = {
    "atta": (340, 12, 72, 1.5, 11),
    "wheat": (340, 12, 72, 1.5, 11),
    "maida": (364, 10, 76, 1, 3),
    "besan": (387, 22, 58, 6, 11),
    "rice": (360, 7, 79, 0.6, 1.3),
    "poha": (350, 7, 77, 1, 4),
    "oat": (389, 17, 66, 7, 11),
    "dal": (350, 22, 60, 1.5, 15),
    "lentil": (350, 25, 60, 1, 16),
    "chana": (360, 19, 61, 6, 17),
    "chickpea": (360, 19, 61, 6, 17),
    "bean": (330, 21, 60, 1.5, 16),
    "moong": (347, 24, 63, 1.2, 16),
    "urad": (341, 25, 59, 1.6, 18),
    "toor": (343, 22, 63, 1.5, 15),
    "peas": (81, 5, 14, 0.4, 5),
    "spinach": (23, 3, 4, 0.4, 2),
    "saag": (26, 3, 4, 0.4, 3),
    "mustard green": (27, 3, 5, 0.4, 3),
    "cabbage": (25, 1.3, 6, 0.1, 2.5),
    "potato": (77, 2, 17, 0.1, 2.2),
    "tomato": (18, 0.9, 4, 0.2, 1.2),
    "onion": (0, 0, 0, 0, 0),  # unused; diet forbids
    "ginger": (80, 1.8, 18, 0.8, 2),
    "chilli": (40, 2, 9, 0.4, 1.5),
    "capsicum": (31, 1, 6, 0.3, 2),
    "carrot": (41, 0.9, 10, 0.2, 2.8),
    "cucumber": (15, 0.7, 4, 0.1, 0.5),
    "brinjal": (25, 1, 6, 0.2, 3),
    "okra": (33, 1.9, 7, 0.2, 3),
    "bhindi": (33, 1.9, 7, 0.2, 3),
    "cauliflower": (25, 1.9, 5, 0.3, 2),
    "pumpkin": (26, 1, 7, 0.1, 0.5),
    "coconut": (354, 3, 15, 33, 9),
    "ghee": (900, 0, 0, 100, 0),
    "oil": (884, 0, 0, 100, 0),
    "butter": (717, 0.9, 0.1, 81, 0),
    "milk": (64, 3.3, 5, 3.6, 0),
    "yogurt": (61, 3.5, 5, 3.3, 0),
    "dahi": (61, 3.5, 5, 3.3, 0),
    "curd": (61, 3.5, 5, 3.3, 0),
    "paneer": (265, 18, 1.2, 21, 0),
    "khoya": (421, 14, 25, 26, 0),
    "chhena": (258, 18, 4, 20, 0),
    "sugar": (387, 0, 100, 0, 0),
    "jaggery": (383, 0, 98, 0, 0),
    "honey": (304, 0.3, 82, 0, 0),
    "sesame": (573, 18, 23, 50, 12),
    "peanut": (567, 26, 16, 49, 9),
    "cashew": (553, 18, 30, 44, 3),
    "almond": (579, 21, 22, 50, 12),
    "pistachio": (560, 20, 28, 45, 10),
    "besan ladoo": (450, 10, 50, 22, 4),
    "salt": (0, 0, 0, 0, 0),
    "spice": (300, 10, 50, 12, 20),
    "hing": (297, 4, 68, 1, 4),
    "water": (0, 0, 0, 0, 0),
    "lemon": (29, 1.1, 9, 0.3, 2.8),
    "mango": (60, 0.8, 15, 0.4, 1.6),
    "pomegranate": (83, 1.7, 19, 1.2, 4),
    "makhana": (347, 10, 77, 0.1, 7),
    "sattu": (380, 20, 60, 5, 12),
    "ragi": (336, 7, 72, 1.3, 11),
    "bajra": (361, 12, 67, 5, 11),
    "makki": (365, 9, 74, 4.7, 7),
    "banana": (89, 1.1, 23, 0.3, 2.6),
    "default": (120, 4, 18, 4, 3),
}

ALLERGEN_RULES = [
    ("Gluten (wheat)", ("atta", "maida", "wheat", "sooji", "rava", "semolina", "bread", "naan", "thepla", "puri", "poori", "sooji", "hing")),
    ("Milk", ("milk", "dahi", "yogurt", "yoghurt", "curd", "ghee", "paneer", "khoya", "mawa", "cream", "rabri", "lassi", "shrikhand", "chhena", "chenna", "malai", "butter", "raita", "kadhi", "basundi", "rabdi", "phirni", "kheer", "payasam", "payesh")),
    ("Sesame", ("sesame", "tahini", "til oil", "til seeds", "white til", "black til")),
    ("Peanuts", ("peanut", "groundnut", "mungfali")),
    ("Tree nuts", ("cashew", "almond", "pistachio", "walnut", "charoli", "badam")),
    ("Mustard", ("mustard", "kasundi", "sarson", "rai seeds")),
    ("Soya", ("soy", "soya", "tamari")),
    ("Sulphites", ("sulphite", "sulfite")),
]


def _num(qty: str) -> float:
    q = (qty or "").strip().replace(" ", "")
    if not q:
        return 0.0
    if q in FRACTIONS:
        return FRACTIONS[q]
    m = re.match(r"^(\d+)([½¼¾⅓⅔⅛])$", q)
    if m:
        return float(m.group(1)) + FRACTIONS[m.group(2)]
    if "/" in q:
        a, b = q.split("/", 1)
        try:
            return float(a) / float(b)
        except ValueError:
            return 0.0
    try:
        return float(q)
    except ValueError:
        return 0.0


def grams_for(item: dict) -> float:
    n = _num(item.get("qty"))
    unit = (item.get("unit") or "").lower()
    name = (item.get("item") or "").lower()
    if unit in ("g",):
        return n
    if unit in ("kg",):
        return n * 1000
    if unit in ("ml",):
        return n
    if unit in ("l",):
        return n * 1000
    if unit in ("tsp",):
        return n * (6 if "salt" in name else 2.5)
    if unit in ("tbsp",):
        return n * (14 if any(w in name for w in ("oil", "ghee", "milk")) else 8)
    if unit in ("cup", "cups"):
        if any(w in name for w in ("milk", "water", "dahi", "yogurt", "stock")):
            return n * 240
        if "atta" in name or "flour" in name or "besan" in name:
            return n * 120
        if "rice" in name:
            return n * 190
        if "spinach" in name or "saag" in name or "leaf" in name:
            return n * 30
        return n * 150
    if unit in ("pinch", "pinches"):
        return n * 0.4
    if unit in ("pieces", "piece"):
        if "chilli" in name or "chili" in name:
            return n * 8
        if "tomato" in name:
            return n * 100
        if "potato" in name:
            return n * 150
        if "cucumber" in name:
            return n * 180
        if "banana" in name:
            return n * 120
        if "mango" in name:
            return n * 200
        if "cardamom" in name or "pod" in name:
            return n * 0.5
        return n * 80
    if unit in ("leaves", "leaf"):
        return n * 0.5
    if unit in ("pods", "pod"):
        return n * 0.4
    if unit in ("bunch", "bunches", "handful", "handfuls"):
        return n * 40
    return n * 20 if n else 30


def lookup_nut(name: str):
    n = name.lower()
    best = None
    best_pos = 10**9
    for key, vals in NUT.items():
        if key == "default":
            continue
        pos = n.find(key)
        if pos != -1 and pos < best_pos:
            best_pos = pos
            best = vals
    return best or NUT["default"]


def estimate_nutrition(recipe: dict) -> dict:
    kcal = prot = carb = fat = fibre = 0.0
    for item in recipe.get("ingredients") or []:
        g = grams_for(item)
        k, p, c, f, fi = lookup_nut(item.get("item") or "")
        factor = g / 100.0
        kcal += k * factor
        prot += p * factor
        carb += c * factor
        fat += f * factor
        fibre += fi * factor
    servings = max(int(recipe.get("servings") or 4), 1)
    return {
        "kcal": int(round(kcal / servings)),
        "protein_g": int(round(prot / servings)),
        "carbs_g": int(round(carb / servings)),
        "fat_g": int(round(fat / servings)),
        "fibre_g": int(round(fibre / servings)),
    }


def detect_allergens(recipe: dict) -> list[str]:
    blob = " ".join(
        [
            recipe.get("name") or "",
            " ".join((i.get("item") or "") for i in recipe.get("ingredients") or []),
            " ".join(recipe.get("method") or []),
        ]
    ).lower()
    found = []
    for label, keys in ALLERGEN_RULES:
        for key in keys:
            if re.search(rf"(?<![a-z]){re.escape(key)}(?![a-z])", blob):
                found.append(label)
                break
    if not found:
        found.append("None identified in this spec — still verify hing brand (many contain wheat) and spice blends.")
    else:
        if re.search(r"(?<![a-z])hing(?![a-z])", blob) and "Gluten (wheat)" not in found:
            found.append("Gluten (wheat) — possible if hing is compounded with wheat flour; use gluten-free hing if required.")
        found.append("Always verify labels; this card is a kitchen estimate, not a lab certificate.")
    return found


def diet_tags(recipe: dict, allergens: list[str]) -> list[str]:
    tags = ["Vegetarian", "No onion", "No garlic", "No eggs", "No meat", "No fish"]
    blob = " ".join(a.lower() for a in allergens)
    dairy = "milk" in blob
    gluten = "gluten" in blob
    if not dairy:
        tags.append("Vegan")
    if not gluten:
        tags.append("Gluten Free*")
    else:
        tags.append("Contains gluten")
    if "sesame" in blob:
        tags.append("Sesame")
    if "peanut" in blob:
        tags.append("Peanuts")
    if "tree nut" in blob:
        tags.append("Tree nuts")
    if "mustard" in blob:
        tags.append("Mustard")
    if "soya" in blob:
        tags.append("Soya")
    return tags


def service_temp(recipe: dict) -> str:
    cat = recipe.get("category") or ""
    name = (recipe.get("name") or "").lower()
    if cat == "Salad" or any(w in name for w in ("raita", "lassi", "aamras", "shrikhand", "salad", "chaat")):
        if "lassi" in name or "aamras" in name or "shrikhand" in name:
            return "Chilled"
        return "Cold"
    if cat in ("Sweet", "Dessert") and any(w in name for w in ("kheer", "phirni", "rabdi", "rabri", "payasam", "custard")):
        return "Hot or chilled"
    return "Hot"


def thin_method(steps: list) -> bool:
    if not steps:
        return True
    if len(steps) < 5:
        return True
    avg = sum(len(s) for s in steps) / max(len(steps), 1)
    return avg < 55


def build_method(recipe: dict) -> list[str]:
    name = recipe.get("name") or ""
    if name in METHOD_OVERRIDES:
        return list(METHOD_OVERRIDES[name])
    steps = list(recipe.get("method") or [])
    if not thin_method(steps):
        return wrap_service(recipe, steps)
    return generated_method(recipe, steps)


def wrap_service(recipe: dict, steps: list[str]) -> list[str]:
    pan = recipe.get("cookware") or "stainless steel cookware — never aluminium"
    out = [
        f"Mise en place. Weigh all ingredients for {recipe.get('servings', 4)} portions. Set out {pan}. Confirm spice blends have no onion or garlic powder."
    ]
    for s in steps:
        text = s.strip()
        if len(text) < 50:
            text = expand_short(text, recipe)
        out.append(text)
    out.append(finish_step(recipe))
    out.append(hold_step(recipe))
    return out


def expand_short(step: str, recipe: dict) -> str:
    s = step.rstrip(".")
    pan = recipe.get("cookware") or "steel or iron"
    return (
        f"{s}. Work in {pan}. Cook to the doneness below, tasting salt at the end. "
        "Do not add onion, garlic or aluminium cookware."
    )


def generated_method(recipe: dict, original: list[str]) -> list[str]:
    cat = recipe.get("category") or "Main"
    pan = recipe.get("cookware") or "stainless steel — never aluminium"
    servings = recipe.get("servings", 4)
    atoms: list[str] = []
    for raw in original or []:
        text = str(raw).strip()
        if not text:
            continue
        for part in re.split(r"(?<=[.!?])\s+", text):
            bit = part.strip().rstrip(".")
            if bit and len(bit) > 2:
                atoms.append(bit)
    core = ". ".join(atoms) if atoms else "Cook through without onion or garlic"
    names = " ".join(i.get("item") or "" for i in recipe.get("ingredients") or []).lower()
    steps = [
        (
            f"Mise en place. Weigh every ingredient on this card for {servings} portions. "
            f"Set {pan}. Wash produce. Confirm spice blends have no onion or garlic powder. "
            "No onion, no garlic, no aluminium."
        ),
        mise_cut(recipe),
    ]
    if int(recipe.get("cook_min") or 0) > 0 and ("hing" in names or "asafoetida" in names):
        steps.append(
            f"Heat fat in {pan} on medium. Bloom hing 20–30 seconds until fragrant — this is the onion-garlic stand-in. Do not burn it."
        )
    if atoms:
        for bit in atoms:
            steps.append(expand_short(bit, recipe) if len(bit) < 80 else f"{bit}.")
    else:
        steps.append(cook_step(cat, core, pan, recipe))
    steps.append(doneness_step(cat, recipe))
    steps.append(finish_step(recipe))
    steps.append(hold_step(recipe))
    return [s for s in steps if s]


def mise_cut(recipe: dict) -> str:
    names = " ".join(i.get("item") or "" for i in recipe.get("ingredients") or []).lower()
    bits = ["Cut vegetables to even size so they cook together."]
    if "spinach" in names or "saag" in names or "greens" in names:
        bits.append("Wash greens in several changes of water; drain and squeeze dry.")
    if "potato" in names:
        bits.append("If using potato, cook until tender, drain, and steam-dry so the mix is not wet.")
    if "paneer" in names:
        bits.append("Pat paneer dry; cubes should be even, about 2.5 cm.")
    if "atta" in names or "dough" in names or recipe.get("category") == "Bread":
        bits.append("For dough, add water gradually; rest covered 10–15 minutes before rolling.")
    if "milk" in names:
        bits.append("Use a heavy stainless steel milk pot. Acidic or milk dishes must never touch aluminium.")
    return " ".join(bits)


def cook_step(cat: str, core: str, pan: str, recipe: dict) -> str:
    pan_l = pan.lower()
    if cat == "Starter" and ("fry" in pan_l or "kadai" in pan_l):
        return (
            f"Heat fat in {pan} to medium (about 170–180 C for frying). {core} "
            "Cook in batches; crowding drops the temperature and greases the crust."
        )
    if cat == "Bread":
        return (
            f"Heat the tawa or steamer as specified. {core} "
            "Cook until the bread puffs or shows light brown spots. Finish with ghee if listed — never garlic butter."
        )
    if cat in ("Sweet", "Dessert"):
        return (
            f"Cook in {pan} on low to medium heat, stirring so sugar or milk does not catch. {core} "
            "For syrup sweets, cook to one-string consistency unless the step says otherwise."
        )
    if cat == "Salad":
        return (
            f"Keep cuts even. {core} Dress at the last minute so the salad does not weep. Taste lemon and salt."
        )
    return (
        f"Heat fat in {pan}. Bloom hing 20–30 seconds until fragrant — this replaces onion and garlic. "
        f"{core} Simmer until vegetables are tender or dal is creamy. Stir so nothing sticks."
    )


def doneness_step(cat: str, recipe: dict) -> str:
    if cat == "Bread":
        return "Doneness: bread is cooked through, no wet dough in the centre, light brown spots on the face."
    if cat in ("Sweet", "Dessert"):
        return "Doneness: mixture leaves the sides of the pan, or milk is thick enough to coat a spoon, or syrup has taken the stated string."
    if cat == "Salad":
        return "Doneness: vegetables stay crisp; dressing coats evenly; seasoning is bright, not flat."
    if cat == "Starter":
        return "Doneness: crust or crumb is set, centre is hot, no raw flour or potato taste. Drain on a steel rack, not paper in the fryer basket."
    return "Doneness: vegetables yield to a knife, gravy coats a spoon, salt is balanced. Rest 2 minutes off the heat so seasoning settles."


def finish_step(recipe: dict) -> str:
    return (
        f"Taste and adjust salt, lemon or chilli only — do not add onion or garlic at the finish. "
        f"Garnish as listed. Yield is {recipe.get('servings', 4)} portions."
    )


def hold_step(recipe: dict) -> str:
    temp = service_temp(recipe)
    cat = recipe.get("category")
    if cat == "Salad" or temp in ("Cold", "Chilled"):
        return (
            f"Hold chilled, covered, up to 2 hours. Stir before service. Discard if it weeps heavily or smells sour beyond yogurt character. Service: {temp}."
        )
    if cat == "Bread":
        return "Hold wrapped in a clean cloth in a covered steel box up to 30 minutes. Refresh on a hot tawa 20 seconds if needed. Service: Hot."
    if cat in ("Sweet", "Dessert"):
        return f"Hold as the dish is eaten — hot sweets in a bain of hot water, chilled sweets in the fridge. Label date and time. Service: {temp}."
    return (
        f"Hold hot above 63 C if the pass is delayed, or cool quickly and reheat once only to piping hot. "
        f"Do not hold in aluminium. Service: {temp}."
    )


def annotate_ingredients(recipe: dict) -> list[dict]:
    out = []
    for item in recipe.get("ingredients") or []:
        row = dict(item)
        g = grams_for(row)
        unit = (row.get("unit") or "").lower()
        if unit in ("tsp", "tbsp") and g:
            gtxt = f"{g:.1f}".rstrip("0").rstrip(".")
            row["approx"] = f"≈ {gtxt} g"
        elif unit in ("g", "ml", "kg", "l") or not g:
            row["approx"] = ""
        else:
            row["approx"] = f"≈ {int(round(g))} g"
        out.append(row)
    return out


def chef_notes(recipe: dict, allergens: list[str]) -> str:
    name = recipe.get("name") or "this dish"
    names = " ".join(i.get("item") or "" for i in recipe.get("ingredients") or []).lower()
    if name == "Hara bhara kebab (no onion garlic)":
        return (
            "Squeeze spinach bone-dry. Water is the usual reason kebabs break. "
            "Roasted besan is the binder — raw besan tastes pasty. "
            "Chill shaped kebabs at least 15 minutes before the tawa. "
            "Medium heat only; high heat colours the outside and leaves a wet centre. "
            "Make-ahead: shape and chill up to 6 hours. Fry to order. "
            "If grilling, make slightly thicker kebabs and oil the bars; chill 30 minutes first."
        )
    cat = recipe.get("category") or ""
    if cat == "Salad" or any(w in name.lower() for w in ("raita", "lassi", "salad", "chaat", "koshimbir")):
        return (
            f"For {name}: squeeze wet vegetables dry or the bowl weeps on the pass. "
            "Season slightly higher than you think — cold dulls salt. "
            "No onion, no garlic, no allium garnish. "
            "Use steel or glass, never aluminium. "
            "Dress at the last minute. Verify dahi and spice labels."
        )
    if cat in ("Sweet", "Dessert") and int(recipe.get("cook_min") or 0) == 0:
        return (
            f"For {name}: keep it cold and set before service. "
            "Never store yogurt or milk sweets in aluminium. "
            "Garnish nuts only if the allergen card allows. "
            "Read spice and hing labels if used."
        )
    bits = [
        f"For {name}: keep the mix slightly drier than you think; wet mixes split or go greasy.",
        "Bloom hing in hot fat 20–30 seconds; raw hing tastes medicinal.",
        "Commercial hing is often cut with wheat flour — use a gluten-free hing if you must mark Gluten Free.",
        "Never cook tomato, tamarind, lemon, yogurt or milk in aluminium; use stainless steel, iron, clay or glass.",
        "Spice blends: read the packet. Many garam masalas hide onion or garlic powder.",
    ]
    if "spinach" in names or "saag" in names:
        bits.insert(0, "Wash greens until the water is clear; grit ruins the dish.")
    if "paneer" in names:
        bits.append("Pat paneer dry and do not boil it hard or it turns rubbery.")
    if "yogurt" in names or "dahi" in names or "curd" in names:
        bits.append("Bring yogurt to a simmer gently and stir; a rolling boil can split it.")
    if "besan" in names:
        bits.append("Cook or roast besan until the raw smell is gone.")
    return " ".join(bits)


def service_notes(recipe: dict, allergens: list[str]) -> str:
    temp = service_temp(recipe)
    alls = "; ".join(allergens[:6])
    cat = recipe.get("category")
    name_l = (recipe.get("name") or "").lower()
    plate = {
        "Starter": "Serve immediately while crisp or hot. Offer a chutney or raita that is also onion-garlic free.",
        "Main": "Plate with bread or rice from the same kitchen card. Sauce should nap, not flood.",
        "Side": "Serve family-style in a steel bowl. Keep a lid on at the pass so it does not skin.",
        "Bread": "Send to table wrapped. Do not stack in plastic or they sweat.",
        "Sweet": "Cut even portions. Garnish with nuts only if the allergen card allows.",
        "Dessert": "Serve in steel or glass bowls. If chilled, take out 5 minutes before the pass.",
        "Salad": "Dress at the last minute. Toss at the pass, do not send a wet bowl.",
    }.get(cat, "Serve as plated below.")
    if "raita" in name_l or "lassi" in name_l or "shrikhand" in name_l:
        plate = "Serve in a steel or glass bowl. Stir at the pass so it is not split or settled."
    return (
        f"{plate} Service temperature: {temp}. "
        f"Allergen label for this dish: {alls} "
        "State clearly: vegetarian, no onion, no garlic, no eggs, no meat, no fish. "
        "Nutrition on this card is an estimate for 1 portion of 4."
    )


def professionalize(recipe: dict) -> dict:
    rec = dict(recipe)
    rec["ingredients"] = annotate_ingredients(rec)
    rec["method"] = build_method(rec)
    rec["allergens"] = detect_allergens(rec)
    rec["nutrition"] = estimate_nutrition(rec)
    rec["tags"] = diet_tags(rec, rec["allergens"])
    rec["service"] = service_temp(rec)
    rec["yield_label"] = f"{rec.get('servings', 4)} portions"
    rec["portion_label"] = "1 portion"
    rec["chef_notes"] = rec.get("chef_notes") or chef_notes(rec, rec["allergens"])
    rec["service_notes"] = rec.get("service_notes") or service_notes(rec, rec["allergens"])
    rec["printed"] = date.today().strftime("%d %B %Y")
    rec["brand"] = "Parslia Kitchen OS"
    rec["pure"] = "Pure Prasad · No onion · No garlic · No eggs · No meat · No fish"
    rec["nutrition_disclaimer"] = (
        "Nutrition is a kitchen estimate from typical produce values, not a laboratory analysis."
    )
    rec["time_label"] = f"Prep {rec.get('prep_min', 0)} min · Cook {rec.get('cook_min', 0)} min"
    return rec
