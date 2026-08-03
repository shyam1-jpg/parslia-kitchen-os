#!/usr/bin/env python3
"""Repair corrupted vegetarian recipe ingredients and add missing dishes.

Rebuilds vegetarian-recipes.txt from the original scraped part files (better
fraction/range data), then:
  - rejoins broken fraction/range fragments
  - splits glued ingredient lines into separate bullets
  - restores ingredients named in the method but missing from the list
  - strips brand names
  - adds a complete Pesto Khandvi recipe (was missing / incomplete)
"""

from __future__ import annotations

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARTS_DIR = ROOT / "data" / "vegetarian-recipe-parts"
OUT_PATH = ROOT / "vegetarian-recipes.txt"
FALLBACK_PARTS_DIR = Path("/tmp/recipe-parts")

BRAND_PATTERNS = [
    r"This is a Sanjeev Kapoor exclusive recipe\.?",
    r"This recipe is from FoodFood TV channel\.?",
    r"Sanjeev Kapoor exclusive recipe\.?",
    r"#ProVFoods\s*",
    r"@ProVFoods\s*",
    r"#Prov\b",
    r"#ProV\b",
]

PROV_REPLACEMENTS = [
    (r"ProV Fusion Omega Boost Trail Mix", "trail mix"),
    (r"ProV['\u2019]s Omega Boost Trail Mix", "trail mix"),
    (r"ProV Omega Boost Trail Mix", "trail mix"),
    (r"ProV Healthy Seed Mix", "mixed seeds"),
    (r"Pro V Healthy Seed Mix", "mixed seeds"),
    (r"Pro V Regal Jumbo Cranberries", "dried cranberries"),
    (r"Pro V Lite Activated Pecan Nuts", "pecans"),
    (r"Pro V Select Fard Whole Natural Dates", "dates"),
    (r"ProV Select Fard Whole Natural Dates", "dates"),
    (r"Pro V Select Figs \(anjeer\)", "dried figs"),
    (r"Pro V Zahidi Whole Natural Dates \(khajur\)", "dates"),
    (r"Pro V Select Whole Natural Cashew", "cashews"),
    (r"ProV Select Whole Natural Cashew", "cashews"),
    (r"Pro V Select California Roasted and Salted Pistachios", "roasted salted pistachios"),
    (r"ProV Select California Roasted and Salted Pistachios", "roasted salted pistachios"),
    (r"Select California Roasted and Salted Pistachios", "roasted salted pistachios"),
    (r"Pro V Cranberries", "dried cranberries"),
    (r"Pro V Regal Walnuts", "walnuts"),
    (r"Pro V Premium Chia Seeds", "chia seeds"),
    (r"Pro V Regal Jumbo Pistachios", "pistachios"),
    (r"Pro V Lite Activated Pecan Nuts", "pecans"),
    (r"Pro V\s+", ""),
    (r"ProV\s+", ""),
]

# Quantity start used to split glued ingredient lines
QTY_START = (
    r"(?:"
    r"\d+\s*-\s*\d+\s+"
    r"|\d+/\d+\s+"
    r"|[½¼¾⅓⅔⅛⅜⅝⅞]\s*"
    r"|\d+[½¼¾⅓⅔]?\s+"
    r"|Few\s+"
    r"|A\s+pinch\s+"
    r"|Salt\s+to\s+taste"
    r"|Oil\s+for\b"
    r"|Butter\s+for\b"
    r"|Water\s+as\b"
    r")"
)

# Method mentions that should appear in ingredients if missing
METHOD_INGREDIENT_HINTS = [
    (r"\basafoetida\b|\bhing\b", "a pinch of asafoetida (hing)"),
    (r"\bsalt\b", "salt to taste"),
    (r"\bginger[- ]green chilli paste\b", "1/2 teaspoon ginger-green chilli paste"),
    (r"\bgreen chilli[- ]ginger paste\b", "1 teaspoon green chilli-ginger paste"),
    (r"\bmustard seeds\b", "1 teaspoon mustard seeds"),
    (r"\bcurry leaves\b", "1 sprig curry leaves"),
    (r"\bfresh coconut\b|\bgrated coconut\b", "fresh coconut, scraped, for garnish"),
    (r"\bcoriander leaves\b", "fresh coriander leaves, chopped, for garnish"),
]

