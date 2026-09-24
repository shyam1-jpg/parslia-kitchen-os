"""Turn loose ingredient notes into Qty / Unit / Ingredient lines for 4 servings."""

from __future__ import annotations

import re

import recipe_cards

SKIP = {
    "kadai",
    "heavy kadai",
    "ghee in kadai",
    "oil in kadai",
    "kadai then bowl chill",
    "kadai + bowl",
    "cast-iron grill",
    "clay bowls to set",
    "clay tandoor",
    "clay tandoor or tawa-puff",
    "heavy kadai or clay",
    "heavy kadai — long simmer like langar",
}

# Bare pantry names → (qty, unit, display name) for 4 servings.
DEFAULTS = {
    "salt": ("1", "tsp", "salt, or to taste"),
    "hing": ("½", "tsp", "hing (asafoetida)"),
    "ghee": ("2", "tbsp", "ghee"),
    "oil": ("2", "tbsp", "oil"),
    "coconut oil": ("2", "tbsp", "coconut oil"),
    "mustard oil": ("2", "tbsp", "mustard oil"),
    "cardamom": ("4", "pods", "green cardamom, crushed"),
    "cumin": ("1", "tsp", "cumin seeds"),
    "roasted cumin": ("1", "tsp", "roasted cumin powder"),
    "ginger": ("20", "g", "fresh ginger, crushed"),
    "ginger-chilli": ("1", "tbsp", "ginger-green chilli paste (no garlic)"),
    "green chilli": ("2", "pieces", "green chillies, slit"),
    "chilli": ("2", "pieces", "green or dry red chillies"),
    "dry chilli": ("2", "pieces", "dry red chillies"),
    "turmeric": ("½", "tsp", "turmeric powder"),
    "sugar": ("100", "g", "sugar"),
    "sugar pinch": ("1", "pinch", "sugar"),
    "jaggery": ("100", "g", "jaggery, grated"),
    "jaggery pinch": ("1", "pinch", "jaggery"),
    "jaggery syrup": ("200", "ml", "jaggery syrup"),
    "lemon": ("1", "tbsp", "lemon juice"),
    "tomato": ("2", "pieces", "ripe tomatoes, chopped"),
    "mustard": ("1", "tsp", "mustard seeds"),
    "mustard tadka": ("1", "tsp", "mustard seeds, for tempering"),
    "curry leaves": ("10", "leaves", "fresh curry leaves"),
    "atta": ("300", "g", "whole-wheat atta"),
    "maida": ("250", "g", "maida (refined flour)"),
    "milk": ("1", "L", "full-fat milk"),
    "coconut": ("100", "g", "fresh grated coconut"),
    "coconut paste": ("80", "g", "fresh coconut paste"),
    "coconut milk": ("400", "ml", "thick coconut milk"),
    "yogurt": ("200", "g", "plain yogurt"),
    "hung yogurt": ("250", "g", "hung yogurt"),
    "rice": ("200", "g", "raw rice"),
    "cooked rice": ("400", "g", "cooked rice"),
    "rice flour": ("150", "g", "rice flour"),
    "rice paste": ("100", "g", "ground rice paste"),
    "coriander": ("15", "g", "fresh coriander leaves"),
    "coriander powder": ("1", "tsp", "coriander powder"),
    "cucumber": ("2", "pieces", "cucumbers"),
    "water": ("500", "ml", "water"),
    "hot water": ("250", "ml", "hot water"),
    "sesame": ("3", "tbsp", "white sesame seeds"),
    "roasted sesame": ("3", "tbsp", "roasted sesame seeds"),
    "besan": ("150", "g", "besan (gram flour)"),
    "amchur": ("1", "tsp", "amchur (dry mango powder)"),
    "tamarind": ("20", "g", "seedless tamarind"),
    "cashews": ("20", "g", "cashews"),
    "peanuts": ("30", "g", "roasted peanuts"),
    "toor dal": ("150", "g", "toor dal, rinsed"),
    "chana dal": ("100", "g", "chana dal, soaked"),
    "urad dal": ("50", "g", "urad dal"),
    "panch phoron": ("1", "tsp", "panch phoron"),
    "potatoes": ("400", "g", "potatoes"),
    "potato": ("300", "g", "potatoes"),
    "beans": ("250", "g", "french beans or local beans"),
    "fennel": ("1", "tsp", "fennel seeds"),
    "mixed veg": ("400", "g", "mixed seasonal vegetables, cut"),
    "cabbage": ("300", "g", "cabbage, shredded"),
    "pepper": ("½", "tsp", "black pepper, crushed"),
    "spinach": ("250", "g", "spinach leaves"),
    "saffron": ("1", "pinch", "saffron strands"),
    "raisins": ("20", "g", "raisins"),
    "chenna": ("200", "g", "fresh chhena"),
    "sooji": ("150", "g", "sooji (semolina)"),
    "banana": ("2", "pieces", "ripe bananas"),
    "greens": ("300", "g", "seasonal greens, washed"),
    "kalonji": ("½", "tsp", "kalonji (nigella)"),
    "garam masala": ("½", "tsp", "garam masala (no onion-garlic powder)"),
    "ajwain": ("½", "tsp", "ajwain (carom seeds)"),
    "khoya": ("200", "g", "khoya / mawa"),
    "chaat masala": ("½", "tsp", "chaat masala (check no onion-garlic)"),
    "kokum": ("6", "pieces", "kokum petals"),
    "vermicelli": ("80", "g", "roasted vermicelli"),
    "pistachios": ("15", "g", "pistachios, slivered"),
    "sugar syrup": ("250", "ml", "sugar syrup (1-string)"),
    "bay": ("2", "leaves", "bay leaves"),
    "sticky rice, soaked": ("400", "g", "sticky rice, soaked 4 hours"),
    "chak-hao, soaked": ("300", "g", "chak-hao (black rice), soaked"),
    "chak-hao": ("300", "g", "chak-hao (black rice)"),
    "honey": ("3", "tbsp", "honey"),
    "white peas, soaked": ("200", "g", "white peas, soaked overnight"),
    "white peas": ("200", "g", "white peas"),
    "whole green moong, soaked": ("200", "g", "whole green moong, soaked"),
    "yeast": ("1", "tsp", "instant yeast"),
    "yeast or toddy": ("1", "tsp", "instant yeast (or toddy)"),
    "ash gourd": ("300", "g", "ash gourd, cubed"),
    "baking soda pinch": ("¼", "tsp", "baking soda"),
    "beetroot": ("250", "g", "beetroot, cubed"),
    "beet": ("250", "g", "beetroot, cubed"),
    "black salt": ("½", "tsp", "black salt"),
    "coconut-cumin-chilli paste": ("80", "g", "coconut-cumin-chilli paste (no garlic)"),
    "coconut-jaggery filling": ("200", "g", "coconut-jaggery filling"),
    "coconut-jaggery": ("150", "g", "coconut-jaggery mix"),
    "coconut-jaggery-cardamom filling": ("200", "g", "coconut-jaggery-cardamom filling"),
    "curd optional": ("100", "g", "plain yogurt, optional"),
    "mint": ("10", "g", "fresh mint leaves"),
    "nuts": ("30", "g", "mixed nuts, chopped"),
    "almonds": ("20", "g", "almonds"),
    "soaked almonds": ("20", "g", "almonds, soaked and peeled"),
    "poppy": ("2", "tbsp", "white poppy seeds"),
    "poppy seeds": ("2", "tbsp", "white poppy seeds"),
    "poppy-mustard paste": ("4", "tbsp", "poppy-mustard paste"),
    "posto paste": ("4", "tbsp", "posto (poppy) paste"),
    "pumpkin": ("300", "g", "pumpkin, cubed"),
    "red chilli": ("1", "tsp", "Kashmiri red chilli powder"),
    "sattu": ("150", "g", "sattu (roasted gram flour)"),
    "sattu filling": ("150", "g", "sattu filling"),
    "urad": ("150", "g", "urad dal"),
    "ada": ("80", "g", "rice ada"),
    "badam milk": ("500", "ml", "badam milk"),
    "bari or pakora": ("12", "pieces", "bari or besan pakora"),
    "bhaja masala": ("1", "tsp", "bhaja masala"),
    "bhaja moshla": ("1", "tsp", "bhaja moshla"),
    "bhatt, soaked": ("150", "g", "bhatt (black soy), soaked"),
    "bhindi": ("400", "g", "bhindi (okra), cut"),
    "okra": ("400", "g", "okra, cut"),
    "bisi bele bath powder garlic-free": ("2", "tbsp", "bisi bele bath powder (no onion-garlic)"),
    "black pepper": ("½", "tsp", "black pepper, crushed"),
    "boiled black chana": ("300", "g", "boiled black chickpeas"),
    "boiled potatoes": ("400", "g", "boiled potatoes"),
    "boondi": ("50", "g", "salted boondi"),
    "bottle gourd": ("400", "g", "bottle gourd, cubed"),
    "lauki": ("400", "g", "lauki (bottle gourd), cubed"),
    "brinjal": ("400", "g", "brinjal, cubed"),
    "brinjal slices": ("400", "g", "brinjal, sliced"),
    "brinjal, fried or roasted": ("400", "g", "brinjal, fried or roasted"),
    "capsicum, tomato": ("1", "piece", "capsicum plus 1 tomato, cubed"),
    "carrot": ("150", "g", "carrot, cut"),
    "grated carrot": ("200", "g", "carrot, grated"),
    "cauliflower, beans, carrot": ("400", "g", "cauliflower, beans and carrot"),
    "chhena discs, reduced milk, saffron, pistachio": ("200", "g", "chhena discs, plus reduced milk, saffron, pistachio"),
    "chura": ("150", "g", "chura (beaten rice)"),
    "chura / poha": ("150", "g", "chura / poha"),
    "thick poha": ("200", "g", "thick poha, rinsed"),
    "coconut-chilli paste": ("80", "g", "coconut-chilli paste (no garlic)"),
    "coconut-chilli-coriander paste": ("80", "g", "coconut-chilli-coriander paste"),
    "coconut-chilli-mustard paste": ("80", "g", "coconut-chilli-mustard paste"),
    "cooked jhangora": ("300", "g", "cooked jhangora (barnyard millet)"),
    "jhangora millet": ("150", "g", "jhangora (barnyard millet)"),
    "cowpeas": ("200", "g", "cowpeas, soaked"),
    "red cowpeas, cooked": ("300", "g", "cooked red cowpeas"),
    "crushed peas": ("150", "g", "green peas, crushed"),
    "peas": ("150", "g", "green peas"),
    "dates": ("50", "g", "dates, chopped"),
    "dondakaya / tendli": ("300", "g", "dondakaya / tendli"),
    "thondekayi": ("300", "g", "thondekayi (ivy gourd)"),
    "dry ginger": ("½", "tsp", "dry ginger powder"),
    "extra jaggery": ("2", "tbsp", "extra jaggery"),
    "fenugreek": ("½", "tsp", "fenugreek seeds"),
    "fenugreek seeds": ("½", "tsp", "fenugreek seeds"),
    "fenugreek seeds, roasted": ("½", "tsp", "roasted fenugreek seeds"),
    "fried garelu": ("8", "pieces", "fried garelu"),
    "gahat, bhatt or mixed dals, soaked": ("200", "g", "gahat, bhatt or mixed dals, soaked"),
    "god masala garlic-free or coriander-cumin": ("2", "tsp", "god masala (no onion-garlic)"),
    "goda masala garlic-free": ("2", "tsp", "goda masala (no onion-garlic)"),
    "gongura leaves": ("150", "g", "gongura leaves"),
    "grated coconut": ("80", "g", "fresh grated coconut"),
    "green papaya": ("250", "g", "green papaya, julienne"),
    "idli batter": ("500", "g", "idli batter"),
    "idli batter steamed": ("500", "g", "idli batter, for steaming"),
    "jakhiya": ("1", "tsp", "jakhiya seeds"),
    "jakhiya or mustard": ("1", "tsp", "jakhiya or mustard seeds"),
    "jowar flour": ("250", "g", "jowar flour"),
    "kasundi": ("1", "tbsp", "kasundi (mustard sauce)"),
    "lime water": ("500", "ml", "lime water"),
    "makhana, lightly fried": ("80", "g", "makhana, lightly fried"),
    "makhana, roasted and crushed": ("80", "g", "makhana, roasted and crushed"),
    "roasted makhana": ("80", "g", "roasted makhana"),
    "mandua/ragi flour": ("250", "g", "mandua / ragi flour"),
    "ragi flour": ("250", "g", "ragi flour"),
    "mango puree": ("400", "g", "mango puree"),
    "methi": ("50", "g", "fresh methi leaves"),
    "moong": ("150", "g", "moong dal"),
    "moong dal": ("150", "g", "moong dal"),
    "moong dal, roasted": ("150", "g", "roasted moong dal"),
    "moong, roasted": ("150", "g", "roasted moong"),
    "moong or masoor": ("150", "g", "moong or masoor dal"),
    "moong sprouts": ("200", "g", "moong sprouts"),
    "split moong, soaked": ("150", "g", "split moong, soaked"),
    "nendran banana": ("2", "pieces", "nendran bananas"),
    "ripe bananas": ("2", "pieces", "ripe bananas"),
    "nenua / turai": ("400", "g", "nenua / turai, cubed"),
    "nutmeg": ("1", "pinch", "freshly grated nutmeg"),
    "optional malai": ("2", "tbsp", "malai (optional)"),
    "peppercorns": ("½", "tsp", "black peppercorns"),
    "pineapple": ("200", "g", "pineapple, cubed"),
    "pointed gourd": ("400", "g", "pointed gourd (parwal)"),
    "pomegranate": ("80", "g", "pomegranate arils"),
    "puffed rice": ("100", "g", "puffed rice"),
    "radish": ("200", "g", "white radish, grated"),
    "rasam powder garlic-free": ("2", "tsp", "rasam powder (no onion-garlic)"),
    "rava": ("150", "g", "rava (semolina)"),
    "rava roasted in ghee": ("150", "g", "rava, roasted in ghee"),
    "raw mango": ("1", "piece", "raw mango, grated"),
    "raw mango, julienned": ("1", "piece", "raw mango, julienned"),
    "reduced milk": ("500", "ml", "reduced full-fat milk"),
    "rice-flour dough": ("300", "g", "rice-flour dough"),
    "roasted peanuts crushed": ("40", "g", "roasted peanuts, crushed"),
    "roasted rice flour": ("100", "g", "roasted rice flour"),
    "sticky rice": ("400", "g", "sticky rice, soaked"),
    "steamed rice": ("400", "g", "steamed rice"),
    "tomatoes": ("3", "pieces", "ripe tomatoes, chopped"),
    "toor or masoor dal": ("150", "g", "toor or masoor dal"),
    "thin + thick coconut milk": ("400", "ml", "thin coconut milk plus 200 ml thick"),
    "thin and thick coconut milk": ("400", "ml", "thin coconut milk plus 200 ml thick"),
    "raw banana, papaya, brinjal, pumpkin, beans": ("500", "g", "raw banana, papaya, brinjal, pumpkin and beans, cubed"),
    "garlic skipped: use dry chilli and panch phoron": ("1", "tsp", "panch phoron plus 2 dry red chillies (no garlic)"),
    "bitter gourd, potato, raw banana, drumstick, beans, eggplant": ("600", "g", "bitter gourd, potato, raw banana, drumstick, beans and eggplant"),
    "chana-jaggery-cardamom filling": ("250", "g", "chana-jaggery-cardamom filling"),
    "chana or toor dal + jaggery + cardamom": ("250", "g", "cooked chana or toor dal with jaggery and cardamom"),
    "raw banana, sliced": ("400", "g", "raw banana, sliced"),
    "yam, ash gourd, carrot, beans, drumstick, raw banana": ("600", "g", "yam, ash gourd, carrot, beans, drumstick and raw banana"),
    "temper: mustard, sesame, curry leaves, green chilli, hing in ghee": ("1", "tbsp", "ghee, plus mustard, sesame, curry leaves, green chilli, pinch hing"),
    "temper mustard, sesame, curry leaf, hing, coconut": ("1", "tbsp", "oil, plus mustard, sesame, curry leaf, hing, 2 tbsp coconut"),
    "surti papdi, purple yam, potato, banana, brinjal, fresh tuvar": ("700", "g", "surti papdi, purple yam, potato, banana, brinjal and fresh tuvar"),
    "muthiya: methi, atta, ajwain, chilli, salt": ("12", "pieces", "methi muthiya (atta, methi, ajwain, chilli, salt)"),
    "kadhi: yogurt, besan, ginger, green chilli, curry leaf, mustard, hing, jaggery pinch": ("400", "g", "yogurt, plus 3 tbsp besan, ginger, chilli, curry leaf, mustard, hing, pinch jaggery"),
    "khichdi: rice + moong dal, turmeric, ghee, cumin, hing": ("150", "g", "rice plus 100 g moong dal, turmeric, ghee, cumin, hing"),
    "pinch cardamom, saffron optional, sugar if needed": ("1", "pinch", "cardamom, optional saffron, sugar if needed"),
    "temper cumin, methi, dry chilli, hing": ("1", "tbsp", "ghee, plus cumin, methi, dry chilli, pinch hing"),
    "sambar: toor, pumpkin, drumstick, tomato, tamarind, sambar powder without onion garlic, mustard hing curry leaf": ("150", "g", "toor dal, plus pumpkin, drumstick, tomato, tamarind, sambar powder (no onion-garlic)"),
    "dahi, cucumber, boiled potato, cumin, salt, chilli powder, coriander": ("400", "g", "yogurt, plus cucumber, boiled potato, cumin, salt, chilli powder, coriander"),
}

