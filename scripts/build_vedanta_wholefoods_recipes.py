#!/usr/bin/env python3
"""Download Forest Whole Foods WP Recipe Maker cards and rewrite them
as original Vedanta-kitchen (sattvic / niramish) recipes.

Vedanta ethos applied:
  vegetarian, egg-free, no onion/garlic/shallot/leek/chive
  no mushrooms, no alcohol, no fish sauce
  hing bloomed in hot oil for cooked savoury dishes
  lemon / roasted cumin instead of alliums in cold dressings
  stainless steel or baking paper — never aluminium
  brand names stripped; methods rewritten
"""

from __future__ import annotations

import csv
import html
import json
import re
import sys
import time
import urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "recipes" / "vedanta-wholefoods"
CACHE_DIR = OUT_DIR / ".cache"
RAW_CACHE = CACHE_DIR / "wprm-raw.json"
API = "https://www.forestwholefoods.co.uk/wp-json/wp/v2/wprm_recipe"
SEP = "─" * 50
USER_AGENT = "ParsliaKitchenOS/1.0 (Vedanta recipe archive)"

FORBIDDEN = re.compile(
    r"(?i)(?<![\w-])("
    r"onions?|shallots?|garlic(?:\s*(?:cloves?|powder|paste|puree|purée|granules?))?|"
    r"leeks?|chives?|scallions?|spring\s*onions?|green\s*onions?|"
    r"mushrooms?|porcini|shiitake|chestnut\s+mushroom|"
    r"(?<!eggpl)(?<!aubergin)eggs?(?!\s*plant)|egg\s+whites?|egg\s+yolks?|"
    r"fish\s+sauce|anchov(?:y|ies)|kimchi|gochujang|"
    r"(?:red|white|rice)\s+wine(?:\s+vinegar)?|(?<!apple\s)cider(?!\s+vinegar)|"
    r"\bwine\b|\bbeer\b|marsala|sherry|rum|brandy|amaretto|"
    r"alumin[iu]m|forest\s+whole\s+foods?|biona|"
    r"meatballs?|plant[- ]based\s+meat|"
    r"textured\s+vegetable\s+protein|\btvp\b"
    r")(?![\w-])"
)

# apple cider vinegar is replaced before the forbidden check; keep a belt-and-braces scan
STRAY_ALLIUM = re.compile(
    r"(?i)\b(onion|shallot|garlic|leek|chive|scallion|mushroom|porcini|kimchi|gochujang)\b"
)

TAG_RE = re.compile(r"<[^>]+>")
SPACE_RE = re.compile(r"\s+")
SLUG_RE = re.compile(r"[^a-z0-9]+")

SWEET_RE = re.compile(
    r"(?i)cookie|cake|muffin|brownie|ice\s*cream|mousse|tiramisu|cheesecake|"
    r"flapjack|granola|pudding|shake|hot chocolate|crumble|tart|pie|waffle|"
    r"porridge|banoffee|rocky road|drizzle|energy|bar recipe|dog treat|"
    r"bread rolls|buckwheat bread|date roll|banana cake|plum cake|nectarine"
)

HOT_SAVOURY_COURSES = {
    "lunch",
    "main course",
    "dinner",
    "soup",
    "side dish",
    "appetizer",
}

COURSE_FOLDER = {
    "breakfast": "01-breakfast",
    "drinks": "08-drinks",
    "appetizer": "02-starters-snacks",
    "snack": "02-starters-snacks",
    "soup": "03-soups",
    "salad": "04-salads",
    "lunch": "05-mains",
    "main course": "05-mains",
    "dinner": "05-mains",
    "side dish": "06-sides",
    "dessert": "07-desserts",
}

TITLE_MAP = {
    "garlic and kale pasta recipe": "Kale and Fennel Pasta",
    "spaghetti with slow roasted leek recipe": "Spaghetti with Slow-Roasted Fennel",
    "mushroom ragu recipe": "Walnut and Aubergine Ragu",
    "mushroom pappardelle": "Aubergine Pappardelle",
    "creamy porcini mushroom stew recipe": "Creamy Aubergine and Walnut Stew",
    "broccoli and mushroom quesadilla recipe": "Broccoli and Aubergine Quesadilla",
    "mushroom and tempeh burger recipe": "Walnut Tempeh Burger",
    "mushroom soup recipe": "Roasted Aubergine and Cashew Soup",
    "leek and roasted mushroom lasagne recipe": "Fennel and Aubergine Lasagne",
    "mushroom and harissa rice recipe": "Aubergine and Harissa Rice",
    "roasted kale, chickpea and garlic recipe": "Roasted Kale, Chickpea and Ginger",
    "orriechete with garlic and broccoli recipe": "Orecchiette with Broccoli and Hing",
    "roasted garlic spaghetti recipe": "Slow-Roasted Tomato Spaghetti",
    "plant based meatballs recipe": "Walnut-Bean Kofta with Tomato Sauce",
    "vegan 'meat' chilli recipe": "Three-Bean Tamatar Chilli",
    "kimchi fried rice with sticky tempeh recipe": "Ginger-Cabbage Fried Rice with Sticky Tempeh",
    "pistachio tiramisu recipe": "Pistachio Chicory Layer Pudding",
    "parsnip and leek gratin": "Parsnip and Fennel Gratin",
    "spiralised courgette satay noodles": "Spiralised Courgette Satay Noodles",
    "rocket pesto recipes": "Rocket and Walnut Pesto Pasta",
    "roasted vegetable salad recipe": "Roasted Root Vegetable Salad",
}