# Manual full overrides for recipes that are too broken to auto-repair
MANUAL_INGREDIENTS: dict[str, list[str]] = {
    "Cashew Pesto Pasta": [
        "10-15 cashews",
        "1½ cups fresh basil leaves",
        "8-10 black peppercorns",
        "10-15 garlic cloves (divided: some for pesto, some chopped for sauté)",
        "1½ tablespoons parmesan cheese powder, plus grated parmesan to sprinkle",
        "½ cup + 2 tablespoons extra virgin olive oil",
        "1 tablespoon chopped garlic",
        "4-5 button mushrooms, quartered",
        "¼ cup boiled corn kernels",
        "5-6 cherry tomatoes, halved",
        "2 cups boiled penne pasta",
        "salt to taste",
        "fresh basil sprig, for garnish",
    ],
    "Pink Khandvi": [
        "1/4 cup beetroot puree",
        "1 cup gram flour (besan)",
        "1 tablespoon refined flour (maida)",
        "1/2 teaspoon turmeric powder",
        "1/2 teaspoon red chilli powder",
        "1/2 teaspoon ginger-green chilli paste",
        "salt to taste",
        "3 cups buttermilk",
        "oil, for greasing",
        "fresh coconut, scraped, for garnish",
        "fresh coriander leaves, chopped, for garnish",
        "Tempering: 2 tablespoons oil",
        "1 teaspoon mustard seeds",
        "a pinch of asafoetida (hing)",
        "1 sprig curry leaves",
    ],
    "Pista Chickpea Hummus": [
        "2 cups pistachios",
        "1½ cups boiled chickpeas",
        "3-4 garlic cloves",
        "a handful of fresh parsley",
        "salt to taste",
        "crushed black peppercorns to taste",
        "extra virgin olive oil, as required",
        "pickled carrot, cucumber and onion slices, to serve",
        "black olives, to serve",
        "cherry tomatoes, quartered, to serve",
        "toasted sourdough bread slices, to serve",
    ],
    "Pista Pesto Crostini": [
        "½ cup roasted salted pistachios, shelled",
        "4 toasted sourdough bread slices",
        "1½ cups fresh basil leaves",
        "3-4 garlic cloves",
        "¼ cup extra virgin olive oil",
        "2 tablespoons grated parmesan cheese",
        "halved cherry tomatoes, as required",
        "halved yellow baby tomatoes, as required",
        "halved bocconcini roundels, as required",
        "fresh basil sprigs, for garnish",
    ],
    "Sundried Tomato Walnut Pesto": [
        "15-20 sundried tomatoes, soaked and drained",
        "8-10 walnuts",
        "5 garlic cloves",
        "2 tablespoons parmesan cheese powder",
        "¼ cup extra virgin olive oil",
        "salt to taste",
        "toasted bread slices, to serve",
        "quartered yellow baby tomatoes, as required",
        "mozzarella cheese, cut into small pieces, as required",
        "black olive slices, as required",
        "fresh basil leaves, as required",
    ],
    "Almond Phirni": [
        "3 cups almond milk",
        "4 tablespoons rice, soaked for 30 minutes and drained",
        "a large pinch of saffron, plus extra to garnish",
        "1/2 teaspoon green cardamom powder",
        "3/4 cup jaggery, chopped",
        "1/2 tablespoon rose water",
        "blanched pistachios, slivered, to garnish",
    ],
    "Avocado Toast": [
        "2 avocados",
        "½ sourdough bread loaf",
        "4 tablespoons butter",
        "cream cheese, for spreading",
        "crushed black peppercorns to taste",
        "salt to taste",
        "pickled onion rings, for garnish",
        "4 tablespoons mixed seeds",
        "micro greens, for garnish",
        "extra virgin olive oil, for drizzling",
    ],
    "Gatte ki Sabzi": [
        "1 cup gram flour (besan)",
        "1/4 teaspoon turmeric powder",
        "1/2 teaspoon red chilli powder",
        "1/2 teaspoon coriander powder",
        "a pinch of asafoetida (hing)",
        "salt to taste",
        "2 tablespoons oil, plus more for cooking",
        "1/2 cup yogurt, whisked",
        "1 teaspoon cumin seeds",
        "1/2 teaspoon garam masala powder",
        "fresh coriander leaves, chopped, for garnish",
    ],
    "Aloo Masala Cheese Toast": [
        "4 white bread slices",
        "leftover aloo sabzi, as required",
        "2-3 tablespoons mayonnaise",
        "1½ tablespoons tomato ketchup",
        "2 teaspoons chopped fresh parsley, plus extra to sprinkle",
        "mixed grated cheese, to sprinkle",
        "black sesame seeds, to sprinkle",
    ],
    "Anjeer aur Khajur Milkshake": [
        "10-15 dates (khajur), deseeded",
        "8-10 dried figs (anjeer), deseeded",
        "2 cups milk",
        "2-3 tablespoons honey",
        "trail mix or mixed seeds/nuts, to sprinkle",
        "water, for soaking",
    ],
    "Baked Chocolate Apple": [
        "4 medium red apples",
        "sea salt, for rubbing",
        "2-3 tablespoons desiccated coconut",
        "1/4 cup mixed nuts, chopped",
        "2-3 tablespoons jaggery",
        "1/4 teaspoon green cardamom powder",
        "a pinch of cinnamon powder",
        "caramel bars, broken, as required",
        "rabdi, for drizzling",
        "chocolate chips, to sprinkle",
    ],
    "Chocolate and Cheese Sandwich": [
        "8 white bread slices",
        "butter, as required",
        "grated cheese, as required",
        "chocolate syrup, for drizzling",
        "chocolate vermicelli, for sprinkling",
        "colourful vermicelli, for sprinkling",
    ],
    "Farali Paniyaram": [
        "1 cup rajgira (amaranth) flour",
        "1 medium potato, boiled and mashed",
        "2 tablespoons chopped fresh coriander",
        "1/4 cup yogurt",
        "1 teaspoon green chilli-ginger paste",
        "rock salt (sendha namak) to taste",
        "1 tablespoon + ¼ cup ghee",
        "water, as required",
        "coconut chutney, to serve",
    ],
    "Noon Chai Kashmiri": [
        "2 teaspoons Kashmiri green tea leaves (or noon chai tea leaves)",
        "1/4 teaspoon baking soda",
        "2 cups water",
        "1½ cups milk",
        "sugar, as required",
        "½ teaspoon salt",
        "salted jeera biscuits, to serve",
    ],
    "Orange Fizz": [
        "9 oranges",
        "8 teaspoons powdered sugar",
        "ice cubes, as required",
        "mint sprigs, as required",
        "tonic water, as required",
    ],
    "Ragi Jaggery Cookies": [
        "1 cup ragi (finger millet) flour",
        "2 tablespoons cocoa powder",
        "1/2 teaspoon baking soda",
        "1/2 cup butter, softened",
        "1/2 cup jaggery powder",
        "2-3 tablespoons milk",
        "1-2 tablespoons chocolate chips",
    ],
    "Sabudana Papad": [
        "1 cup sago (sabudana)",
        "salt to taste",
        "1 teaspoon cumin seeds",
        "water, for soaking and cooking",
        "oil, to deep fry",
    ],
    "Samosa Patti": [
        "1 cup refined flour (maida), plus extra for dusting",
        "3 teaspoons oil, plus extra for applying",
        "salt to taste",
        "¼ cup water, or as needed",
    ],
    "Sweet Potato Chips": [
        "2 medium sweet potatoes, washed",
        "sendha namak (rock salt) to taste",
        "water, for soaking",
        "oil, for deep-frying",
    ],
    "Biscuit Ice Cream Chocolate Bars": [
        "1 litre vanilla ice cream bars",
        "glucose biscuits, as required",
        "1 cup dark chocolate, melted",
        "pistachios, finely chopped, for garnish",
        "vermicelli sprinkles, for garnish",
        "almonds, chopped, for garnish",
    ],
    "Gulab Jamun Tartlets": [
        "4 tartlet shells",
        "10-15 gulab jamuns",
        "fresh cream, as required",
        "caramel chocolate bars, as required",
        "10-15 walnuts, for garnish",
        "rabdi, for garnish",
        "pistachios, chopped, for garnish",
    ],
    "Kalakand Fruit Custard": [
        "leftover kalakand, as required",
        "1½ cups milk",
        "4-5 tablespoons caster sugar",
        "custard powder, as required (or ready custard)",
        "orange segments, for garnish",
        "fresh pomegranate pearls, for garnish",
        "red grapes, seeded and halved, for garnish",
        "walnuts, toasted, for garnish",
    ],
    "Strawberry Shahi Tukda": [
        "8 white bread slices",
        "ghee, to deep fry",
        "sugar syrup, as required",
        "2 teaspoons green cardamom powder",
        "1/4 cup khoya (mawa), grated",
        "fresh strawberries, for garnish",
        "rabdi, for garnish",
        "pistachios, blanched and slivered, for garnish",
    ],
}

