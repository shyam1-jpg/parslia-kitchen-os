# Focus kitchens — lots of vegetarian recipes

Deep onion-garlic-free vegetarian libraries for the states (and Mithila) you asked for.

Each dish is **no onion, no garlic**, cooked in **steel, iron, clay or glass — never aluminium**.

Open first:

- [`index.html`](index.html) in each kitchen folder — **one recipe card per dish**, with Qty / Unit / Ingredient
- [`excel/FOCUS-STATES.xlsx`](excel/FOCUS-STATES.xlsx) — index of all kitchens (not the cooking cards)
- Each kitchen workbook: `14-rajasthan/excel/rajasthan-recipes.xlsx` — **Menu sheet + one sheet per recipe card**

Example: Manipur is folder `07-manipur/`. Open `07-manipur/index.html` or `07-manipur/excel/manipur-recipes.xlsx`. Chamthong is its own card, not mixed with other dishes.

Diet rules: [../COOKWARE-AND-DIET-RULES.md](../COOKWARE-AND-DIET-RULES.md)

## Kitchens (21 recipes each)

| Folder | Kitchen | Why this list is big |
|--------|---------|----------------------|
| `01-goa` | Goa | Coconut, kokum, khatkhate, sannas, bebinca |
| `02-maharashtra` | Maharashtra | Pithla, varan, modak, koshimbir, vrat food |
| `03-odisha` | Odisha | Jagannath-style dalma, pitha, chhena sweets |
| `04-west-bengal` | West Bengal | Niramish shukto, posto, sandesh, payesh |
| `05-andhra-pradesh` | Andhra Pradesh | Gongura, pulihora, pesarattu, pachadi |
| `06-kerala` | Kerala | Full sadya: avial, olan, puttu, payasam |
| `07-manipur` | Manipur | Chamthong, ooti, singju, chak-hao |
| `08-meghalaya` | Meghalaya | Rice cakes, sesame greens, pumpkin stew |
| `09-uttarakhand` | Uttarakhand | Kafuli, phaanu, chainsoo, bal mithai |
| `10-uttar-pradesh` | Uttar Pradesh | Braj temple kachori, aloo tamatar, petha |
| `11-bihar` | Bihar | Litti-chokha, sattu, thekua, ghugni |
| `12-mithila` | Mithila | Maithil makhana, pua, dahi-chura, kadhi |
| `13-karnataka` | Karnataka | Udupi bisi bele, neer dosa, obbattu |
| `14-rajasthan` | Rajasthan | Dal baati, gatte, ker sangri, ghevar, churma |
| `15-gujarat` | Gujarat | Dhokla, khandvi, undhiyu, thepla, shrikhand |
| `16-punjab` | Punjab | Sarson saag, langar dal, makki roti, pinni |
| `17-pan-india` | Pan-India | Dal tadka, palak paneer, roti, gulab jamun, kheer |

3 starters, 3 mains, 3 sides, 3 breads, 3 sweets, 3 desserts, 3 salads per kitchen.

## Rebuild

```bash
python3 scripts/build_focus_state_recipes.py
python3 scripts/test_focus_state_recipes.py
```
