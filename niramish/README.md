# Niramish

Standalone recipe-creator app. Photograph a recipe on an iPhone, then store a **house version** in the database.

This folder is a separate product. It is not part of Parslia, Libraix, or any other app in the parent repository.

## Ethos

Kept: milk, cheese, cream, butter, ghee, yogurt, paneer.

Removed and swapped: onion, garlic, chives, spring onion, leeks, shallots and the rest of that family; meat; fish; eggs; honey and other animal products that are not milk or cheese.

## Commercial writing style

Saved recipes use the same commercial cookbook card style as the earlier vegetarian collection:

- Short sales blurb
- `Cuisine` / `Course` / `Prep` / `Cook` / `Serves` / `Taste` / `Difficulty`
- `Ingredients` with `•` lines (`1 teaspoon`, `2 tablespoons`)
- `Method` as numbered steps: *Heat a non-stick pan. Add … and mix well. Transfer into a serving bowl and serve immediately.*

The stored card is not a copy of the photographed page: forbidden foods are swapped, quantities are nudged, and the method is lightly rephrased in that same commercial voice.

Sample source cards live in `samples/source-recipes.txt` (Aam Papad Challi, Palak Paneer, Aloo Muri, and similar dishes).

## Run

```bash
cd niramish
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app
```

Open http://127.0.0.1:8787 on an iPhone (or desktop). Photograph the page, check the house version, save it to the database.

Optional: install `tesseract-ocr` for photo reading. Recipe text can also be pasted.

## Tests

```bash
cd niramish
pytest
```