PESTO_KHANDVI = {
    "title": "Pesto Khandvi",
    "description": (
        "Fusion Gujarati snack: soft gram-flour khandvi rolls filled with "
        "basil pesto and finished with a garlic–chilli olive oil tadka."
    ),
    "meta": (
        "Cuisine: Fusion  Course: Snacks and Starters  Prep: 15 minutes  "
        "Cook: 25-30 minutes  Serves: 4  Taste: Herby & Mild  Difficulty: Moderate"
    ),
    "ingredients": [
        "Khandvi batter:",
        "1 cup gram flour (besan)",
        "1 cup sour yogurt",
        "2 cups water",
        "1 teaspoon green chilli-ginger paste",
        "a pinch of turmeric powder",
        "1/2 teaspoon lemon juice",
        "salt to taste",
        "oil, for greasing the plates",
        "Basil pesto filling:",
        "2 cups fresh basil leaves",
        "2-3 garlic cloves",
        "1/4 cup olive oil, plus extra if needed",
        "1/4 cup toasted walnuts or pine nuts",
        "2 tablespoons grated parmesan cheese (or nutritional yeast for a vegetarian hard-cheese swap)",
        "salt and black pepper to taste",
        "Tempering:",
        "2 tablespoons olive oil",
        "2 garlic cloves, finely chopped",
        "1 teaspoon red chilli flakes",
        "6-8 fresh basil leaves, shredded",
    ],
    "method": [
        "Whisk the sour yogurt with the water until smooth.",
        "Add the gram flour a little at a time and whisk until completely lump-free.",
        "Mix in the green chilli-ginger paste, turmeric, lemon juice and salt.",
        "For the pesto, blend basil, garlic, olive oil, toasted nuts, parmesan, salt and pepper to a smooth paste; loosen with a little more oil if needed. Do not add water.",
        "Pour the khandvi batter into a wide non-stick pan and cook on low–medium heat, stirring vigorously the whole time, until thick and glossy (about 12–15 minutes).",
        "Test by spreading a teaspoon on a greased plate — it should set and roll cleanly. If it cracks, cook 1–2 minutes more.",
        "While hot, spread the batter thinly over greased thalis or the back of large plates. Leave until just cool enough to handle.",
        "Spread a thin layer of pesto over the set sheets.",
        "Cut into long strips, roll each strip tightly, and arrange on a serving plate.",
        "For the tadka, warm olive oil, sauté the chopped garlic until golden, then add chilli flakes and shredded basil until the leaves crisp.",
        "Pour the tempering over the rolls and serve at room temperature.",
    ],
}


