from app.collection import load_source_recipes
from app.pipeline import build_house_recipe


def test_source_collection_loads_commercial_cards():
    recipes = load_source_recipes()
    titles = {recipe.title for recipe in recipes}
    assert "Palak Paneer" in titles
    assert "Aloo Muri" in titles
    assert "Aam Papad Challi" in titles
    assert len(recipes) >= 6


def test_each_source_card_builds_a_clean_house_recipe():
    for parsed in load_source_recipes():
        _, house = build_house_recipe(parsed.ocr_text)
        assert house.title
        assert house.ingredients
        assert house.steps
        assert house.cuisine or parsed.cuisine
        assert "• " in house.as_card()
        assert house.title != parsed.title
        assert "Cuisine:" in house.as_card() or not parsed.cuisine
