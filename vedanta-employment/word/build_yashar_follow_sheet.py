#!/usr/bin/env python3
"""Yashar daily follow sheet as a Word file."""

from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

NAVY = RGBColor(0x1A, 0x1A, 0x1A)
GOLD = RGBColor(0x8A, 0x73, 0x4A)
DARK = RGBColor(0x22, 0x22, 0x22)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
HERE = Path(__file__).resolve().parent
OUT = HERE / "Yashar_Daily_Follow_Sheet.docx"


def set_run(run, *, size=11, bold=False, color=DARK, font="Calibri"):
    run.font.name = font
    run._element.rPr.rFonts.set(qn("w:eastAsia"), font)
    run.font.size = Pt(size)
    run.bold = bold
    run.font.color.rgb = color


def shade(cell, hex_color):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), hex_color)
    shd.set(qn("w:val"), "clear")
    tc_pr.append(shd)


def borders(cell):
    tc_pr = cell._tc.get_or_add_tcPr()
    b = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), "4")
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), "CCCCCC")
        b.append(el)
    tc_pr.append(b)


def cell(c, text, *, bold=False, fill=None, color=DARK, size=10):
    p = c.paragraphs[0]
    for child in list(p._p):
        if child.tag != qn("w:pPr"):
            p._p.remove(child)
    run = p.add_run(text)
    set_run(run, size=size, bold=bold, color=color)
    if fill:
        shade(c, fill)
    borders(c)


def heading(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    run = p.add_run(text)
    set_run(run, size=14, bold=True, color=NAVY, font="Georgia")


def body(doc, text, *, bold=False):
    p = doc.add_paragraph()
    run = p.add_run(text)
    set_run(run, bold=bold)


def bullet(doc, text):
    p = doc.add_paragraph(style="List Number")
    for child in list(p._p):
        if child.tag != qn("w:pPr"):
            p._p.remove(child)
    run = p.add_run(text)
    set_run(run)


def table(doc, headers, rows):
    t = doc.add_table(rows=1 + len(rows), cols=len(headers))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, h in enumerate(headers):
        cell(t.rows[0].cells[i], h, bold=True, color=WHITE, fill="1A1A1A")
    for r, row in enumerate(rows):
        fill = "F5F2EC" if r % 2 else "FFFFFF"
        for c, val in enumerate(row):
            cell(t.rows[r + 1].cells[c], val, fill=fill)
    doc.add_paragraph()


def main():
    doc = Document()
    sec = doc.sections[0]
    sec.page_width = Cm(21)
    sec.page_height = Cm(29.7)
    sec.top_margin = Cm(1.8)
    sec.bottom_margin = Cm(1.8)
    sec.left_margin = Cm(2)
    sec.right_margin = Cm(2)
    doc.core_properties.title = "Yashar — follow the daily"
    doc.core_properties.author = "The Vedanta Kitchen"
    doc.core_properties.category = "Employment"

    k = doc.add_paragraph()
    k.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = k.add_run("YASHAR  ·  FOLLOW THE DAILY  ·  THE VEDANTA")
    set_run(run, size=11, bold=True, color=GOLD, font="Georgia")

    t = doc.add_paragraph()
    t.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = t.add_run("What you have to do")
    set_run(run, size=26, bold=True, color=NAVY, font="Georgia")

    body(doc, "Follow Head Chef Shyam’s programme. Learn it, then do it in this order every shift.")
    body(doc, "You follow the daily. You do not skip date-check. You do not skip the recipe. 20 guests is not 20 jobs.", bold=True)

    heading(doc, "1. What you have to do")
    for x in (
        "Open the kitchen safe (temps + date check) before you cook.",
        "Confirm today’s guest number and today’s diets — they change (10, 20, 30, 50).",
        "Follow today’s menu and recipes — do not guess.",
        "For every dish: calculate → collect → prep → cook → label → wash.",
        "Help breakfast, lunch and dinner be ready on time.",
        "Clean as you go. Date-check again at close.",
        "If you are the only person on the board, say so early. Do not silently work 07:00–21:00 as if that is normal.",
        "Kitchen = food on the pass. Tea, buffet dressing and dining-room wash are not your default job.",
    ):
        bullet(doc, x)

    heading(doc, "2. What you have to learn")
    table(
        doc,
        ["Learn this", "Why"],
        [
            ["One dish ≈ 10 jobs", "If you only “cook”, you are late."],
            ["Starter to dessert ≈ 6 items", "Six recipes, not one pot."],
            ["Guests: 10 / 20 / 30 / 50", "Prep today’s number, not last week’s 50."],
            ["Extra diets = extra work", "Write them down."],
            ["Recipe first", "Calculate, collect, then prep."],
            ["HACCP every day", "Temps and date-check, 10 or 50 guests."],
            ["Empty board", "You cook and wash; ask for help or a simpler menu."],
        ],
    )

    heading(doc, "3. How to follow the daily (in order)")
    for x in (
        "Arrive: clock in, uniform, hands, read the day board.",
        "Open safe: temps, date-check, pull out-of-date, report faults.",
        "Lock number and diets: written on the board before big prep.",
        "Menu for this day: this guest count, this staff. Alone = simpler menu.",
        "Calculate recipes: portion × today’s guests + diet lines.",
        "Collect, then prep: pick-list first, then wash / cut / weigh.",
        "Three services: breakfast, lunch, dinner — handover on time, Kitchen pots washed.",
        "Close: label, date-check, clean. Not 21:00 then 07:00 next day.",
    ):
        bullet(doc, x)

    heading(doc, "4. Your clock")
    table(
        doc,
        ["If you are on", "Clock", "Follow"],
        [
            ["Morning", "07:00–16:00", "Open → breakfast + lunch → handover"],
            ["Late / dinner", "12:00–21:00", "Handover → dinner → Kitchen close"],
            ["Early KA/KP", "07:00–15:00", "Prep support, deliveries, Kitchen wash"],
            ["Late KA/KP", "15:00–22:00", "Dinner support and Kitchen close"],
        ],
    )
    body(doc, "10 guests = same steps, fewer portions. 30–50 = you cannot be chef and porter. Peak = extra hands or a simpler menu.")

    heading(doc, "5. This week")
    body(doc, "Day 1–2: shadow open (temps + date-check). Count ten elements on one dish.")
    body(doc, "Day 3–5: calculate one recipe; collect a full pick-list; run Kitchen wash in service.")
    body(doc, "Week 2: lead one prep block; write a handover; diet swap only from the written list.")

    heading(doc, "6. If you get stuck")
    table(
        doc,
        ["Problem", "What you do"],
        [
            ["No guest number", "Stop big prep. Ask Shyam or Duty Manager."],
            ["Diet added in service", "Tell Shyam. Simple substitute if he says so."],
            ["You are alone on a full menu", "Say it. Safe small menu beats a late unsafe menu."],
            ["Restaurant wash while Kitchen pots are out", "Kitchen pots first."],
            ["07:00 start after 21:00 finish", "No. Tell Shyam / Duty Manager."],
        ],
    )
    body(doc, "Kitchen owns the food. Restaurant owns guest-facing dining and refreshment. Yashar follows the daily in order.")

    doc.save(OUT)
    print("Wrote", OUT)


if __name__ == "__main__":
    main()