def decode_text(text: str) -> str:
    if not text:
        return ""
    text = html.unescape(text)
    for _ in range(3):
        prev = text
        text = html.unescape(text)
        if text == prev:
            break
    return text.replace("\r\n", "\n").replace("\r", "\n").strip()


def strip_branding(text: str) -> str:
    text = decode_text(text)
    for pattern in BRAND_PATTERNS:
        text = re.sub(pattern, "", text, flags=re.I)
    for old, new in PROV_REPLACEMENTS:
        text = re.sub(old, new, text, flags=re.I)
    # Leftover brand stubs after ProV prefix removal
    text = re.sub(r"\bZahidi Whole Natural Dates\b", "dates", text, flags=re.I)
    text = re.sub(r"\bSelect Figs\b", "dried figs", text, flags=re.I)
    text = re.sub(r"\bFusion Omega Boost Trail Mix\b", "trail mix", text, flags=re.I)
    text = re.sub(r"\bHealthy Seed Mix\b", "mixed seeds", text, flags=re.I)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r'^["\']+|["\']+$', "", text)
    return text.strip(" .")


def simplify_description(desc: str) -> str:
    desc = strip_branding(desc)
    if not desc:
        return ""
    desc = re.sub(r"!\s*Give it a try.*$", ".", desc, flags=re.I)
    if len(desc) > 220:
        cut = desc[:220].rsplit(" ", 1)[0]
        return cut.rstrip(",;") + "..."
    return desc if desc.endswith(".") else desc + "."


