#!/usr/bin/env python3
"""Checks for the Vedanta wholefood recipe collection."""

from __future__ import annotations

import json
import re
import unittest
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "recipes" / "vedanta-wholefoods" / "vedanta-wholefoods-recipes.json"
TXT_PATH = ROOT / "vedanta-wholefoods-recipes.txt"
HTML_PATH = ROOT / "recipes" / "vedanta-wholefoods" / "index.html"

STRAY = re.compile(
    r"(?i)\b(onions?|shallots?|garlic|leeks?|chives?|scallions?|"
    r"mushrooms?|porcini|kimchi|gochujang|meatballs?|parmesan|"
    r"fish sauce|alumin[iu]m)\b"
)


class VedantaCollectionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
        cls.recipes = cls.data["recipes"]

    def test_count(self) -> None:
        self.assertEqual(len(self.recipes), 116)
        self.assertEqual(self.data["count"], 116)

    def test_unique_titles_and_ids(self) -> None:
        titles = [r["title"] for r in self.recipes]
        ids = [r["id"] for r in self.recipes]
        self.assertEqual(len(set(titles)), 116, Counter(titles).most_common(3))
        self.assertEqual(len(set(ids)), 116)

    def test_no_forbidden_foods_in_body(self) -> None:
        problems = []
        for r in self.recipes:
            blob = "\n".join(r["ingredients"] + r["method"])
            blob = re.sub(
                r"(?i)(no onion|without onion|flax eggs?|per egg|"
                r"each egg is replaced|stand in for mushrooms)",
                "",
                blob,
            )
            self.assertNotRegex(blob, r"(?i)\bbulbs?\b")
            m = STRAY.search(blob)
            if m:
                problems.append(f"{r['title']}: {m.group(0)}")
        self.assertEqual(problems, [])

    def test_each_recipe_is_cookable(self) -> None:
        for r in self.recipes:
            self.assertGreaterEqual(len(r["ingredients"]), 3, r["title"])
            self.assertGreaterEqual(len(r["method"]), 3, r["title"])
            self.assertTrue(r["title"])
            self.assertTrue(r["summary"])

    def test_savoury_dishes_use_hing_or_cumin(self) -> None:
        hot = [r for r in self.recipes if r["style"] == "hot"]
        self.assertGreater(len(hot), 40)
        with_hing = sum(1 for r in hot if any(re.search(r"(?i)hing|asafoetida", x) for x in r["ingredients"]))
        self.assertGreater(with_hing, 40)

    def test_outputs_exist(self) -> None:
        self.assertTrue(TXT_PATH.exists())
        self.assertTrue(HTML_PATH.exists())
        self.assertIn("Vedanta Wholefood Recipes", HTML_PATH.read_text(encoding="utf-8"))
        self.assertIn("VEDANTA WHOLEFOOD RECIPE COLLECTION", TXT_PATH.read_text(encoding="utf-8")[:80])
        md = list((ROOT / "recipes" / "vedanta-wholefoods").rglob("*.md"))
        self.assertGreaterEqual(len(md), 116)

    def test_no_source_branding_in_body(self) -> None:
        for r in self.recipes:
            blob = "\n".join(r["ingredients"] + r["method"] + [r["summary"]])
            self.assertNotRegex(blob, r"(?i)forest whole foods|biona")


if __name__ == "__main__":
    unittest.main()
