# Focus kitchens — lots of vegetarian recipes

Deep onion-garlic-free vegetarian libraries for the states (and Mithila) you asked for.

Each dish is **no onion, no garlic**, cooked in **steel, iron, clay or glass — never aluminium**.

Cards are **Parslia Kitchen OS spec sheets**: yield, portion, service temperature, chef method, nutrition estimate, allergens, chef notes and service notes.

Open first:

- [`DOWNLOAD.html`](DOWNLOAD.html) — **click to download** ZIP packs and PDFs
- [`index.html`](index.html) in each kitchen folder — one recipe card per dish
- Each kitchen workbook: `07-manipur/excel/manipur-recipes.xlsx`

Example: Manipur ZIP is [`download/07-manipur.zip`](download/07-manipur.zip). Chamthong PDF is [`07-manipur/02-mains/chamthong-stew.pdf`](07-manipur/02-mains/chamthong-stew.pdf).

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
pip install fpdf2 openpyxl
python3 scripts/build_focus_state_recipes.py
python3 scripts/test_focus_state_recipes.py
```