FALLBACK_METHODS = {
    "Coconut Laksa Recipe": [
        "Bloom the hing in hot oil for a few seconds, then stir in grated ginger, chopped chilli and bruised lemongrass until fragrant.",
        "Pour in the coconut milk and vegetable stock. Simmer gently for 10 minutes.",
        "Add the tofu cubes, tamari and a pinch of unrefined sugar. Warm through for 5 minutes.",
        "Divide cooked noodles between steel bowls, ladle over the laksa, and finish with lime and coriander.",
    ],
    "Rocket Pesto Recipes": [
        "Toast the walnuts and pine nuts in a dry steel pan until just fragrant, then cool.",
        "Blend the nuts with rocket, basil, vegetarian hard cheese or nutritional yeast, lemon juice, hing and olive oil until a coarse pesto forms.",
        "Cook the spaghetti in well-salted water until al dente. Drain, keeping a little cooking water.",
        "Toss the pasta with the pesto, loosening with cooking water. Season and serve at once.",
    ],
    "Creamy Porcini Mushroom Stew Recipe": [
        "Soak the sun-dried tomatoes in hot water for 15 minutes, then chop. Keep the soaking liquor.",
        "Brown the aubergine cubes in olive oil in a steel casserole until golden. Add walnuts and cook 2 minutes more.",
        "Stir in celery and bloom the hing in the hot oil. Sprinkle over the flour and cook 1 minute.",
        "Add stock, the soaking liquor and chopped tomatoes. Simmer 20 minutes until thick and silky.",
        "Stir in the plant cream and parsley. Rest 2 minutes and serve.",
    ],
    "Broccoli and Mushroom Quesadilla Recipe": [
        "Warm olive oil in a steel pan. Bloom the hing, then fry diced aubergine, tenderstem broccoli and chilli until golden.",
        "Season, then stir through chopped toasted hazelnuts.",
        "Lay a tortilla in a dry pan, scatter plant cheese or paneer, the vegetables, then a second tortilla.",
        "Toast both sides until crisp. Rest 1 minute, cut into wedges, and serve with a lemon-yogurt dip.",
    ],
    "Spinach And Olive Pasta Salad Recipe": [
        "Cook the fusilli in salted water until just tender. Drain and cool slightly.",
        "Whisk lemon juice, maple, olive oil, roasted cumin and grated ginger into a dressing.",
        "Toss the pasta with spinach, tomatoes, olives, capers, walnuts and basil.",
        "Dress, toss once more, and serve fresh.",
    ],
    "Buckwheat and Hemp Porridge": [
        "Simmer the buckwheat flakes with water, plant milk and cinnamon until creamy, about 8 minutes.",
        "Stir in the hemp powder.",
        "Spoon into a bowl and top with berries, hazelnuts, coconut chips, chia and sultanas.",
    ],
    "Roasted Garlic Spaghetti Recipe": [
        "Heat the oven to 200°C. Halve the cherry tomatoes and spread on a steel tray.",
        "Toss with olive oil, chilli flakes, a pinch of hing, salt and pepper.",
        "Roast for 20 minutes until the tomatoes burst and catch at the edges.",
        "Cook the spaghetti in salted water until al dente, then drain, keeping a little cooking water.",
        "Tip the roasted tomatoes into a steel pan, add the pasta, parsley and cheese, and loosen with cooking water.",
        "Toss well and serve at once.",
    ],
}

LAKSA_EXTRA = [
    ("1", "", "thumb fresh ginger, grated"),
    ("1", "", "red chilli, finely chopped"),
    ("1", "", "lemongrass stalk, bruised"),
    ("1", "", "lime, juiced"),
    ("", "", "handful fresh coriander"),
]


def strip_html(text: str | None) -> str:
    if not text:
        return ""
    text = html.unescape(str(text))
    text = TAG_RE.sub(" ", text)
    text = text.replace("\u2028", " ").replace("\xa0", " ")
    return SPACE_RE.sub(" ", text).strip()


def slugify(title: str) -> str:
    s = title.lower().strip()
    s = s.replace("&", " and ")
    s = SLUG_RE.sub("-", s).strip("-")
    s = re.sub(r"-recipe$", "", s)
    return s


def fetch_raw() -> list[dict]:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    if RAW_CACHE.exists():
        return json.loads(RAW_CACHE.read_text(encoding="utf-8"))
    items: list[dict] = []
    for page in (1, 2):
        url = f"{API}?per_page=100&page={page}"
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=60) as resp:
            chunk = json.loads(resp.read().decode("utf-8"))
        items.extend(chunk)
        time.sleep(0.3)
    slim = []
    for item in items:
        rec = item.get("recipe") or {}
        slim.append(
            {
                "id": item.get("id"),
                "slug": item.get("slug"),
                "link": item.get("link"),
                "title": (item.get("title") or {}).get("rendered") or rec.get("name"),
                "recipe": rec,
            }
        )
    RAW_CACHE.write_text(json.dumps(slim, ensure_ascii=False), encoding="utf-8")
    return slim


def tag_names(rec: dict, key: str) -> list[str]:
    tags = rec.get("tags") or {}
    return [strip_html(t.get("name") or "") for t in tags.get(key) or [] if t.get("name")]


def parse_groups(rec: dict) -> list[tuple[str, list[dict]]]:
    groups = []
    for group in rec.get("ingredients") or []:
        gname = strip_html(group.get("name") or "")
        rows = []
        for item in group.get("ingredients") or []:
            rows.append(
                {
                    "amount": strip_html(str(item.get("amount") or "")),
                    "unit": strip_html(str(item.get("unit") or "")),
                    "name": strip_html(item.get("name") or ""),
                    "notes": strip_html(item.get("notes") or ""),
                }
            )
        groups.append((gname, rows))
    return groups


FORCE_METHOD_TITLES = {
    "Roasted Garlic Spaghetti Recipe",
}


def parse_steps(rec: dict, source_title: str) -> list[str]:
    if source_title in FORCE_METHOD_TITLES:
        return list(FALLBACK_METHODS[source_title])
    steps = []
    for group in rec.get("instructions") or []:
        heading = strip_html(group.get("name") or "")
        if heading:
            steps.append(heading.rstrip(":") + ".")
        for item in group.get("instructions") or []:
            text = strip_html(item.get("text") or "")
            if text:
                steps.append(text)
    if not steps:
        steps = list(FALLBACK_METHODS.get(source_title, []))
    return steps


def is_pure_allium(name: str) -> bool:
    t = name.lower()
    t = re.sub(
        r"\b(cloves?|powder|paste|puree|purée|granules?|bulb|finely|roughly|"
        r"thinly|chopped|sliced|diced|minced|crushed|peeled|grated|fresh|"
        r"dried|roasted|large|medium|small|optional|for garnish|to garnish|"
        r"to serve|and)\b",
        " ",
        t,
    )
    t = re.sub(r"[^a-z\s]", " ", t)
    t = SPACE_RE.sub(" ", t).strip()
    return bool(
        re.fullmatch(
            r"(red |white |brown |yellow |spring )?(onions?|shallots?|garlic|"
            r"leeks?|chives?|scallions?)",
            t,
        )
    )


def is_mushroom_line(name: str) -> bool:
    return bool(re.search(r"(?i)\b(mushrooms?|porcini|shiitake)\b", name))


def is_header_ingredient(name: str) -> bool:
    t = name.strip().lower().rstrip(":-")
    if re.match(r"^(for the|to make the|log in)", t):
        return True
    if re.match(r"^(to garnish|a few to garnish)\b", t):
        return True
    return False


def format_ing(amount: str, unit: str, name: str, notes: str = "") -> str:
    bits = [b for b in (amount, unit, name) if b]
    line = " ".join(bits)
    if notes:
        line = f"{line}, {notes}" if line else notes
    line = SPACE_RE.sub(" ", line).strip(" ,")
    return line


