"""Indian state and union-territory recipe data.

Vegetarian · no onion · no garlic · no aluminium cookware.
28 states + 8 union territories × 7 courses = 252 recipes.
"""

from __future__ import annotations

S = "Stainless steel kadhai or saucepan — never aluminium"
STEAM = "Stainless steel steamer and steel thali — never aluminium"
TAWA = "Cast-iron tawa (not aluminium)"
FRY = "Steel kadhai for frying — never aluminium"
MILK = "Heavy stainless steel milk pot — never aluminium"
BOWL = "Steel or glass bowl"
CLAY = "Stainless steel or clay pot — never aluminium"
GRILL = "Cast-iron grill or steel oven tray — never aluminium foil"
STONE = "Stone sil-batta or steel bowl (no aluminium)"

STATES = [
    {"id": "andhra-pradesh", "folder": "01-andhra-pradesh", "name": "Andhra Pradesh", "zone": "South", "community": "Coastal Andhra and Rayalaseema", "note": "Tamarind, gongura, chilli and mustard. Temple-style pappu needs no onion or garlic."},
    {"id": "arunachal-pradesh", "folder": "02-arunachal-pradesh", "name": "Arunachal Pradesh", "zone": "Northeast", "community": "Monpa, Nyishi and Adi home kitchens", "note": "Ginger, chilli, fermented soybean and steam. Momos and thukpa without alliums."},
    {"id": "assam", "folder": "03-assam", "name": "Assam", "zone": "Northeast", "community": "Assamese vegetarian table", "note": "Mustard oil, outenga sourness, pitika mash and pitha. Khar and tenga work without onion."},
    {"id": "bihar", "folder": "04-bihar", "name": "Bihar", "zone": "East", "community": "Magadh and Mithila", "note": "Sattu, litti-chokha, thekua. Chokha is fire-roasted mash — skip onion, keep mustard oil and chilli."},
    {"id": "chhattisgarh", "folder": "05-chhattisgarh", "name": "Chhattisgarh", "zone": "Central", "community": "Chhattisgarhi village kitchen", "note": "Rice batter, chila, bafauri and farra. Steamed lentil dumplings need no allium."},
    {"id": "goa", "folder": "06-goa", "name": "Goa", "zone": "West", "community": "Goan Hindu vegetarian (sattvic)", "note": "Coconut, kokum and curry leaves replace onion and garlic in khatkhate and tondak."},
    {"id": "gujarat", "folder": "07-gujarat", "name": "Gujarat", "zone": "West", "community": "Gujarati and Kathiawadi, including Jain-style", "note": "Dhokla, thepla, undhiyu and shrikhand are often cooked without onion and garlic already."},
    {"id": "haryana", "folder": "08-haryana", "name": "Haryana", "zone": "North", "community": "Jat vegetarian farm kitchen", "note": "Bajra, kadhi and bathua. Hing and ginger stand in for alliums."},
    {"id": "himachal-pradesh", "folder": "09-himachal-pradesh", "name": "Himachal Pradesh", "zone": "North", "community": "Pahari dham (temple feast)", "note": "Chana madra, sepu vadi and siddu from Himachali dham are traditionally onion-garlic free."},
    {"id": "jharkhand", "folder": "10-jharkhand", "name": "Jharkhand", "zone": "East", "community": "Nagpuri and tribal plateau kitchen", "note": "Dhuska, rugra mushrooms, arsa. Forest vegetables, mustard oil, no allium."},
    {"id": "karnataka", "folder": "11-karnataka", "name": "Karnataka", "zone": "South", "community": "Udupi, Mysuru and North Karnataka", "note": "Udupi cooking is already sattvic. Bisi bele bath, palya, kosambari, payasa."},
    {"id": "kerala", "folder": "12-kerala", "name": "Kerala", "zone": "South", "community": "Kerala sadya (feast) kitchen", "note": "Avial, thoran and payasam from the sadya are onion-garlic free by tradition."},
    {"id": "madhya-pradesh", "folder": "13-madhya-pradesh", "name": "Madhya Pradesh", "zone": "Central", "community": "Malwa, Bundelkhand and Mahakoshal", "note": "Poha, dal-bafla, bhutte ka kees. Temper with cumin, hing and ginger."},
    {"id": "maharashtra", "folder": "14-maharashtra", "name": "Maharashtra", "zone": "West", "community": "Maharashtrian Hindu vegetarian / sattvic", "note": "Pithla-bhakri, modak and koshimbir. Skip onion in koshimbir; use cucumber, coconut, lemon."},
    {"id": "manipur", "folder": "15-manipur", "name": "Manipur", "zone": "Northeast", "community": "Meitei vegetarian table", "note": "Chamthong stew, singju salad, chak-hao kheer. Use sesame and ginger, not alliums."},
    {"id": "meghalaya", "folder": "16-meghalaya", "name": "Meghalaya", "zone": "Northeast", "community": "Khasi and Garo vegetarian home food", "note": "Rice cakes, sesame, steamed vegetables. Jadoh is meat — this set stays vegetarian."},
    {"id": "mizoram", "folder": "17-mizoram", "name": "Mizoram", "zone": "Northeast", "community": "Mizo vegetarian bai", "note": "Bai is a boiled vegetable stew. Make it with squash, beans and leaves, no allium, no pork."},
    {"id": "nagaland", "folder": "18-nagaland", "name": "Nagaland", "zone": "Northeast", "community": "Naga vegetarian (axone + greens)", "note": "Galho rice porridge and fermented soybean (axone) with beans. Ginger and chilli, not garlic."},
    {"id": "odisha", "folder": "19-odisha", "name": "Odisha", "zone": "East", "community": "Odia temple and home kitchen", "note": "Dalma, santula and chhena poda. Puri Jagannath kitchen is famously onion-garlic free."},
    {"id": "punjab", "folder": "20-punjab", "name": "Punjab", "zone": "North", "community": "Punjabi langar and home", "note": "Langar dal, sarson saag and makki roti. Gurdwara cooking is onion-garlic free."},
    {"id": "rajasthan", "folder": "21-rajasthan", "name": "Rajasthan", "zone": "West", "community": "Marwari and Mewari, including Jain-style", "note": "Gatte, ker sangri, dal-baati. Marwari kitchens often skip onion and garlic."},
    {"id": "sikkim", "folder": "22-sikkim", "name": "Sikkim", "zone": "Northeast", "community": "Sikkimese Nepali, Bhutia and Lepcha vegetarian", "note": "Momos, thukpa, gundruk, sel roti. Use ginger and chilli; skip onion-garlic filling."},
    {"id": "tamil-nadu", "folder": "23-tamil-nadu", "name": "Tamil Nadu", "zone": "South", "community": "Tamil Brahmin and Chettinad vegetarian (sattvic)", "note": "Sambar, poriyal, idli, payasam. Tamil Brahmin cooking is the model for no-onion no-garlic."},
    {"id": "telangana", "folder": "24-telangana", "name": "Telangana", "zone": "South", "community": "Telangana and Hyderabadi vegetarian", "note": "Sarva pindi, jonna roti, qubani ka meetha. Gravies from tomato, coconut and cashew."},
    {"id": "tripura", "folder": "25-tripura", "name": "Tripura", "zone": "Northeast", "community": "Tripuri vegetarian (no berma fish)", "note": "Bamboo shoot, boiled vegetables, sticky rice. Vegetarian chakhwi without fermented fish."},
    {"id": "uttar-pradesh", "folder": "26-uttar-pradesh", "name": "Uttar Pradesh", "zone": "North", "community": "Awadhi, Braj and Purvanchal vegetarian", "note": "Mathura-Vrindavan sattvic food: kachori, aloo tamatar, petha, rabri — no onion garlic."},
    {"id": "uttarakhand", "folder": "27-uttarakhand", "name": "Uttarakhand", "zone": "North", "community": "Kumaoni and Garhwali", "note": "Kafuli, aloo gutke, bhatt, bal mithai. Jakhiya seeds and mustard oil, not alliums."},
    {"id": "west-bengal", "folder": "28-west-bengal", "name": "West Bengal", "zone": "East", "community": "Bengali vegetarian (niramish)", "note": "Niramish cooking forbids onion and garlic. Aloo posto, cholar dal, sandesh, payesh."},
    {"id": "andaman-nicobar", "folder": "29-andaman-nicobar", "name": "Andaman and Nicobar Islands", "zone": "Union Territory", "community": "Island coconut kitchen", "note": "Coconut, rice and tropical fruit. Seafood is skipped; coconut curry and payasam stay vegetarian."},
    {"id": "chandigarh", "folder": "30-chandigarh", "name": "Chandigarh", "zone": "Union Territory", "community": "Punjabi city kitchen", "note": "Chole-kulcha and tikki, langar-style without onion and garlic."},
    {"id": "dadra-daman", "folder": "31-dadra-daman", "name": "Dadra and Nagar Haveli and Daman and Diu", "zone": "Union Territory", "community": "Gujarati and Indo-Portuguese vegetarian", "note": "Thepla, coconut caldin (veg) and bebinca. Kokum and coconut replace alliums."},
    {"id": "delhi", "folder": "32-delhi", "name": "Delhi", "zone": "Union Territory", "community": "Delhi street and home vegetarian", "note": "Chole bhature, aloo tikki, jalebi-rabri. Temple-style gravies without onion garlic."},
    {"id": "jammu-kashmir", "folder": "33-jammu-kashmir", "name": "Jammu and Kashmir", "zone": "Union Territory", "community": "Kashmiri Pandit and Dogra vegetarian", "note": "Kashmiri Pandit food is onion-garlic free: dum aloo, nadru yakhni, haak, phirni."},
    {"id": "ladakh", "folder": "34-ladakh", "name": "Ladakh", "zone": "Union Territory", "community": "Ladakhi Buddhist vegetarian", "note": "Skyu, thukpa, tingmo, apricot sweets. Ginger and chilli, no allium."},
    {"id": "lakshadweep", "folder": "35-lakshadweep", "name": "Lakshadweep", "zone": "Union Territory", "community": "Island coconut and rice kitchen", "note": "Pathiri, coconut curry, payasam. Skip fish; keep coconut, curry leaves and kokum."},
    {"id": "puducherry", "folder": "36-puducherry", "name": "Puducherry", "zone": "Union Territory", "community": "Tamil and Franco-Tamil vegetarian", "note": "Idli, coconut stew, appam and payasam. French-Tamil stew without onion or garlic."},
]


