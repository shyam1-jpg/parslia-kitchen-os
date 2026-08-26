"""Printable A4 Parslia Kitchen OS recipe spec sheets."""

from __future__ import annotations

from pathlib import Path

from fpdf import FPDF

import recipe_cards

INK = (17, 17, 17)
MUTED = (85, 85, 85)
LINE = (221, 221, 221)
FILL = (250, 250, 250)
GREEN = (20, 83, 45)


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
        "≈": "~",
        "·": "-",
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
        self.set_text_color(*MUTED)
        self.cell(
            0,
            8,
            pdf_text("Parslia Kitchen OS  |  Pure Prasad  |  No onion  |  No garlic  |  No eggs  |  No meat  |  No fish"),
            align="C",
        )


def _heading(pdf: RecipePDF, title: str) -> None:
    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*INK)
    pdf.cell(0, 7, pdf_text(title.upper()))
    pdf.ln(7)
    y = pdf.get_y()
    pdf.set_draw_color(*INK)
    pdf.line(12, y, 198, y)
    pdf.ln(3)


def add_recipe_page(pdf: RecipePDF, recipe: dict, kitchen: dict) -> None:
    meta = recipe_cards.spec_meta(recipe, kitchen)
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=16)

    pdf.set_text_color(*INK)
    pdf.set_xy(12, 10)
    pdf.set_font("Helvetica", "B", 11)
    pdf.cell(120, 6, pdf_text(meta["brand"]))
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*MUTED)
    pdf.cell(66, 6, pdf_text(f"Printed {meta['printed']}"), align="R")
    pdf.ln(6)
    pdf.set_x(12)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(0, 5, pdf_text(meta["pure"]))
    pdf.ln(8)

    pdf.set_x(12)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*MUTED)
    pdf.cell(0, 5, pdf_text(meta["course_line"].upper()))
    pdf.ln(6)
    pdf.set_x(12)
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(*INK)
    pdf.multi_cell(186, 8, pdf_text(recipe["name"]))
    pdf.ln(1)
    pdf.set_x(12)
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(186, 5, pdf_text(recipe.get("why") or ""))
    pdf.ln(3)

    boxes = [
        ("YIELD", meta["yield_label"]),
        ("PORTION", meta["portion_label"]),
        ("SERVICE", meta["service"]),
        ("TIME", meta["time_label"]),
    ]
    y = pdf.get_y()
    pdf.set_draw_color(*LINE)
    pdf.set_fill_color(*FILL)
    for i, (label, value) in enumerate(boxes):
        x = 12 + i * 46.5
        pdf.rect(x, y, 45.5, 16, "D")
        pdf.set_xy(x + 1, y + 1)
        pdf.set_font("Helvetica", "B", 7)
        pdf.set_text_color(*MUTED)
        pdf.cell(43, 5, label)
        pdf.set_xy(x + 1, y + 6)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(*INK)
        pdf.multi_cell(43, 4, pdf_text(value))
    pdf.set_y(y + 18)

    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*INK)
    pdf.set_x(12)
    pdf.multi_cell(186, 4, pdf_text("  |  ".join(meta["tags"])))
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*GREEN)
    pdf.set_x(12)
    pdf.multi_cell(186, 5, pdf_text(f"Cookware: {recipe['cookware']}"))

    _heading(pdf, f"Ingredients  ·  {meta['yield_label']}")
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(*MUTED)
    pdf.set_x(12)
    pdf.cell(22, 5, "QTY")
    pdf.cell(22, 5, "UNIT")
    pdf.cell(28, 5, "APPROX")
    pdf.cell(114, 5, "INGREDIENT")
    pdf.ln(5)
    pdf.set_text_color(*INK)
    pdf.set_font("Helvetica", "", 9)
    for item in recipe_cards.measured(recipe):
        pdf.set_x(12)
        pdf.cell(22, 5, pdf_text(item.get("qty") or "-"))
        pdf.cell(22, 5, pdf_text(item.get("unit") or "-"))
        pdf.cell(28, 5, pdf_text(item.get("approx") or ""))
        pdf.multi_cell(114, 5, pdf_text(item.get("item") or ""))

    _heading(pdf, "Method")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*INK)
    for n, step in enumerate(recipe.get("method") or [], 1):
        pdf.set_x(12)
        pdf.multi_cell(186, 5, pdf_text(f"{n}. {step}"))
        pdf.ln(1)

    _heading(pdf, "Nutrition per portion")
    nut_boxes = [
        ("KCAL", str(meta["kcal"])),
        ("PROTEIN", f"{meta['protein']} g"),
        ("CARBS", f"{meta['carbs']} g"),
        ("FAT", f"{meta['fat']} g"),
        ("FIBRE", f"{meta['fibre']} g"),
    ]
    y = pdf.get_y()
    if y > 250:
        pdf.add_page()
        y = 16
    pdf.set_draw_color(*LINE)
    pdf.set_fill_color(*FILL)
    for i, (label, value) in enumerate(nut_boxes):
        x = 12 + i * 37.2
        pdf.rect(x, y, 36.2, 16, "DF")
        pdf.set_xy(x, y + 1)
        pdf.set_font("Helvetica", "B", 7)
        pdf.set_text_color(*MUTED)
        pdf.cell(36.2, 5, label, align="C")
        pdf.set_xy(x, y + 7)
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(*INK)
        pdf.cell(36.2, 7, pdf_text(value), align="C")
    pdf.set_y(y + 18)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(*MUTED)
    pdf.set_x(12)
    pdf.multi_cell(186, 4, pdf_text(meta["disclaimer"]))

    _heading(pdf, "Allergens")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*INK)
    for item in meta["allergens"] or ["Verify labels before service"]:
        pdf.set_x(12)
        pdf.multi_cell(186, 5, pdf_text(f"- {item}"))

    if meta["chef_notes"]:
        _heading(pdf, "Chef notes")
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*INK)
        pdf.set_x(12)
        pdf.multi_cell(186, 5, pdf_text(meta["chef_notes"]))

    if meta["service_notes"]:
        _heading(pdf, "Service notes")
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*INK)
        pdf.set_x(12)
        pdf.multi_cell(186, 5, pdf_text(meta["service_notes"]))


def write_recipe_pdf(path: Path, recipe: dict, kitchen: dict) -> None:
    pdf = RecipePDF(format="A4", unit="mm")
    pdf.set_auto_page_break(auto=True, margin=16)
    add_recipe_page(pdf, recipe, kitchen)
    path.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(path))


def write_kitchen_pdf(path: Path, kitchen: dict, recipes: list[dict]) -> None:
    pdf = RecipePDF(format="A4", unit="mm")
    pdf.set_auto_page_break(auto=True, margin=16)
    for rec in recipes:
        add_recipe_page(pdf, rec, kitchen)
    path.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(path))