def parse_parts(parts_dir: Path) -> list[dict]:
    recipes: list[dict] = []
    for path in sorted(parts_dir.glob("part*.txt"), key=lambda p: int(re.search(r"\d+", p.name).group())):
        text = path.read_text(encoding="utf-8", errors="replace")
        blocks = re.split(r"\n={10,}\nRECIPE \d+: ", text)
        for block in blocks[1:]:
            lines = block.splitlines()
            title = lines[0].strip()
            body = "\n".join(lines[1:])
            # drop URL line and separator
            body = re.sub(r"^=+\n", "", body)
            body = re.sub(r"^URL:.*\n", "", body, flags=re.M)

            ing_m = re.search(r"INGREDIENTS:\n(.*?)(?:\nMETHOD:\n|\Z)", body, re.S | re.I)
            method_m = re.search(r"METHOD:\n(.*)", body, re.S | re.I)
            meta_m = re.search(r"Main Ingredients:.*", body)
            if not meta_m:
                meta_m = re.search(r"Cuisine:.*", body)

            # description = text before meta/ingredients
            pre = body
            if "INGREDIENTS:" in pre:
                pre = pre.split("INGREDIENTS:")[0]
            if meta_m:
                pre = pre.split(meta_m.group(0))[0]
            desc = simplify_description(pre.strip())

            meta_line = ""
            if meta_m:
                meta_line = clean_metadata(meta_m.group(0))

            raw_ings = []
            if ing_m:
                for ln in ing_m.group(1).splitlines():
                    ln = ln.strip().lstrip("-").strip()
                    if ln:
                        raw_ings.append(ln)

            steps = []
            if method_m:
                for ln in method_m.group(1).splitlines():
                    ln = ln.strip()
                    m = re.match(r"^\d+\.\s*(.*)", ln)
                    if m and m.group(1).strip():
                        step = strip_branding(m.group(1).strip().rstrip("."))
                        if step:
                            steps.append(step)

            recipes.append(
                {
                    "title": title,
                    "description": desc,
                    "meta": meta_line,
                    "raw_ingredients": raw_ings,
                    "method": steps,
                }
            )
    return recipes


def clean_metadata(raw: str) -> str:
    raw = decode_text(raw)
    raw = re.sub(r"Main Ingredients:[^|]*\|\s*", "", raw, flags=re.I)
    # Normalize "Prep time 16-18 hours" / "Cook Time:" variants before capture
    raw = re.sub(r"Prep\s*time\s*:?\s*", "Prep Time: ", raw, flags=re.I)
    raw = re.sub(r"Cook\s*Time\s*:?\s*", "Cook Time: ", raw, flags=re.I)
    mapping = [
        (r"Cuisine:\s*([^|]+)", "Cuisine"),
        (r"Course:\s*([^|]+)", "Course"),
        (r"Prep Time:\s*([^|]+)", "Prep"),
        (r"Cook Time:\s*([^|]+)", "Cook"),
        (r"Serve(?:s)?\s*:?\s*([^|]+)", "Serves"),
        (r"Taste:\s*([^|]+)", "Taste"),
        (r"Level of [Cc]ooking\s*:?\s*([^|]+)", "Difficulty"),
    ]
    parts = []
    for pattern, label in mapping:
        m = re.search(pattern, raw)
        if m:
            val = re.sub(r"\s+", " ", m.group(1)).strip(" .")
            # trim trailing junk words stuck to values
            val = re.split(
                r"\s{2,}|Level of|Diet:|Prep Time:|Cook Time:|Taste:|Serve",
                val,
                flags=re.I,
            )[0].strip()
            val = re.sub(r"^(?:time|Time)\s+", "", val).strip()
            if val:
                parts.append(f"{label}: {val}")
    return "  ".join(parts)