def swap_name(name: str, notes: str, ctx: dict) -> tuple[str, str] | None:
    raw = f"{name} {notes}".strip()
    lower = raw.lower()

    if re.search(r"(?i)\bbulbs?\s+garlic\b|\bgarlic\s+bulbs?\b|\bcloves?\s+of\s+garlic\b", raw):
        ctx["removed_allium"] = True
        return None
    if is_pure_allium(name) or is_pure_allium(raw):
        ctx["removed_allium"] = True
        return None
    if re.search(r"(?i)garlic\s+bulbs?|^(?:roasted\s+)?bulbs?$", name.strip()):
        ctx["removed_allium"] = True
        return None

    if is_header_ingredient(name) or is_header_ingredient(raw):
        if re.search(r"(?i)meatball", raw):
            ctx["group_hint"] = "kofta"
        return None

    if is_mushroom_line(name) or is_mushroom_line(raw):
        ctx["removed_mushroom"] = True
        if re.search(r"(?i)dried|porcini", raw):
            return "sun-dried tomatoes", "plus 30 g walnuts, chopped"
        if re.search(r"(?i)flat\s*cap", raw):
            return "aubergine, cut into 1 cm slices", notes
        if re.search(r"(?i)closed\s*cup|chestnut", raw):
            return "aubergine, finely diced", notes
        return "aubergine, diced", notes

    name = re.sub(r"(?i)\b(red |white |spring )?(onions?|shallots?|leeks?|chives?|scallions?)\b", "", name)
    name = re.sub(r"(?i)\bgarlic(?:\s*(?:cloves?|powder|paste))?\b", "", name)
    if re.search(r"(?i)onion|shallot|garlic|leek|chive", name):
        ctx["removed_allium"] = True
        name = re.sub(r"(?i)\b(onions?|shallots?|garlic|leeks?|chives?)\b", "", name)

    # eggs
    if re.search(r"(?i)\b\d+\s*(large |medium |organic )?eggs?\b", f"{amount_join(name)} {raw}") or re.fullmatch(
        r"(?i)(large |medium |organic )?eggs?", name.strip()
    ):
        ctx["removed_egg"] = True
        count = 1
        m = re.search(r"(\d+)", notes or name)
        return "ground flaxseed mixed with water (1 tbsp flax + 3 tbsp water per egg)", notes

    if re.search(r"(?i)\beggs?\b", name) and "eggplant" not in lower:
        ctx["removed_egg"] = True
        name = re.sub(r"(?i)\beggs?\b", "flax egg", name)

    replacements = [
        (r"(?i)plant[- ]based fish sauce", "tamari with a squeeze of lemon"),
        (r"(?i)fish sauce", "tamari with a squeeze of lemon"),
        (r"(?i)gochujang", "tomato puree mixed with chilli powder and a little maple"),
        (r"(?i)\bkimchi\b", "finely shredded cabbage tossed with ginger, lemon and a pinch of chilli"),
        (r"(?i)textured vegetable protein|\btvp\b|plant[- ]based meat\b", "cooked brown lentils, drained"),
        (r"(?i)plant[- ]based parmesan", "vegetarian hard cheese or nutritional yeast"),
        (r"(?i)plant-based vegetarian hard cheese", "vegetarian hard cheese or nutritional yeast"),
        (r"(?i)parmesan or plant-based alternative", "vegetarian hard cheese or nutritional yeast"),
        (r"(?i)parmesan|parmigiano|pecorino", "vegetarian hard cheese or nutritional yeast"),
        (r"(?i)mozzarella or plant-based alternative", "paneer or plant cheese"),
        (r"(?i)\bmozzarella\b", "paneer or plant cheese"),
        (r"(?i)\bfeta\b", "crumbled paneer or plant feta"),
        (r"(?i)single cream or plant-based alternative", "cashew cream or oat cream"),
        (r"(?i)red wine vinegar|white wine vinegar|rice wine vinegar|rice vinegar", "fresh lemon juice"),
        (r"(?i)apple cider vinegar", "fresh lemon juice"),
        (r"(?i)balsamic vinegar", "lemon juice with a drop of maple"),
        (r"(?i)\bvinegar\b", "lemon juice"),
        (r"(?i)brewed coffee|organic coffee|espresso", "roasted chicory decoction"),
        (r"(?i)\bcoffee\b", "roasted chicory decoction"),
        (r"(?i)alumin[iu]m foil", "baking paper"),
        (r"(?i)biona\s+", ""),
        (r"(?i)forest whole foods?[’']?s?\s+", ""),
        (r"(?i)lamb’s lettuce|lamb's lettuce", "lamb's lettuce"),
    ]
    for pat, repl in replacements:
        if re.search(pat, name):
            name = re.sub(pat, repl, name)
        if re.search(pat, notes):
            notes = re.sub(pat, repl, notes)

    name = SPACE_RE.sub(" ", name).strip(" ,;-")
    notes = SPACE_RE.sub(" ", notes).strip(" ,;-")
    if not name:
        return None
    if re.fullmatch(r"(?i)bulbs?|cloves?", name):
        ctx["removed_allium"] = True
        return None
    if re.search(r"(?i)^(a few|handful)?\s*(to garnish|for garnish)$", name):
        return None
    return name, notes


def amount_join(name: str) -> str:
    return name


def adapt_title(source: str) -> str:
    key = strip_html(source).lower()
    if key in TITLE_MAP:
        return TITLE_MAP[key]
    title = strip_html(source)
    title = re.sub(r"(?i)\brecipe\b", "", title)
    title = re.sub(r"(?i)garlic and", "", title)
    title = re.sub(r"(?i)and garlic", "", title)
    title = re.sub(r"(?i)\bgarlic\b", "hing", title)
    title = re.sub(r"(?i)\bleeks?\b", "fennel", title)
    title = re.sub(r"(?i)porcini mushroom|mushroom", "aubergine", title)
    title = re.sub(r"(?i)plant[- ]based meatballs", "Walnut-Bean Kofta", title)
    title = re.sub(r"(?i)vegan ['’]?meat['’]?", "Bean", title)
    title = re.sub(r"\s{2,}", " ", title).strip(" -|&")
    title = title.replace("&amp;", "and").replace("&", "and")
    return title


def classify_style(title: str, courses: list[str]) -> str:
    cl = [c.lower() for c in courses]
    if any(c == "dessert" for c in cl) or SWEET_RE.search(title):
        return "sweet"
    if any(c == "salad" for c in cl) or re.search(r"(?i)\bsalad\b", title):
        return "salad"
    if any(c == "breakfast" for c in cl) and SWEET_RE.search(title):
        return "sweet"
    if any(c in HOT_SAVOURY_COURSES for c in cl):
        return "hot"
    if any(c == "snack" for c in cl) and not SWEET_RE.search(title):
        return "hot"
    return "other"