def _attach_paths(states: list[dict]) -> list[dict]:
    out = []
    for st in states:
        item = dict(st)
        item["path_prefix"] = (
            f"recipes/onion-garlic-free-indian/india-states/{st['folder']}"
        )
        out.append(item)
    return out


STATES = _attach_paths(STATES)


def build_recipes(r):
    """Return 252 recipe dicts. `r` is build_continent_recipes.r."""
    from india_state_recipe_data2 import extend_states
    from india_state_recipe_data3 import extend_more

    R: list[dict] = []

    def add(sid, cat, name, prep, cook, pan, why, ings, steps, notes=""):
        # Compact rows sometimes skip the "why" string and pass ingredients first.
        if isinstance(why, list):
            notes = steps if isinstance(steps, str) else (notes or "")
            steps = ings if isinstance(ings, list) else [str(ings)]
            ings = why
            st_name = sid.replace("-", " ").title()
            why = f"Signature {cat.lower()} from {st_name}, cooked without onion or garlic."
        if isinstance(ings, str):
            ings = [ings]
        if isinstance(steps, str):
            steps = [steps]
        st = next(s for s in STATES if s["id"] == sid)
        R.append(r(sid, cat, name, st["community"], prep, cook, pan, why, ings, steps, notes or ""))

    # ----- 01 Andhra Pradesh -----
    add("andhra-pradesh", "Starter", "Punugulu", 15, 15, FRY,
        "Leftover idli-dosa batter fritters from Andhra breakfast.",
        ["2 cups leftover idli/dosa batter", "2 tbsp sooji", "1 tsp ginger-green chilli paste",
         "Pinch of hing", "8 curry leaves, chopped", "Salt", "Oil for frying"],
        ["Stir sooji, ginger-chilli, hing, curry leaves and salt into the batter.",
         "Heat oil in a steel kadhai. Drop small batter blobs.",
         "Fry on medium until golden. Serve with tomato-coconut chutney (no onion garlic)."])
    add("andhra-pradesh", "Main", "Gongura Pappu", 10, 30, CLAY,
        "Sorrel-leaf dal — Andhra’s signature sour main, already onion-garlic free in temple kitchens.",
        ["¾ cup toor dal", "2 cups gongura (sorrel) leaves", "¼ tsp turmeric", "2 tbsp oil",
         "1 tsp mustard seeds", "1 tsp cumin", "Pinch of hing", "2 dry red chillies",
         "8 curry leaves", "2 green chillies", "Salt"],
        ["Cook dal with turmeric until soft. Whisk.",
         "In oil, splutter mustard, cumin, hing, chilli and curry leaves. Add gongura and green chilli; wilt 4 minutes.",
         "Mix into dal with salt. Simmer 5 minutes. The leaves give the sourness — do not add onion."])
    add("andhra-pradesh", "Side", "Bendakaya Vepudu", 10, 15, S,
        "Dry okra fry with sesame and chilli.",
        ["400 g okra, sliced", "2 tbsp oil", "½ tsp mustard", "Pinch of hing", "½ tsp turmeric",
         "1 tsp chilli powder", "1 tsp coriander powder", "1 tbsp sesame seeds, roasted", "Salt"],
        ["Dry the okra well. Heat oil, mustard, hing.",
         "Add okra, turmeric and salt. Fry uncovered until the slime goes and edges brown.",
         "Dust chilli, coriander and sesame."])
    add("andhra-pradesh", "Bread", "Pesarattu", 20, 20, TAWA,
        "Green-moong dosa from Andhra — no rice needed, no allium.",
        ["1 cup whole green moong, soaked 4 hours", "1-inch ginger", "2 green chillies",
         "½ tsp cumin", "Salt", "Oil for the tawa"],
        ["Grind moong with ginger, chilli, cumin and salt to a slightly coarse batter.",
         "Spread on a hot iron tawa like a dosa. Drizzle oil. Cook both sides.",
         "Serve with ginger chutney (allium-free)."])
    add("andhra-pradesh", "Sweet", "Ariselu", 40, 25, FRY,
        "Festival rice-jaggery sweet of Andhra and Telangana.",
        ["2 cups rice flour (from soaked ground rice, dried)", "1 cup jaggery", "½ cup water",
         "1 tsp sesame seeds", "Ghee or oil for frying", "4 cardamom, crushed"],
        ["Melt jaggery with water in steel; strain. Cook to a soft-ball syrup.",
         "Mix in rice flour, sesame and cardamom to a soft dough.",
         "Pat small discs. Fry in medium-hot ghee until deep golden."])
    add("andhra-pradesh", "Dessert", "Paramannam", 10, 35, MILK,
        "Temple rice pudding cooked in milk and jaggery.",
        ["¼ cup rice", "3 cups milk", "½ cup jaggery", "4 cardamom", "10 cashews fried in ghee", "Saffron optional"],
        ["Simmer rice in milk in a steel pot until very soft.",
         "Add jaggery off a hard boil so milk does not split. Cardamom and cashews.",
         "Never cook this in aluminium — milk and jaggery both react."])
    add("andhra-pradesh", "Salad", "Tomato Pachadi Salad", 10, 5, BOWL,
        "Fresh tomato-chilli pachadi served like a salad with pesarattu.",
        ["3 tomatoes, chopped", "1 green chilli", "1 tsp oil", "½ tsp mustard", "Pinch of hing",
         "6 curry leaves", "Salt", "Coriander"],
        ["Crush tomato, chilli and salt lightly.",
         "Temper mustard, hing and curry leaves. Pour over. Coriander."])

    # ----- 02 Arunachal Pradesh -----
    add("arunachal-pradesh", "Starter", "Steamed Vegetable Momos", 30, 15, STEAM,
        "Arunachali and Tibetan-border momos with cabbage-ginger filling, no onion garlic.",
        ["2 cups maida", "2 cups shredded cabbage", "1 carrot, grated", "1 tsp ginger paste",
         "1 green chilli, minced", "Salt", "1 tsp oil"],
        ["Knead a firm dough. Rest 20 minutes.",
         "Salt the cabbage, squeeze dry, mix carrot, ginger, chilli and oil.",
         "Fill, pleat, steam 12 minutes in a steel steamer. Serve with tomato-chilli dip (no garlic)."])
    add("arunachal-pradesh", "Main", "Vegetable Thukpa", 15, 25, S,
        "Himalayan noodle soup. Ginger and pepper replace garlic.",
        ["150 g wheat noodles", "1 tbsp oil", "1 tsp ginger", "Pinch of hing", "1 tomato, chopped",
         "2 cups mixed veg (cabbage, carrot, beans)", "4 cups water or light veg stock",
         "1 tsp soy sauce optional (garlic-free)", "Salt", "Pepper", "Coriander"],
        ["Heat oil, ginger, hing, tomato. Add vegetables, water and salt. Simmer 10 minutes.",
         "Add noodles; cook until just done.",
         "Pepper and coriander. Do not add garlic paste."])
    add("arunachal-pradesh", "Side", "Ginger-Chilli Boiled Greens", 10, 12, S,
        "Local lai/mustard greens boiled and tossed — Arunachal’s everyday sabzi.",
        ["4 cups mustard or spinach greens", "1 tsp ginger, julienned", "2 green chillies, slit",
         "1 tsp mustard oil", "Salt"],
        ["Boil greens in salted water 5 minutes. Drain.",
         "Toss with ginger, chilli and mustard oil in a steel pan 2 minutes."])
    add("arunachal-pradesh", "Bread", "Steamed Sticky Rice", 5, 25, STEAM,
        "The staple bread-substitute of the hills.",
        ["2 cups sticky or short-grain rice, soaked 2 hours", "Pinch of salt"],
        ["Drain rice. Steam in a steel steamer 20–25 minutes until translucent.",
         "Serve with thukpa and greens. No aluminium steamer."])
    add("arunachal-pradesh", "Sweet", "Khapse", 20, 20, FRY,
        "Festival fried pastry shared across the Buddhist Himalaya.",
        ["2 cups flour", "3 tbsp sugar", "3 tbsp ghee", "Warm water", "Oil for frying"],
        ["Rub ghee into flour and sugar. Bind a firm dough. Rest 15 minutes.",
         "Roll, cut strips or discs. Fry in a steel kadhai until golden."])
    add("arunachal-pradesh", "Dessert", "Cardamom Rice Kheer", 10, 35, MILK,
        "Plain hill kheer after a chilli-heavy meal.",
        ["¼ cup rice", "1 litre milk", "⅓ cup sugar", "4 cardamom", "Raisins"],
        ["Simmer rice in milk in steel 35 minutes. Sugar, cardamom, raisins."])
    add("arunachal-pradesh", "Salad", "Cucumber Green-Chilli Salad", 8, 0, BOWL,
        "Cool crunch next to momos.",
        ["2 cucumbers", "1 green chilli", "Lemon", "Salt", "Coriander"],
        ["Slice cucumber. Toss with chilli, lemon, salt and coriander. No onion."])

    # ----- 03 Assam -----
    add("assam", "Starter", "Narikol Pitha", 25, 15, TAWA,
        "Assamese coconut rice cakes, savoury-sweet.",
        ["1 cup rice flour", "1 cup grated coconut", "2 tbsp jaggery (optional for sweet) or salt for savoury",
         "Warm water", "Ghee"],
        ["Mix rice flour with enough hot water to a soft dough.",
         "Fill with coconut mixed with jaggery or salt.",
         "Pat into discs. Cook on an iron tawa with ghee until speckled."])
    add("assam", "Main", "Ou Tenga Dal", 10, 30, CLAY,
        "Elephant-apple (or tomato) sour dal — Assam’s vegetarian tenga.",
        ["¾ cup masoor dal", "¼ tsp turmeric", "1 ou tenga slice or 2 tomatoes + 1 tsp lemon",
         "1 tbsp mustard oil", "½ tsp panch phoron", "Pinch of hing", "2 dry chillies", "Salt"],
        ["Cook dal with turmeric. Add ou tenga or tomato; simmer sour.",
         "Temper mustard oil with panch phoron, hing and chilli. Pour over.",
         "Lemon if you used tomato. No onion, no garlic — sour fruit does the work."])
    add("assam", "Side", "Aloo Pitika", 10, 20, S,
        "Mashed potato with mustard oil — Assam’s essential side. Skip the usual raw onion.",
        ["4 potatoes, boiled", "1 tbsp mustard oil", "2 green chillies, crushed", "Salt", "Coriander"],
        ["Mash hot potatoes with mustard oil, chilli and salt.",
         "Coriander on top. The mustard oil bite replaces onion."])
    add("assam", "Bread", "Luchi", 20, 15, FRY,
        "Small fried bread eaten with pitika and dal.",
        ["2 cups maida", "2 tbsp ghee", "Pinch of salt", "Water", "Oil for frying"],
        ["Knead a soft dough. Rest 15 minutes. Roll small rounds.",
         "Fry in a steel kadhai until they puff."])
    add("assam", "Sweet", "Til Pitha", 30, 20, TAWA,
        "Sesame-jaggery stuffed rice pancake for Magh Bihu.",
        ["1 cup rice flour", "½ cup sesame, roasted and crushed", "⅓ cup jaggery", "Water", "Ghee"],
        ["Mix sesame and jaggery for filling.",
         "Spread a thin rice-flour crepe on a hot iron tawa, add filling, roll.",
         "Cook until the edges crisp."])
    add("assam", "Dessert", "Payox", 10, 40, MILK,
        "Assamese rice pudding with jaggery.",
        ["¼ cup rice", "1 litre milk", "½ cup jaggery", "Cardamom", "Bay leaf"],
        ["Simmer rice, milk and bay in steel until thick. Jaggery and cardamom off the hard boil."])
    add("assam", "Salad", "Cabbage Mustard Salad", 10, 0, BOWL,
        "Shredded cabbage with mustard oil and lemon — no onion.",
        ["2 cups shredded cabbage", "1 tsp mustard oil", "Lemon", "Green chilli", "Salt"],
        ["Toss everything. Rest 5 minutes so the cabbage softens slightly."])

    extend_states(add, S, STEAM, TAWA, FRY, MILK, BOWL, CLAY, GRILL)
    extend_more(add, S, STEAM, TAWA, FRY, MILK, BOWL, CLAY, GRILL, STONE)
    return R