def rejoin_fragments(items: list[str]) -> list[str]:
    """Rejoin broken fraction/range fragments across consecutive lines."""
    if not items:
        return []
    out: list[str] = []
    i = 0
    while i < len(items):
        cur = items[i].strip()
        # lone incomplete range like "10-" or "15-"
        if re.fullmatch(r"\d+\-", cur) and i + 1 < len(items):
            nxt = items[i + 1].strip()
            # "10-" + "5 cashews..." -> "10-15 cashews..."
            m = re.match(r"^(\d+)\s+(.*)$", nxt)
            if m:
                out.append(f"{cur}{m.group(1)} {m.group(2)}".strip())
                i += 2
                continue
            out.append(f"{cur} {nxt}".strip())
            i += 2
            continue

        # line ends with incomplete fraction "… 1/" or is just "1/"
        if re.search(r"(?:^|\s)\d+/\s*$", cur) and i + 1 < len(items):
            nxt = items[i + 1].strip()
            # "… maida 1/" + "2 teaspoon Turmeric" -> keep maida; start "1/2 teaspoon Turmeric"
            m_end = re.search(r"^(.*?)(\d+)/\s*$", cur)
            m_nxt = re.match(r"^(\d+)\s+(.*)$", nxt)
            if m_end and m_nxt:
                head = m_end.group(1).strip(" ,;")
                frac = f"{m_end.group(2)}/{m_nxt.group(1)} {m_nxt.group(2)}"
                if head:
                    out.append(head)
                # maybe more fractions glued in nxt remainder — push frac as current via recursion path
                out.append(frac.strip())
                i += 2
                continue

        # line ends with "+" waiting for next amount ("½ cup +" / "2 tablespoons")
        if cur.rstrip().endswith("+") and i + 1 < len(items):
            nxt = items[i + 1].strip()
            out.append(f"{cur.rstrip()} {nxt}".strip())
            i += 2
            continue

        # "30 minutes and drained..." orphan after lost rice soak line
        if re.match(r"^\d+\s*minutes?\s+and\s+drained", cur, re.I) and out:
            out[-1] = f"{out[-1]}, soaked for {cur}"
            i += 1
            continue

        out.append(cur)
        i += 1
    return out


