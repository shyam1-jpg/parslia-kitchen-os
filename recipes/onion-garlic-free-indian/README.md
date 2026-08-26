# Onion-garlic-free vegetarian Indian recipes — all continents

Vegetarian Indian cooking as it travelled with the diaspora, rewritten **without onion or garlic** and cooked **without aluminium**.

Each continent folder has:

- a `README.md` menu
- one markdown file per recipe, grouped by course
- an Excel workbook in `excel/`

Open the master spreadsheet first:

- [`excel/ALL-CONTINENTS.xlsx`](excel/ALL-CONTINENTS.xlsx) — every recipe, one sheet per continent, plus a filterable All Recipes table
- [`excel/SHOPPING-LIST.xlsx`](excel/SHOPPING-LIST.xlsx) — combined shopping list

## Diet flags

Vegetarian · no onion · no garlic · no other alliums · no aluminium cookware

See [COOKWARE-AND-DIET-RULES.md](COOKWARE-AND-DIET-RULES.md).

## Folders

| Folder | Continent | Kitchen |
|--------|-----------|---------|
| `01-asia` | Asia | India |
| `02-africa` | Africa | Durban + East African Gujarati |
| `03-europe` | Europe | British Indian |
| `04-north-america` | North America | Punjabi-Canadian / US |
| `05-south-america` | South America & Caribbean | Trinidad, Guyana, Suriname |
| `06-oceania` | Oceania | Indo-Fijian |
| `07-antarctica` | Antarctica | Polar / expedition stores |

## Courses in every folder

Starter · Main · Side · Bread · Sweet · Dessert · Salad

Serves 4 unless a recipe says otherwise.

## Rebuild

```bash
python3 scripts/build_continent_recipes.py
```
