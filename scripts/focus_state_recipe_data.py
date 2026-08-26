"""Deep vegetarian libraries for the requested Indian kitchens.

Goa, Maharashtra, Odisha, West Bengal, Andhra Pradesh, plus shared pans.
21 recipes per region (3 of each course). Onion-garlic-free. No aluminium.
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

FOCUS_STATES = [
    {"id": "goa", "folder": "01-goa", "name": "Goa", "zone": "West", "community": "Goan Hindu vegetarian / sattvic", "note": "Coconut, kokum, curry leaves. Khatkhate, caldin and sannas without onion or garlic."},
    {"id": "maharashtra", "folder": "02-maharashtra", "name": "Maharashtra", "zone": "West", "community": "Maharashtrian vegetarian and vrat cooking", "note": "Pithla, varan, modak, koshimbir. Kokum and hing replace alliums."},
    {"id": "odisha", "folder": "03-odisha", "name": "Odisha", "zone": "East", "community": "Odia temple and home kitchen", "note": "Puri Jagannath food is onion-garlic free. Dalma, pitha, chhena sweets."},
    {"id": "west-bengal", "folder": "04-west-bengal", "name": "West Bengal", "zone": "East", "community": "Bengali niramish (vegetarian, no onion garlic)", "note": "Shukto, aloo posto, dhokar dalna, sandesh, payesh — the niramish table."},
    {"id": "andhra-pradesh", "folder": "05-andhra-pradesh", "name": "Andhra Pradesh", "zone": "South", "community": "Andhra vegetarian / temple pappu", "note": "Gongura, pulihora, pesarattu, pachadi. Tamarind and chilli, not alliums."},
    {"id": "kerala", "folder": "06-kerala", "name": "Kerala", "zone": "South", "community": "Kerala sadya kitchen", "note": "Avial, olan, thoran, puttu, payasam. The Onam sadya is already onion-garlic free."},
    {"id": "manipur", "folder": "07-manipur", "name": "Manipur", "zone": "Northeast", "community": "Meitei vegetarian table", "note": "Chamthong, ooti, singju, chak-hao. Sesame and ginger, not alliums or fermented fish."},
    {"id": "meghalaya", "folder": "08-meghalaya", "name": "Meghalaya", "zone": "Northeast", "community": "Khasi and Garo vegetarian home food", "note": "Rice cakes, sesame greens, pumpkin stew. No jadoh meat — fully vegetarian."},
    {"id": "uttarakhand", "folder": "09-uttarakhand", "name": "Uttarakhand", "zone": "North", "community": "Kumaoni and Garhwali vegetarian", "note": "Kafuli, phaanu, chainsoo, mandua roti, bal mithai. Jakhiya and mustard oil."},
    {"id": "uttar-pradesh", "folder": "10-uttar-pradesh", "name": "Uttar Pradesh", "zone": "North", "community": "Awadhi, Braj and Purvanchal sattvic", "note": "Mathura-Vrindavan temple food: kachori, aloo tamatar, petha, rabri."},
    {"id": "bihar", "folder": "11-bihar", "name": "Bihar", "zone": "East", "community": "Magadh vegetarian", "note": "Litti-chokha, sattu, thekua, ghugni. Mustard oil and chilli instead of onion."},
    {"id": "mithila", "folder": "12-mithila", "name": "Mithila", "zone": "East", "community": "Maithil vegetarian (Bihar–Nepal border culture)", "note": "Makhana, sattu, pua, dahi-chura, Maithil kadhi. A distinct kitchen from Magadh Bihar."},
    {"id": "karnataka", "folder": "13-karnataka", "name": "Karnataka", "zone": "South", "community": "Udupi, Mysuru and North Karnataka vegetarian", "note": "Udupi cooking is sattvic. Bisi bele, saaru, neer dosa, obbattu, kosambari."},
    {"id": "rajasthan", "folder": "14-rajasthan", "name": "Rajasthan", "zone": "West", "community": "Marwari, Mewari and Jain vegetarian", "note": "Gatte, dal-baati-churma, ker sangri, ghevar. Marwari kitchens often skip onion and garlic."},
    {"id": "gujarat", "folder": "15-gujarat", "name": "Gujarat", "zone": "West", "community": "Gujarati and Kathiawadi, including Jain-style", "note": "Dhokla, khandvi, thepla, undhiyu, kadhi, shrikhand — much of it already sattvic."},
    {"id": "punjab", "folder": "16-punjab", "name": "Punjab", "zone": "North", "community": "Punjabi langar and home vegetarian", "note": "Sarson saag, langar dal, makki roti, kadhi, pinni. Gurdwara cooking is onion-garlic free."},
    {"id": "pan-india", "folder": "17-pan-india", "name": "Pan-India", "zone": "All India", "community": "Dishes cooked in homes all over India", "note": "The nationwide vegetarian table: dal, paneer, chole, roti, jeera rice, gulab jamun, kheer — all without onion or garlic."},
]


def attach_paths(states):
    out = []
    for st in states:
        item = dict(st)
        item["path_prefix"] = (
            f"recipes/onion-garlic-free-indian/focus-states/{st['folder']}"
        )
        out.append(item)
    return out


FOCUS_STATES = attach_paths(FOCUS_STATES)


def build_recipes(r):
    from focus_state_recipe_data2 import extend_west_east_south
    from focus_state_recipe_data3 import extend_rest

    bucket: list[dict] = []
    add = make_add(r, FOCUS_STATES, bucket)
    extend_west_east_south(add, S, STEAM, TAWA, FRY, MILK, BOWL, CLAY, GRILL)
    extend_rest(add, S, STEAM, TAWA, FRY, MILK, BOWL, CLAY, GRILL)
    from focus_state_recipe_data4 import extend_heartland
    extend_heartland(add, S, STEAM, TAWA, FRY, MILK, BOWL, CLAY, GRILL)
    return bucket


def make_add(r, states, bucket):
    def add(sid, cat, name, prep, cook, pan, why, ings=None, steps=None, notes=""):
        if isinstance(why, list):
            notes = steps if isinstance(steps, str) else (notes or "")
            steps = ings if isinstance(ings, list) else [str(ings or "Prepare as written.")]
            ings = why
            why = f"Signature {cat.lower()} from {sid.replace('-', ' ').title()}, cooked without onion or garlic."
        if isinstance(ings, str):
            ings = [ings]
        if ings is None:
            ings = ["See method"]
        if isinstance(steps, str):
            steps = [steps]
        if steps is None:
            steps = ["Prepare as written, without onion or garlic, in steel or iron."]
        from measure_lines import expand_ingredients

        ings = expand_ingredients(ings)
        st = next(s for s in states if s["id"] == sid)
        bucket.append(r(sid, cat, name, st["community"], prep, cook, pan, why, ings, steps, notes or ""))
    return add