def split_glued_ingredients(line: str) -> list[str]:
    """Split a line that contains several quantity-led ingredients."""
    line = strip_branding(line)
    if not line:
        return []

    # Normalize spacing around unicode fractions
    line = re.sub(r"\s+", " ", line).strip()
    # Normalize "X + for garnish" into a clearer phrase before splitting
    line = re.sub(r"\+\s*for garnish\b", ", plus extra for garnish,", line, flags=re.I)
    line = re.sub(r"\+\s*to (sprinkle|garnish|serve)\b", r", plus extra to \1,", line, flags=re.I)
    line = re.sub(r"\+\s*for (sprinkling|dusting|applying)\b", r", plus extra for \1,", line, flags=re.I)

    # First split on quantity boundaries (not at start).
    # Do not split after a trailing "+" (e.g. "1 tablespoon + 2 teaspoons ...").
    parts = re.split(rf"(?<!^)(?<!\+)\s+(?={QTY_START})", line)
    cleaned: list[str] = []
    for part in parts:
        part = part.strip(" ,;")
        if not part:
            continue
        # Split jammed seasoning / garnish tails (only at phrase starts, not mid-phrase)
        sub = re.split(
            r"\s+(?=(?:"
            r"Salt to taste|Black salt to taste|"
            r"Crushed black peppercorns to taste|"
            r"Oil (?:for|as|to)\b|Butter (?:for|as)\b|"
            r"Onion for\b|Water as\b|"
            r"Tempering\b"
            r"))",
            part,
            flags=re.I,
        )
        for s in sub:
            s = s.strip(" ,;")
            if not s or len(s) < 2:
                continue
            if re.fullmatch(r"\d+-\d+", s):
                continue
            # "Salt to taste Crushed..." — hard split after salt once
            m = re.match(r"^(Salt to taste)\s+(.+)$", s, flags=re.I)
            if m and not m.group(2).lower().startswith(("and", "or")):
                cleaned.append(m.group(1))
                rest = m.group(2).strip()
                # Keep pepper/garnish tails intact when they follow salt
                cleaned.append(rest)
                continue
            # Keep "X, plus extra for garnish, Y" readable as two items max
            m = re.match(
                r"^(.+?),\s*plus extra for garnish,\s*(.+)$",
                s,
                flags=re.I,
            )
            if m:
                cleaned.append(f"{m.group(1).strip()}, plus extra for garnish")
                cleaned.append(m.group(2).strip())
                continue
            cleaned.append(s)
    return cleaned or [line]


def normalize_item(item: str) -> str:
    item = strip_branding(item)
    item = re.sub(r"\s+", " ", item).strip(" ,;")
    item = re.sub(r"\s+,", ",", item)
    item = item.replace("Asafoetida (hig)", "asafoetida (hing)")
    item = re.sub(r"\bhigg?\b", "hing", item, flags=re.I)
    # Fix "1 sprigs" -> "1 sprig"
    item = re.sub(r"\b1 sprigs\b", "1 sprig", item, flags=re.I)
    # "to garnish X" often means X is garnish — leave readable
    if item.lower().startswith("to garnish "):
        item = item[11:].strip() + ", for garnish"
    return item


def ingredients_blob(items: list[str]) -> str:
    return " | ".join(items).lower()


def add_missing_from_method(items: list[str], method_steps: list[str]) -> list[str]:
    method = " ".join(method_steps).lower()
    blob = ingredients_blob(items)
    extras: list[str] = []
    for pattern, ingredient in METHOD_INGREDIENT_HINTS:
        if re.search(pattern, method, re.I):
            # already present?
            key = re.sub(r"[^a-z]+", " ", ingredient.lower()).strip().split()[0:3]
            probe = " ".join(key)
            if probe.split()[0] in ("a", "1", "1/2", "1/4", "2"):
                # use a distinctive token
                token = re.findall(r"[a-z]{4,}", ingredient.lower())
                token = token[0] if token else probe
            else:
                token = probe.split()[0]
            if token not in blob and ingredient.lower() not in blob:
                # avoid adding salt if "black salt" only etc. — still ok
                extras.append(ingredient)
                blob += " " + ingredient.lower()
    return items + extras


def repair_ingredients(title: str, raw_items: list[str], method: list[str]) -> list[str]:
    if title in MANUAL_INGREDIENTS:
        return MANUAL_INGREDIENTS[title][:]

    items = rejoin_fragments(raw_items)
    split: list[str] = []
    for item in items:
        split.extend(split_glued_ingredients(item))

    cleaned: list[str] = []
    seen: set[str] = set()
    for item in split:
        item = normalize_item(item)
        if not item or len(item) < 2:
            continue
        # Drop orphan pure numbers / broken stubs
        if re.fullmatch(r"\d+\-?", item):
            continue
        if re.fullmatch(r"\d+/\d*", item):
            continue
        key = item.lower()
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(item)

    cleaned = add_missing_from_method(cleaned, method)

    # Title-specific light fixes from method nouns if list is still tiny
    if len(cleaned) <= 3:
        cleaned = expand_sparse_ingredients(title, cleaned, method)
    return cleaned