def rewrite_step(text: str, style: str) -> str:
    s = text
    s = re.sub(r"(?i)forest whole foods?[’']?s?\s+", "", s)
    s = re.sub(r"(?i)\bbiona\s+", "", s)

    s = re.sub(r"(?i)red wine vinegar|white wine vinegar|rice wine vinegar|rice vinegar", "lemon juice", s)
    s = re.sub(r"(?i)apple cider vinegar", "lemon juice", s)
    s = re.sub(r"(?i)balsamic vinegar", "lemon juice with a little maple", s)
    s = re.sub(r"(?i)\bvinegar\b", "lemon juice", s)
    s = re.sub(r"(?i)plant[- ]based fish sauce|fish sauce", "tamari and lemon", s)
    s = re.sub(r"(?i)\bkimchi\b", "the ginger cabbage", s)
    s = re.sub(r"(?i)gochujang", "the chilli-tomato paste", s)
    s = re.sub(r"(?i)textured vegetable protein|\btvp\b|plant[- ]based meat\b", "the cooked lentils", s)
    s = re.sub(r"(?i)dried porcini|porcini", "soaked sun-dried tomatoes", s)
    s = re.sub(r"(?i)mushrooms?", "aubergine", s)
    s = re.sub(r"(?i)brewed coffee|\bcoffee\b|espresso", "chicory decoction", s)
    s = re.sub(r"(?i)alumin[iu]m (foil|tray|tin)", r"steel \1", s)
    s = re.sub(r"(?i)line a baking tray with baking paper", "line a steel baking tray with baking paper", s)
    s = re.sub(r"(?i)beaten egg(/milk)?", "plant milk", s)
    s = re.sub(r"(?i)a little egg or milk to glaze", "plant milk to glaze", s)
    s = re.sub(r"(?i)glazing with a little beaten egg/milk", "glazing with plant milk", s)
    s = re.sub(r"(?i)beat in the egg", "beat in the flax egg", s)
    s = re.sub(r"(?i)combine the olive oil, sugar, eggs,", "combine the olive oil, sugar, flax eggs,", s)
    s = re.sub(r"(?i), oil and egg until", ", oil and flax egg until", s)
    s = re.sub(r"(?i)honey, eggs and salt", "honey, flax eggs and salt", s)
    s = re.sub(r"(?i)milk, egg and juice", "milk, flax egg and juice", s)
    s = re.sub(r"(?i)peanut butter, coconut oil and eggs", "peanut butter, coconut oil and flax eggs", s)
    s = re.sub(r"(?i)flaxseed egg", "flax egg", s)
    s = re.sub(r"(?i)parmesan or a plant-based alternative|parmesan or plant-based alternative", "vegetarian hard cheese or nutritional yeast", s)
    s = re.sub(r"(?i)plant[- ]based parmesan", "vegetarian hard cheese", s)
    s = re.sub(r"(?i)\bparmesan\b", "vegetarian hard cheese", s)
    s = re.sub(r"(?i)plant-based vegetarian hard cheese", "vegetarian hard cheese", s)
    s = re.sub(r"(?i)\b2 bulbs\b|\bthe bulbs\b|\broasted garlic bulbs?\b|\bgarlic bulbs?\b", "extra cherry tomatoes", s)
    s = re.sub(r"(?i)\bmeatballs?\b", "kofta", s)
    s = re.sub(r"(?i)to make the kofta", "To make the kofta", s)
    s = re.sub(r"(?i)\bthe the\b", "the", s)
    s = re.sub(r"(?i)the aubergine are", "the aubergine is", s)
    s = re.sub(r"(?i)flat cap aubergine", "sliced aubergine", s)
    s = re.sub(r"(?i)closed cup aubergine", "diced aubergine", s)

    # allium clauses — replace with hing / fennel / ginger, never leave the vegetable
    s = re.sub(r"(?i)finely chopped red onion", "a pinch of hing", s)
    s = re.sub(r"(?i)chop(?:ped)? the shallots?,?\s*", "", s)
    s = re.sub(r"(?i)finely chop(?:ped)? the garlic and chilli", "finely chop the chilli", s)
    s = re.sub(r"(?i)finely chop(?:ped)? the garlic(?: cloves?)?", "grate a little ginger", s)
    s = re.sub(r"(?i)\d+ garlic cloves? finely chopped", "a pinch of hing", s)
    s = re.sub(r"(?i)garlic cloves? finely chopped", "a pinch of hing", s)
    s = re.sub(r"(?i)chop the shallots, add to the pan and", "add to the pan and", s)
    s = re.sub(
        r"(?i)fry the shallots, mushrooms, garlic and thyme",
        "fry the aubergine, walnuts and thyme with a pinch of hing",
        s,
    )
    s = re.sub(r"(?i)slow[- ]roasted leeks?", "slow-roasted fennel", s)
    s = re.sub(r"(?i)\bleeks?\b", "fennel", s)
    s = re.sub(r"(?i)\bshallots?\b", "fennel or celery", s)
    s = re.sub(r"(?i)spring onions?", "coriander stems", s)
    s = re.sub(r"(?i)\bchives?\b", "coriander", s)
    s = re.sub(r"(?i)red onions?|white onions?|brown onions?", "celery", s)
    s = re.sub(r"(?i)\bonions?\b", "celery", s)
    s = re.sub(r"(?i)\bgarlic clove\b|\bgarlic\b", "ginger", s)

    s = SPACE_RE.sub(" ", s)
    s = re.sub(r"\s+([,.;])", r"\1", s)
    s = re.sub(r",\s*,+", ", ", s)
    s = re.sub(r"\band and\b", "and", s)
    s = s.strip(" ,")
    if s and s[0].islower():
        s = s[0].upper() + s[1:]
    if s and s[-1] not in ".!?":
        s += "."
    return s


def infer_allergens(ingredients: list[str]) -> list[str]:
    blob = " ".join(ingredients).lower()
    found = []
    mapping = [
        ("gluten", r"\b(wheat|flour|pasta|spaghetti|penne|fusilli|bread|couscous|soy sauce|tamari)\b"),
        ("nuts", r"\b(almond|walnut|peanut|cashew|hazelnut|pistachio|pecan|pinenut|pine nut)\b"),
        ("sesame", r"\bsesame\b"),
        ("soya", r"\b(soy|soya|tamari|tempeh|tofu)\b"),
        ("dairy", r"\b(paneer|yogurt|yoghurt|ghee|butter|cheese|cream|milk)\b"),
        ("mustard", r"\bmustard\b"),
        ("sulphites", r"\b(dried apricot|sultana)\b"),
    ]
    for label, pat in mapping:
        if re.search(pat, blob) and not (
            label == "dairy" and re.search(r"plant(?:-based)? (milk|cream|cheese)|oat cream|cashew cream|coconut milk|almond milk", blob)
            and not re.search(r"\b(paneer|ghee|yogurt|yoghurt)\b", blob)
        ):
            found.append(label)
    # plant milks shouldn't flag dairy
    if "dairy" in found and not re.search(r"\b(paneer|ghee|yogurt|yoghurt|butter|cheese|feta)\b", blob):
        found = [x for x in found if x != "dairy"]
    return found


