"""Printable A4 PDF recipe cards (downloadable)."""

from __future__ import annotations

from pathlib import Path

from fpdf import FPDF

import recipe_cards

SAFFRON = (154, 52, 18)
RED = (127, 29, 29)
GREEN = (20, 83, 45)
SAND = (255, 237, 213)
CREAM = (255, 247, 237)
INK = (28, 25, 23)


def pdf_text(value) -> str:
    text = str(value or "")
    repl = {
        "½": "1/2",
        "¼": "1/4",
        "¾": "3/4",
        "⅓": "1/3",
        "⅔": "2/3",
        "⅛": "1/8",
        "—": "-",
        "–": "-",
        "•": "-",
        "×": "x",
        "’": "'",
        "‘": "'",
        "“": '"',
        "”": '"',
        "°": " deg",
    }
    for src, dst in repl.items():
        text = text.replace(src, dst)
    return text.encode("latin-1", "replace").decode("latin-1")


class RecipePDF(FPDF):
    def header(self):
        pass

    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(87, 83, 78)
        self.cell(0, 8, pdf_text("Downloadable recipe card  |  Vegetarian  |  No onion  |  No garlic  |  No aluminium"), align="C")


def add_recipe_page(pdf: RecipePDF, recipe: dict, kitchen: dict) -> None:
    pdf.add_page()
    total = int(recipe["prep_min"]) + int(recipe["cook_min"])
    pdf.set_fill_color(*SAFFRON)
    pdf.set_text_color(255, 255, 255)
    pdf.rect(0, 0, 210, 38, "F")
    pdf.set_xy(12, 8)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(0, 5, pdf_text(f"{kitchen['name'].upper()}  ·  {recipe['category'].upper()}  ·  RECIPE CARD"))
    pdf.set_xy(12, 14)
    pdf.set_font("Helvetica", "B", 20)
    pdf.multi_cell(186, 8, pdf_text(recipe["name"]))
    pdf.set_fill_color(*RED)
    pdf.rect(12, 32, 186, 6, "F")
    pdf.set_xy(12, 32)
    pdf.set_font("Helvetica", "B", 8)
    pdf.cell(186, 6, pdf_text("VEGETARIAN  ·  NO ONION  ·  NO GARLIC  ·  NO ALLIUM  ·  NO ALUMINIUM"), align="C")

    y = 42
    pdf.set_text_color(*INK)
    boxes = [
        ("SERVES", str(recipe["servings"])),
        ("PREP", f"{recipe['prep_min']} min"),
        ("COOK", f"{recipe['cook_min']} min"),
        ("TOTAL", f"{total} min"),
    ]
    pdf.set_fill_color(*SAND)
    for i, (label, value) in enumerate(boxes):
        x = 12 + i * 46.5
        pdf.rect(x, y, 45, 16, "F")
        pdf.set_xy(x, y + 1)
        pdf.set_font("Helvetica", "B", 7)
        pdf.set_text_color(124, 45, 18)
        pdf.cell(45, 5, label, align="C")
        pdf.set_xy(x, y + 6)
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(*INK)
        pdf.cell(45, 8, pdf_text(value), align="C")

    y = 62
    pdf.set_fill_color(220, 252, 231)
    pdf.rect(12, y, 186, 10, "F")
    pdf.set_xy(14, y + 2)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*GREEN)
    pdf.cell(182, 6, pdf_text(f"Cookware: {recipe['cookware']}"))

    y = 74
    pdf.set_text_color(*INK)
    pdf.set_xy(12, y)
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(186, 5, pdf_text(recipe["why"]))
    y = pdf.get_y() + 3

    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*SAFFRON)
    pdf.set_xy(12, y)
    pdf.cell(90, 7, pdf_text(f"INGREDIENTS  ·  {recipe['servings']} servings"))
    pdf.set_xy(108, y)
    pdf.cell(90, 7, "METHOD")
    y += 8

    # Ingredients table on the left
    left_y = y
    pdf.set_fill_color(*SAFFRON)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_xy(12, left_y)
    pdf.cell(16, 6, "QTY", border=0, fill=True)
    pdf.cell(18, 6, "UNIT", border=0, fill=True)
    pdf.cell(58, 6, "INGREDIENT", border=0, fill=True)
    left_y += 6
    pdf.set_text_color(*INK)
    pdf.set_font("Helvetica", "", 8)
    for i, item in enumerate(recipe_cards.measured(recipe)):
        fill = i % 2 == 0
        pdf.set_fill_color(*(CREAM if fill else (255, 255, 255)))
        pdf.set_xy(12, left_y)
        pdf.cell(16, 6, pdf_text(item["qty"] or "-"), fill=True)
        pdf.cell(18, 6, pdf_text(item["unit"] or "-"), fill=True)
        # wrap long ingredient names
        name = pdf_text(item["item"])
        if pdf.get_string_width(name) > 56:
            pdf.set_font("Helvetica", "", 7)
        pdf.cell(58, 6, name[:54], fill=True)
        pdf.set_font("Helvetica", "", 8)
        left_y += 6
        if left_y > 270:
            break

    # Method on the right
    right_y = y
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*INK)
    for n, step in enumerate(recipe["method"], 1):
        pdf.set_xy(108, right_y)
        pdf.multi_cell(90, 5, pdf_text(f"{n}. {step}"))
        right_y = pdf.get_y() + 2
        if right_y > 270:
            pdf.add_page()
            right_y = 20
            pdf.set_font("Helvetica", "B", 11)
            pdf.set_text_color(*SAFFRON)
            pdf.set_xy(12, 16)
            pdf.cell(0, 7, pdf_text(f"{recipe['name']}  ·  method continued"))
            pdf.set_font("Helvetica", "", 9)
            pdf.set_text_color(*INK)
            right_y = 26

    if recipe.get("notes"):
        y = max(left_y, right_y) + 4
        if y > 265:
            pdf.add_page()
            y = 20
        pdf.set_xy(12, y)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(*RED)
        pdf.cell(0, 5, "CHEF NOTES")
        pdf.set_xy(12, y + 5)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*INK)
        pdf.multi_cell(186, 5, pdf_text(recipe["notes"]))


def write_recipe_pdf(path: Path, recipe: dict, kitchen: dict) -> None:
    pdf = RecipePDF(format="A4", unit="mm")
    pdf.set_auto_page_break(auto=True, margin=14)
    add_recipe_page(pdf, recipe, kitchen)
    path.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(path))


def write_kitchen_pdf(path: Path, kitchen: dict, recipes: list[dict]) -> None:
    pdf = RecipePDF(format="A4", unit="mm")
    pdf.set_auto_page_break(auto=True, margin=14)
    for rec in recipes:
        add_recipe_page(pdf, rec, kitchen)
    path.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(path))