def expand_sparse_ingredients(title: str, items: list[str], method: list[str]) -> list[str]:
    """Last-resort expansion when a recipe still has almost no ingredients."""
    method_text = " ".join(method)
    # Pull "Add X, Y and Z" style fragments
    found = list(items)
    blob = ingredients_blob(found)
    for m in re.finditer(
        r"(?:[Aa]dd|[Mm]ix in|[Pp]ut|[Tt]ake)\s+([a-zA-Z][a-zA-Z0-9\s,\-']{3,80}?)(?:\.|, and mix|, and whisk)",
        method_text,
    ):
        chunk = m.group(1).strip()
        # split on commas / and
        bits = re.split(r",| and ", chunk)
        for bit in bits:
            bit = bit.strip().lower()
            bit = re.sub(r"\b(some|the|remaining|prepared|sufficient)\b", "", bit).strip()
            if len(bit) < 3 or bit in blob:
                continue
            if re.search(r"\b(well|together|aside|bowl|pan|heat)\b", bit):
                continue
            found.append(bit)
            blob += " " + bit
    # Deduplicate
    out, seen = [], set()
    for x in found:
        k = x.lower()
        if k not in seen:
            seen.add(k)
            out.append(x)
    return out


def format_recipe(title: str, desc: str, meta: str, ingredients: list[str], method: list[str]) -> str:
    lines = ["─" * 50, title, "─" * 50, ""]
    if desc:
        lines += [desc, ""]
    if meta:
        lines += [meta, ""]
    lines.append("Ingredients")
    for item in ingredients:
        if item.endswith(":"):
            lines.append(item)
        else:
            lines.append(f"• {item}")
    lines.append("")
    lines.append("Method")
    for i, step in enumerate(method, 1):
        step = step.rstrip(".")
        lines.append(f"{i}. {step}.")
    lines.append("")
    lines.append("")
    return "\n".join(lines)


def main() -> None:
    parts_dir = PARTS_DIR if PARTS_DIR.exists() else FALLBACK_PARTS_DIR
    if not parts_dir.exists():
        raise SystemExit(
            f"Missing parts dir: {PARTS_DIR} (or fallback {FALLBACK_PARTS_DIR})"
        )

    recipes = parse_parts(parts_dir)
    # Deduplicate by title (keep first)
    by_title: dict[str, dict] = {}
    for r in recipes:
        by_title.setdefault(r["title"], r)
    recipes = list(by_title.values())

    # Apply repairs
    repaired = []
    for r in recipes:
        ings = repair_ingredients(r["title"], r["raw_ingredients"], r["method"])
        repaired.append(
            {
                "title": r["title"],
                "description": r["description"],
                "meta": r["meta"],
                "ingredients": ings,
                "method": r["method"],
            }
        )

    # Insert / replace Pesto Khandvi
    repaired = [r for r in repaired if r["title"].lower() != "pesto khandvi"]
    repaired.append(
        {
            "title": PESTO_KHANDVI["title"],
            "description": PESTO_KHANDVI["description"],
            "meta": PESTO_KHANDVI["meta"],
            "ingredients": PESTO_KHANDVI["ingredients"],
            "method": PESTO_KHANDVI["method"],
        }
    )

    repaired.sort(key=lambda r: r["title"].lower())

    header = [
        "VEGETARIAN RECIPE COLLECTION",
        f"{len(repaired)} recipes",
        "",
        "Plain-text recipes — no source links or chef names.",
        "Edit titles, descriptions, and steps however you like.",
        "Ingredient lists repaired for broken fractions/ranges and missing items.",
        "",
    ]

    blocks = [
        format_recipe(r["title"], r["description"], r["meta"], r["ingredients"], r["method"])
        for r in repaired
    ]
    OUT_PATH.write_text("\n".join(header) + "\n".join(blocks), encoding="utf-8")

    # Report quality
    sparse = [r["title"] for r in repaired if sum(1 for x in r["ingredients"] if not x.endswith(":")) < 4]
    print(f"Wrote {OUT_PATH} ({len(repaired)} recipes)")
    print(f"Sparse ingredient lists (<4 items): {len(sparse)}")
    for t in sparse[:40]:
        print(f"  - {t}")


if __name__ == "__main__":
    main()
