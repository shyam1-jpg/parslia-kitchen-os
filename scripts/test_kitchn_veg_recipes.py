#!/usr/bin/env python3
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "Desktop" / "Kitchn-Vegan-Vegetarian-Recipes" / "kitchn-vegan-vegetarian.json"
DESKTOP = ROOT / "Desktop" / "Kitchn-Vegan-Vegetarian-Recipes"
MEAT = re.compile(r"(?i)\b(chicken|beef|pork|tuna|salmon|bacon|shrimp)\b")


class KitchnCollectionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
        cls.recipes = cls.data["recipes"]

    def test_large_collection(self) -> None:
        self.assertGreaterEqual(len(self.recipes), 1500)
        self.assertTrue((DESKTOP / "index.html").exists())
        self.assertTrue((DESKTOP / "ALL-RECIPES.txt").exists())
        self.assertGreaterEqual(len(list((DESKTOP / "vegan").glob("*.md"))), 400)
        self.assertGreaterEqual(len(list((DESKTOP / "vegetarian").glob("*.md"))), 800)

    def test_cookable_and_meat_free(self) -> None:
        leaks = []
        for r in self.recipes:
            self.assertGreaterEqual(len(r["ingredients"]), 3, r["title"])
            self.assertGreaterEqual(len(r["method"]), 2, r["title"])
            blob = "\n".join(r["ingredients"] + r["method"])
            if MEAT.search(blob):
                leaks.append(r["title"])
        self.assertEqual(leaks, [])


if __name__ == "__main__":
    unittest.main()
