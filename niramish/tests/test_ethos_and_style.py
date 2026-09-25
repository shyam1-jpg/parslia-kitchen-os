from app.ethos import find_forbidden, is_clean
from app.parse import parse_recipe
from app.pipeline import build_house_recipe


COMMERCIAL = """
Palak Paneer

Cottage cheese cooked in spinach-based gravy and fresh Indian spices is a household staple. Master the art of making this simple, wholesome and nutritious veg dish by following this recipe.

Cuisine: Punjabi  Course: Main Course-Veg  Prep: 11-15 minutes  Cook: 11-15 minutes  Serves: 4  Taste: Mild  Difficulty: Medium

Ingredients
• 250 grams paneer (cottage cheese)
• 2 medium bunches of spinach
• 1 large onion
• 1 green chilli
• 1 tablespoon chopped garlic
• 2 tablespoons oil
• 1 teaspoon cumin seeds
• 2 tablespoons fresh cream + for garnish

Method
1. Finely chop onion and cut paneer into 1-inch cubes.
2. Heat oil in a non-stick pan, add cumin seeds and let them change colour.
3. Add the chopped onions and sauté till translucent.
4. Add garlic, mix and cook for a minute.
5. Add spinach, salt, paneer cubes and fresh cream and mix well.
6. Garnish with fresh cream and serve hot with parantha.
""".strip()


def test_milk_and_cheese_are_allowed():
    assert is_clean("250 grams paneer, 2 tablespoons fresh cream, 1 cup milk, grated cheese")


def test_forbidden_alliums_and_animal_foods():
    phrases = [
        "1 large onion",
        "chopped garlic",
        "spring onion",
        "chives",
        "leeks",
        "chicken",
        "2 eggs",
        "3 tablespoons honey",
        "fish sauce",
    ]
    for phrase in phrases:
        assert find_forbidden(phrase), phrase


def test_eggplant_and_onion_seeds_are_allowed():
    assert is_clean("1 eggplant and 1 teaspoon onion seeds (kalonji)")


def test_parses_commercial_card():
    parsed = parse_recipe(COMMERCIAL)
    assert parsed.title == "Palak Paneer"
    assert parsed.cuisine == "Punjabi"
    assert parsed.course == "Main Course-Veg"
    assert parsed.servings == 4
    assert parsed.taste == "Mild"
    assert any("onion" in item.item.lower() for item in parsed.ingredients)
    assert any("green chilli" in item.item.lower() for item in parsed.ingredients)
    assert not any(item.unit == "g" and "reen" in item.item for item in parsed.ingredients)
    assert parsed.steps[0].startswith("Finely chop onion")


def test_house_recipe_keeps_commercial_voice():
    parsed, house = build_house_recipe(COMMERCIAL)
    card = house.as_card()
    assert "Cuisine: Punjabi" in card
    assert "Ingredients" in card
    assert "Method" in card
    assert house.title != parsed.title
    blob = " ".join([house.title, house.description, *house.steps, *[i.item for i in house.ingredients]])
    assert is_clean(blob)
    assert "onion" not in blob.lower()
    assert "garlic" not in blob.lower()
    joined_method = " ".join(house.steps).lower()
    assert "heat" in joined_method or "mix" in joined_method or "sauté" in joined_method or "serve" in joined_method
    assert "warm a heavy pan" not in joined_method
    assert "fold together until even" not in joined_method
    assert house.description
    assert "easy" in house.description.lower() or "delicious" in house.description.lower() or "staple" in house.description.lower() or "wholesome" in house.description.lower()


def test_quantities_and_method_change():
    parsed, house = build_house_recipe(COMMERCIAL)
    changed_qty = False
    for original, new in zip(parsed.ingredients, house.ingredients):
        if original.quantity is not None and new.quantity is not None:
            if original.quantity != new.quantity:
                changed_qty = True
    assert changed_qty
    assert " ".join(house.steps) != " ".join(parsed.steps)