def folder_for(courses: list[str], title: str) -> str:
    if re.search(r"(?i)dog treat", title):
        return "09-other"
    if re.search(r"(?i)\b(shake|hot chocolate)\b", title):
        return "08-drinks"
    if re.search(r"(?i)\bsalad\b", title):
        return "04-salads"
    if re.search(r"(?i)\bsoup\b", title):
        return "03-soups"
    if re.search(r"(?i)porridge|granola|waffle|bread rolls|buckwheat bread", title):
        return "01-breakfast"
    if SWEET_RE.search(title) and not re.search(r"(?i)dog treat", title):
        return "07-desserts"
    keys = {c.lower() for c in courses}
    order = [
        ("drinks", "08-drinks"),
        ("breakfast", "01-breakfast"),
        ("lunch", "05-mains"),
        ("main course", "05-mains"),
        ("dinner", "05-mains"),
        ("appetizer", "02-starters-snacks"),
        ("snack", "02-starters-snacks"),
        ("side dish", "06-sides"),
        ("soup", "03-soups"),
        ("salad", "04-salads"),
        ("dessert", "07-desserts"),
    ]
    for key, folder in order:
        if key in keys:
            return folder
    if SWEET_RE.search(title):
        return "07-desserts"
    return "05-mains"


def make_summary(title: str, ingredients: list[str], style: str) -> str:
    names = []
    seen: set[str] = set()
    for line in ingredients:
        token = re.sub(r"^[\d¼½¾/.\s]+", "", line)
        token = re.sub(r"^(g|kg|ml|l|tsp|tbsp|teaspoon|tablespoon|cup|pinch)s?\b", "", token, flags=re.I)
        token = token.strip(" ,")
        low = token.lower()
        if not token:
            continue
        if low.startswith("hing") or "asafoetida" in low:
            continue
        if low in {"salt", "pepper", "water", "natural fine sea salt", "organic cracked black pepper"}:
            continue
        key = token.split(",")[0].strip().lower()
        if key in seen:
            continue
        seen.add(key)
        names.append(token.split(",")[0].strip())
        if len(names) >= 3:
            break
    trio = ", ".join(names[:3]) if names else "fresh vegetables and whole spices"
    if style == "sweet":
        return (
            f"{title} is an egg-free vegetarian sweet for a Vedanta kitchen — "
            f"built around {trio}. Offer it fresh, without onion, garlic or eggs."
        )
    if style == "salad":
        return (
            f"{title} is a sattvic salad of {trio}. "
            f"Alliums are left out; lemon, ginger and roasted cumin carry the dressing."
        )
    return (
        f"{title} is a sattvic vegetarian dish of {trio}. "
        f"No onion or garlic — hing bloomed in hot oil gives the savoury depth. "
        f"Cook fresh and serve as prasad-style kitchen food."
    )


def inject_hing(ingredients: list[str], steps: list[str], style: str, ctx: dict) -> tuple[list[str], list[str]]:
    if not ctx.get("removed_allium"):
        return ingredients, steps
    if style == "hot":
        if not any(re.search(r"(?i)\bhing\b|asafoetida", x) for x in ingredients):
            ingredients.insert(0, "¼ tsp hing (asafoetida)")
        bloom = "Warm a little ghee or olive oil and bloom the hing for a few seconds until fragrant, then continue."
        if not any(re.search(r"(?i)bloom the hing|pinch of hing|asafoetida", s) for s in steps):
            # insert after first heat/oil step if possible
            inserted = False
            for i, step in enumerate(steps):
                if re.search(r"(?i)\b(heat|warm|fry|oil|pan|casserole)\b", step):
                    steps.insert(i + 1, bloom)
                    inserted = True
                    break
            if not inserted:
                steps.insert(0, bloom)
    elif style == "salad":
        extra = "½ tsp roasted cumin powder"
        extra2 = "½ tsp fresh ginger, grated"
        if extra not in ingredients:
            ingredients.append(extra)
        if extra2 not in ingredients:
            ingredients.append(extra2)
    return ingredients, steps


def laksa_fix(source_title: str, ingredients: list[str]) -> list[str]:
    if source_title != "Coconut Laksa Recipe":
        return ingredients
    have = " ".join(ingredients).lower()
    extras = []
    for amount, unit, name in LAKSA_EXTRA:
        if name.split(",")[0].split()[0].lower() not in have:
            extras.append(format_ing(amount, unit, name))
    return ingredients + extras


