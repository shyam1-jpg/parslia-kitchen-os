from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

PALAK = """
Palak Paneer

Cottage cheese cooked in spinach-based gravy and fresh Indian spices is a household staple.

Cuisine: Punjabi  Course: Main Course-Veg  Prep: 11-15 minutes  Cook: 11-15 minutes  Serves: 4  Taste: Mild  Difficulty: Medium

Ingredients
• 250 grams paneer
• 1 large onion
• 1 tablespoon chopped garlic
• 2 tablespoons fresh cream

Method
1. Heat oil in a non-stick pan.
2. Add onion and garlic and mix well.
3. Add paneer and fresh cream and serve immediately.
""".strip()


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["name"] == "niramish"


def test_scan_and_save_commercial_recipe():
    response = client.post("/api/scan", data={"text": PALAK})
    assert response.status_code == 200, response.text
    capture = response.json()
    house = capture["transformed"]
    assert house["cuisine"] == "Punjabi"
    assert "onion" not in house["title"].lower()
    blob = " ".join(house["steps"] + [item["item"] for item in house["ingredients"]])
    assert "onion" not in blob.lower()
    assert "garlic" not in blob.lower()
    saved = client.post("/api/recipes", json={**house, "capture_id": capture["id"]})
    assert saved.status_code == 200, saved.text
    listing = client.get("/api/recipes")
    titles = [item["title"] for item in listing.json()["recipes"]]
    assert saved.json()["title"] in titles
