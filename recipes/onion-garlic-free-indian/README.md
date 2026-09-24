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

## Indian states (28 + 8 union territories)

A full seven-course vegetarian menu for **every Indian state and UT** is in [`india-states/`](india-states/README.md).

- [`india-states/excel/ALL-STATES.xlsx`](india-states/excel/ALL-STATES.xlsx) — 252 recipes
- [`india-states/excel/SHOPPING-LIST.xlsx`](india-states/excel/SHOPPING-LIST.xlsx)

## Focus kitchens (Rajasthan, Gujarat, Punjab, pan-India, and more)

A **21-recipe** vegetarian library for each requested kitchen is in [`focus-states/`](focus-states/README.md).

- [`focus-states/excel/FOCUS-STATES.xlsx`](focus-states/excel/FOCUS-STATES.xlsx) — 357 recipes
- [`focus-states/excel/SHOPPING-LIST.xlsx`](focus-states/excel/SHOPPING-LIST.xlsx)

Includes **Rajasthan**, **Gujarat**, **Punjab**, and **pan-India** dishes eaten all over the country, plus Goa, Maharashtra, Odisha, Bengal, Andhra, Kerala, Manipur, Meghalaya, Uttarakhand, UP, Bihar, Mithila, and Karnataka.

## Rebuild

```bash
python3 scripts/build_continent_recipes.py
python3 scripts/build_india_state_recipes.py
python3 scripts/build_focus_state_recipes.py
```