def adapt_recipe(item: dict, used_slugs: set[str]) -> dict:
    rec = item.get("recipe") or {}
    source_title = strip_html(rec.get("name") or item.get("title") or "Untitled")
    title = adapt_title(source_title)
    link = item.get("link") or ""
    if "roasted-vegetable-salad-recipe-2" in link:
        title = "Roasted Carrot and Parsnip Salad with Tahini"
    elif link.rstrip("/").endswith("roasted-vegetable-salad-recipe"):
        title = "Roasted Root Salad with Lemon-Tahini"
    courses = tag_names(rec, "course") or ["Main Course"]
    cuisines = tag_names(rec, "cuisine")
    diets = ["Vegetarian", "Sattvic", "No onion", "No garlic", "Egg-free"]
    source_diets = [d for d in tag_names(rec, "diet") if d.lower() in {"vegan", "dairy free", "naturally gluten free"}]
    diets.extend(source_diets)

    style = classify_style(source_title + " " + title, courses)
    ctx: dict = {}

    ingredient_lines: list[str] = []
    grouped: list[dict] = []
    for gname, rows in parse_groups(rec):
        kept = []
        for row in rows:
            if is_header_ingredient(row["name"]):
                if re.search(r"(?i)meatball", row["name"]):
                    ctx["group_hint"] = "kofta"
                continue
            swapped = swap_name(row["name"], row["notes"], ctx)
            if swapped is None:
                continue
            if is_header_ingredient(swapped[0]):
                continue
            name, notes = swapped
            # eggs counted from amount
            if re.search(r"(?i)^(large |medium |organic )?eggs?$", row["name"].strip()):
                n = row["amount"] or "1"
                line = f"{n} flax egg{'s' if n not in {'1', '1.0'} else ''} (1 tbsp ground flax + 3 tbsp water per egg)"
                ctx["removed_egg"] = True
            else:
                line = format_ing(row["amount"], row["unit"], name, notes)
            if line:
                kept.append(line)
                ingredient_lines.append(line)
        if kept:
            grouped.append({"name": gname, "items": kept})

    if not grouped:
        grouped = [{"name": "", "items": ingredient_lines}]

    steps = [rewrite_step(s, style) for s in parse_steps(rec, source_title)]
    steps = [s for s in steps if len(s) > 3]
    steps = [s for s in steps if not re.match(r"(?i)^for the .+\.?$", s) or len(s) > 40]

    ingredient_lines = laksa_fix(source_title, ingredient_lines)
    if source_title == "Coconut Laksa Recipe":
        grouped = [{"name": "", "items": ingredient_lines}]

    ingredient_lines, steps = inject_hing(ingredient_lines, steps, style, ctx)
    # keep grouped in sync if hing added at front
    if grouped and ingredient_lines and ingredient_lines[0] not in grouped[0]["items"]:
        if ingredient_lines[0].startswith("¼ tsp hing"):
            grouped[0]["items"].insert(0, ingredient_lines[0])
    for extra in ("½ tsp roasted cumin powder", "½ tsp fresh ginger, grated"):
        if extra in ingredient_lines and grouped and extra not in grouped[-1]["items"]:
            grouped[-1]["items"].append(extra)

    # mushroom leftover in title already mapped; add walnuts if mushroom was removed
    if ctx.get("removed_mushroom") and not any(re.search(r"(?i)aubergine|sun-dried", x) for x in ingredient_lines):
        ingredient_lines.append("400 g aubergine, diced")
        grouped[-1]["items"].append("400 g aubergine, diced")
    if "walnut" in title.lower() and not any(re.search(r"(?i)\bwalnuts?\b", x) for x in ingredient_lines):
        ingredient_lines.append("80 g walnuts, finely chopped")
        grouped[-1]["items"].append("80 g walnuts, finely chopped")

    slug = slugify(title)
    if slug in used_slugs:
        slug = slugify(title + "-" + str(rec.get("id") or item.get("id")))
    used_slugs.add(slug)

    notes = [
        "Vedanta kitchen: vegetarian, no onion, no garlic, no eggs, no mushrooms, no alcohol.",
        "Use stainless steel, cast iron, glass or clay — never aluminium.",
    ]
    if ctx.get("removed_allium") and style == "hot":
        notes.append("Hing is bloomed in hot ghee or oil; a pinch is enough.")
    if ctx.get("removed_mushroom"):
        notes.append("Aubergine, walnuts and sun-dried tomato stand in for mushrooms.")
    if ctx.get("removed_egg"):
        notes.append("Each egg is replaced with a flax egg.")
    if style == "salad" and ctx.get("removed_allium"):
        notes.append("Cold dressings use lemon, ginger and roasted cumin instead of garlic.")

    servings = strip_html(str(rec.get("servings") or ""))
    servings_unit = strip_html(str(rec.get("servings_unit") or ""))
    yield_txt = " ".join(p for p in (servings, servings_unit) if p)

    adapted = {
        "id": slug,
        "title": title,
        "source_title": source_title,
        "source_url": item.get("link") or "",
        "course": courses,
        "cuisine": cuisines,
        "diet": diets,
        "style": style,
        "prep_minutes": strip_html(str(rec.get("prep_time") or "")) or None,
        "cook_minutes": strip_html(str(rec.get("cook_time") or "")) or None,
        "total_minutes": strip_html(str(rec.get("total_time") or "")) or None,
        "yield": yield_txt or None,
        "summary": make_summary(title, ingredient_lines, style),
        "ingredients": ingredient_lines,
        "ingredient_groups": grouped,
        "method": steps,
        "vedanta_notes": notes,
        "allergens": infer_allergens(ingredient_lines),
        "folder": folder_for(courses, title),
    }
    return adapted


def render_txt(recipes: list[dict]) -> str:
    lines = [
        "VEDANTA WHOLEFOOD RECIPE COLLECTION",
        f"{len(recipes)} sattvic vegetarian recipes",
        "",
        "Rewritten for a Vedanta kitchen ethos:",
        "vegetarian · no onion · no garlic · no eggs · no mushrooms · no alcohol",
        "Hing (asafoetida) in hot oil for cooked savoury dishes.",
        "Lemon, ginger and roasted cumin for cold dressings.",
        "Stainless steel / baking paper — never aluminium.",
        "Egg-free; flax eggs in bakes. Dairy may be used as paneer, yogurt or ghee,",
        "or swapped for plant cream where the dish is already vegan.",
        "",
        "Inspired by publicly listed wholefood plant dishes; methods and wording",
        "are original kitchen adaptations, not copied marketing copy.",
        "",
    ]
    for r in recipes:
        lines += [SEP, r["title"], SEP, ""]
        lines.append(r["summary"])
        lines.append("")
        meta = []
        if r.get("course"):
            meta.append("Course: " + ", ".join(r["course"]))
        if r.get("prep_minutes"):
            meta.append(f"Prep: {r['prep_minutes']} min")
        if r.get("cook_minutes"):
            meta.append(f"Cook: {r['cook_minutes']} min")
        if r.get("yield"):
            meta.append(f"Yield: {r['yield']}")
        meta.append("Diet: vegetarian, sattvic, no onion/garlic, egg-free")
        lines.append("  ".join(meta))
        lines.append("")
        lines.append("Ingredients")
        current_group = None
        for group in r["ingredient_groups"]:
            if group["name"] and group["name"] != current_group:
                lines.append(f"{group['name']}")
                current_group = group["name"]
            for item in group["items"]:
                lines.append(f"• {item}")
        lines.append("")
        lines.append("Method")
        for i, step in enumerate(r["method"], 1):
            lines.append(f"{i}. {step}")
        lines.append("")
        lines.append("Kitchen notes")
        for n in r["vedanta_notes"]:
            lines.append(f"— {n}")
        if r.get("allergens"):
            lines.append("Allergens (kitchen estimate): " + ", ".join(r["allergens"]))
        lines += ["", ""]
    return "\n".join(lines).rstrip() + "\n"


def render_md(r: dict) -> str:
    parts = [
        f"# {r['title']}",
        "",
        r["summary"],
        "",
        f"- **Diet:** vegetarian, sattvic, no onion, no garlic, egg-free",
        f"- **Course:** {', '.join(r['course'])}",
    ]
    if r.get("cuisine"):
        parts.append(f"- **Cuisine:** {', '.join(r['cuisine'])}")
    if r.get("prep_minutes"):
        parts.append(f"- **Prep:** {r['prep_minutes']} min")
    if r.get("cook_minutes"):
        parts.append(f"- **Cook:** {r['cook_minutes']} min")
    if r.get("yield"):
        parts.append(f"- **Yield:** {r['yield']}")
    if r.get("allergens"):
        parts.append(f"- **Allergens (estimate):** {', '.join(r['allergens'])}")
    parts += ["", "## Ingredients", ""]
    for group in r["ingredient_groups"]:
        if group["name"]:
            parts.append(f"### {group['name']}")
            parts.append("")
        for item in group["items"]:
            parts.append(f"- {item}")
        parts.append("")
    parts += ["## Method", ""]
    for i, step in enumerate(r["method"], 1):
        parts.append(f"{i}. {step}")
    parts += ["", "## Vedanta kitchen notes", ""]
    for n in r["vedanta_notes"]:
        parts.append(f"- {n}")
    parts.append("")
    return "\n".join(parts)