PACKED = re.compile(
    r",\s*(?=(?:\d+\s*)?(?:[½¼¾⅓⅔⅛]|[0-9]+/[0-9]+|[0-9]+(?:\.[0-9]+)?)\s+"
    r"(?:tsp|tbsp|teaspoon|tablespoon|cup|cups|g|kg|ml|l|pinch|piece|pieces)\b)",
    re.I,
)


def _lookup(text: str):
    key = text.strip().lower().rstrip(".")
    key = re.sub(r"\s+", " ", key)
    if key in SKIP or "kadai" in key:
        return None
    if key in DEFAULTS:
        q, u, n = DEFAULTS[key]
        return recipe_cards.pack(q, u, n)
    for bare, triple in sorted(DEFAULTS.items(), key=lambda kv: len(kv[0]), reverse=True):
        if key == bare or key.startswith(bare + ",") or key.startswith(bare + " "):
            q, u, n = triple
            return recipe_cards.pack(q, u, n)
    return None


def expand_ingredient_text(text: str) -> list[dict]:
    text = str(text).strip()
    if not text:
        return []
    if text.lower().rstrip(".") in SKIP or "kadai" in text.lower():
        return []
    parts = [p.strip() for p in PACKED.split(text) if p.strip()]
    if len(parts) == 1:
        # also split simple "Salt, cumin, turmeric" style lists of bare names
        if "," in text and not recipe_cards.LINE_RE.match(text):
            bits = [b.strip() for b in text.split(",") if b.strip()]
            if bits and all(_lookup(b) or not recipe_cards.parse_ingredient(b)["qty"] for b in bits):
                if all(_lookup(b) for b in bits):
                    parts = bits
    out = []
    for part in parts:
        parsed = recipe_cards.parse_ingredient(part)
        if parsed["qty"]:
            out.append(parsed)
            continue
        mapped = _lookup(part)
        if mapped:
            out.append(mapped)
            continue
        # Last resort: keep the wording but mark a cook's measure.
        out.append(recipe_cards.pack("1", "as needed", parsed["item"] or part))
    return out


def expand_ingredients(items) -> list[dict]:
    if isinstance(items, str):
        items = [items]
    out = []
    for item in items or []:
        if isinstance(item, dict) or (isinstance(item, (tuple, list)) and len(item) >= 3):
            parsed = recipe_cards.parse_ingredient(item)
            if parsed["qty"]:
                out.append(parsed)
            else:
                out.extend(expand_ingredient_text(parsed["item"]))
            continue
        out.extend(expand_ingredient_text(str(item)))
    return out