def render_html(recipes: list[dict]) -> str:
    cards = []
    filters = sorted({c for r in recipes for c in r["course"]})
    for r in recipes:
        ings = "".join(f"<li>{html.escape(i)}</li>" for i in r["ingredients"])
        steps = "".join(f"<li>{html.escape(s)}</li>" for s in r["method"])
        notes = "".join(f"<li>{html.escape(n)}</li>" for n in r["vedanta_notes"])
        courses = " ".join(html.escape(c.lower()) for c in r["course"])
        meta = []
        if r.get("prep_minutes"):
            meta.append(f"Prep {html.escape(str(r['prep_minutes']))} min")
        if r.get("cook_minutes"):
            meta.append(f"Cook {html.escape(str(r['cook_minutes']))} min")
        if r.get("yield"):
            meta.append(html.escape(r["yield"]))
        cards.append(
            f"""<article class="card" data-courses="{html.escape(courses)}" data-title="{html.escape(r['title'].lower())}" id="{html.escape(r['id'])}">
  <h2>{html.escape(r['title'])}</h2>
  <p class="meta">{html.escape(' · '.join(r['course']))}{' · ' + ' · '.join(meta) if meta else ''}</p>
  <p class="summary">{html.escape(r['summary'])}</p>
  <h3>Ingredients</h3>
  <ul class="ings">{ings}</ul>
  <h3>Method</h3>
  <ol class="steps">{steps}</ol>
  <h3>Kitchen notes</h3>
  <ul class="notes">{notes}</ul>
</article>"""
        )
    chips = "".join(
        f'<button type="button" class="chip" data-course="{html.escape(c.lower())}">{html.escape(c)}</button>'
        for c in filters
    )
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Vedanta Wholefood Recipes — Parslia Kitchen OS</title>
  <style>
    :root {{
      --green-deep: #063F32; --green-2: #0F6B4F; --copper: #B87333;
      --warm-white: #F7F4EA; --text: #10231D; --border: #D8CDBA; --muted: #5F6F68;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0; font-family: Inter, Poppins, Arial, sans-serif; color: var(--text);
      background: var(--warm-white); line-height: 1.55;
    }}
    header {{
      background: var(--green-deep); color: #fff; padding: 28px 20px 24px;
    }}
    header h1 {{ margin: 0 0 8px; font-size: 1.7rem; }}
    header p {{ margin: 0; max-width: 720px; color: #e4efe9; }}
    .wrap {{ max-width: 980px; margin: 0 auto; padding: 20px; }}
    .banner {{
      background: #fff; border: 1px solid var(--border); border-radius: 14px;
      padding: 16px 18px; margin: 18px 0;
    }}
    .banner strong {{ color: var(--green-2); }}
    .tools {{ display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 20px; }}
    input[type=search] {{
      flex: 1; min-width: 200px; padding: 10px 12px; border: 1px solid var(--border);
      border-radius: 10px; font-size: 1rem;
    }}
    .chip, .chip-all {{
      border: 1px solid var(--border); background: #fff; border-radius: 999px;
      padding: 6px 12px; cursor: pointer; font-size: .9rem;
    }}
    .chip.active, .chip-all.active {{ background: var(--green-deep); color: #fff; border-color: var(--green-deep); }}
    .count {{ color: var(--muted); font-size: .9rem; margin: 0 0 16px; }}
    .card {{
      background: #fff; border: 1px solid var(--border); border-radius: 16px;
      padding: 22px 24px; margin: 0 0 18px;
    }}
    .card h2 {{ margin: 0 0 6px; color: var(--green-deep); font-size: 1.25rem; }}
    .meta {{ color: var(--muted); font-size: .88rem; margin: 0 0 10px; }}
    .card h3 {{ margin: 16px 0 8px; font-size: 1rem; color: var(--green-2); }}
    ul, ol {{ margin: 0; padding-left: 1.2rem; }}
    li {{ margin: 0 0 4px; }}
    .hidden {{ display: none; }}
    footer {{ color: var(--muted); font-size: .85rem; padding: 12px 0 40px; }}
  </style>
</head>
<body>
  <header>
    <div class="wrap">
      <h1>Vedanta Wholefood Recipes</h1>
      <p>{len(recipes)} sattvic vegetarian recipes for Parslia kitchens — no onion, no garlic, no eggs, no mushrooms, no alcohol.</p>
    </div>
  </header>
  <div class="wrap">
    <div class="banner">
      <strong>Kitchen ethos.</strong> Vegetarian and egg-free. Hing bloomed in hot oil stands in for onion and garlic.
      Lemon, ginger and roasted cumin season cold dressings. Cookware is steel, iron, glass or clay — never aluminium.
      Hing in compounded form may contain wheat; check the label for gluten-free service.
    </div>
    <div class="tools">
      <input type="search" id="q" placeholder="Search recipes" />
      <button type="button" class="chip-all active" data-course="all">All</button>
      {chips}
    </div>
    <p class="count" id="count"></p>
    {''.join(cards)}
    <footer>Parslia Kitchen OS · Vedanta ethos collection · methods rewritten for ashram and vegetarian professional kitchens.</footer>
  </div>
  <script>
    const cards = [...document.querySelectorAll('.card')];
    const q = document.getElementById('q');
    const count = document.getElementById('count');
    let course = 'all';
    function apply() {{
      const term = q.value.trim().toLowerCase();
      let n = 0;
      cards.forEach(c => {{
        const okCourse = course === 'all' || (c.dataset.courses || '').includes(course);
        const okQ = !term || (c.dataset.title || '').includes(term) || c.textContent.toLowerCase().includes(term);
        const show = okCourse && okQ;
        c.classList.toggle('hidden', !show);
        if (show) n++;
      }});
      count.textContent = n + ' recipe' + (n === 1 ? '' : 's') + ' shown';
    }}
    q.addEventListener('input', apply);
    document.querySelectorAll('.chip, .chip-all').forEach(btn => {{
      btn.addEventListener('click', () => {{
        document.querySelectorAll('.chip, .chip-all').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        course = btn.dataset.course;
        apply();
      }});
    }});
    apply();
  </script>
</body>
</html>
"""


def write_csv(recipes: list[dict], path: Path) -> None:
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(
            [
                "title",
                "course",
                "diet",
                "prep_minutes",
                "cook_minutes",
                "yield",
                "ingredients",
                "method",
                "allergens",
                "vedanta_notes",
            ]
        )
        for r in recipes:
            w.writerow(
                [
                    r["title"],
                    "; ".join(r["course"]),
                    "; ".join(r["diet"]),
                    r.get("prep_minutes") or "",
                    r.get("cook_minutes") or "",
                    r.get("yield") or "",
                    " | ".join(r["ingredients"]),
                    " | ".join(r["method"]),
                    "; ".join(r.get("allergens") or []),
                    " | ".join(r["vedanta_notes"]),
                ]
            )


def scan_forbidden(recipes: list[dict]) -> list[str]:
    problems = []
    for r in recipes:
        blob = "\n".join(r["ingredients"] + r["method"])
        blob = re.sub(
            r"(?i)(without onion|no onion|onion/garlic|egg-free|flax eggs?|"
            r"per egg|each egg is replaced|stand in for mushrooms)",
            "",
            blob,
        )
        for m in STRAY_ALLIUM.finditer(blob):
            problems.append(f"{r['title']}: stray '{m.group(0)}' in ingredients/method")
        if re.search(r"(?i)\b(meatballs?|parmesan|fish sauce|kimchi|gochujang)\b", blob):
            problems.append(f"{r['title']}: leftover non-sattvic term")
        if not r["ingredients"] or len(r["ingredients"]) < 3:
            problems.append(f"{r['title']}: too few ingredients")
        if not r["method"] or len(r["method"]) < 3:
            problems.append(f"{r['title']}: too few method steps")
        if re.search(r"(?i)forest whole foods|biona", blob):
            problems.append(f"{r['title']}: leftover branding")
    return problems


def write_readme(recipes: list[dict]) -> str:
    by_folder: dict[str, list[str]] = {}
    for r in recipes:
        by_folder.setdefault(r["folder"], []).append(r["title"])
    lines = [
        "# Vedanta wholefood recipes",
        "",
        f"{len(recipes)} sattvic vegetarian recipes rewritten for Parslia / Vedanta kitchens.",
        "",
        "Source list: publicly published wholefood plant recipes on forestwholefoods.co.uk.",
        "Titles, ingredients and methods are **original kitchen adaptations**, not copied page copy.",
        "",
        "## Diet rules",
        "",
        "- Vegetarian (no meat, fish, eggs)",
        "- **No onion, garlic, shallot, leek, chive, spring onion**",
        "- **No mushrooms** (aubergine, walnut and sun-dried tomato for umami)",
        "- **No alcohol** (lemon juice instead of wine vinegar)",
        "- Hing (asafoetida) bloomed in hot ghee or oil for cooked savoury dishes",
        "- Cold dressings: lemon, ginger, roasted cumin",
        "- Dairy may appear as paneer, yogurt or ghee; vegan options stay plant-based",
        "- **No aluminium** cookware or foil",
        "",
        "Compounded hing may contain wheat. Check the label for gluten-free service.",
        "",
        "## Files",
        "",
        "| File | What it is |",
        "|------|------------|",
        "| `index.html` | Searchable recipe library |",
        "| `vedanta-wholefoods-recipes.txt` | Plain-text collection |",
        "| `vedanta-wholefoods-recipes.json` | Structured data |",
        "| `vedanta-wholefoods-recipes.csv` | Spreadsheet |",
        "| `01-…` folders | One Markdown file per recipe |",
        "",
        "Regenerate with `python3 scripts/build_vedanta_wholefoods_recipes.py`.",
        "",
        "## Counts",
        "",
    ]
    courses = Counter(c for r in recipes for c in r["course"])
    for c, n in sorted(courses.items(), key=lambda x: (-x[1], x[0])):
        lines.append(f"- {c}: {n}")
    lines += ["", "## Recipe index", ""]
    for folder in sorted(by_folder):
        lines.append(f"### {folder}")
        lines.append("")
        for title in by_folder[folder]:
            lines.append(f"- {title}")
        lines.append("")
    return "\n".join(lines)


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    raw = fetch_raw()
    print(f"Loaded {len(raw)} source recipe cards", flush=True)

    used: set[str] = set()
    recipes = [adapt_recipe(item, used) for item in raw]
    recipes.sort(key=lambda r: r["title"].lower())

    problems = scan_forbidden(recipes)
    if problems:
        print("FORBIDDEN / STRUCTURE ISSUES:", file=sys.stderr)
        for p in problems:
            print(" -", p, file=sys.stderr)
        if any("stray" in p or "branding" in p or "too few" in p for p in problems):
            # still write so we can inspect, but fail
            pass

    # clean previous markdown folders
    for child in OUT_DIR.iterdir():
        if child.is_dir() and child.name[0:2].isdigit():
            for f in child.glob("*.md"):
                f.unlink()

    (OUT_DIR / "vedanta-wholefoods-recipes.json").write_text(
        json.dumps(
            {
                "collection": "Vedanta wholefood recipes",
                "ethos": [
                    "vegetarian",
                    "sattvic",
                    "no onion",
                    "no garlic",
                    "egg-free",
                    "no mushrooms",
                    "no alcohol",
                    "no aluminium",
                ],
                "count": len(recipes),
                "recipes": recipes,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    txt = render_txt(recipes)
    (OUT_DIR / "vedanta-wholefoods-recipes.txt").write_text(txt, encoding="utf-8")
    (ROOT / "vedanta-wholefoods-recipes.txt").write_text(txt, encoding="utf-8")
    (OUT_DIR / "index.html").write_text(render_html(recipes), encoding="utf-8")
    write_csv(recipes, OUT_DIR / "vedanta-wholefoods-recipes.csv")
    (OUT_DIR / "README.md").write_text(write_readme(recipes), encoding="utf-8")
    (OUT_DIR / "COOKWARE-AND-DIET-RULES.md").write_text(
        """# Vedanta diet and cookware rules

Every recipe in this collection follows the same kitchen rules.

## Diet

- Vegetarian (no meat, fish, eggs)
- **No onion, garlic, shallot, leek, chive, spring onion**
- No onion powder or garlic powder
- **No mushrooms** (tamasic in a Vedanta kitchen)
- No alcohol, wine vinegar, fish sauce, kimchi or gochujang
- Ginger, hing (asafoetida), tomato, coconut, yogurt, paneer and whole spices are allowed
- Hing in hot ghee or oil is the stand-in for onion and garlic — use a **pinch** only
- Cold food: lemon, ginger and roasted cumin, not raw hing

## Cookware — no aluminium

Acidic food (tomato, tamarind, lemon, yogurt) reacts with aluminium.

**Use**
- Stainless steel pots, kadhai, steamers and trays
- Cast-iron tawa
- Glass, ceramic or enamel for baking
- Baking paper, never aluminium foil

**Do not use**
- Aluminium pots, trays or foil

## Flavour map

| Need | Use |
|------|-----|
| Savoury depth | Pinch of hing in hot fat |
| Fresh heat | Ginger + green chilli |
| Body in gravy | Tomato + cashew paste |
| Umami (no mushroom) | Walnut, aubergine, sun-dried tomato, tamari |
| Tang | Lemon, amchur, tamarind, yogurt |
| Sweet bakes | Flax egg (1 tbsp flax + 3 tbsp water) |
""",
        encoding="utf-8",
    )

    for r in recipes:
        folder = OUT_DIR / r["folder"]
        folder.mkdir(parents=True, exist_ok=True)
        (folder / f"{r['id']}.md").write_text(render_md(r), encoding="utf-8")

    print(f"Wrote {len(recipes)} recipes to {OUT_DIR}")
    if problems:
        print(f"{len(problems)} check issue(s)")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
