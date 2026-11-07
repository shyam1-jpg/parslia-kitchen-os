#!/usr/bin/env python3
"""Build Shyam's kitchen work-formula email as a Word file."""

from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

NAVY = RGBColor(0x1A, 0x1A, 0x1A)
GOLD = RGBColor(0x8A, 0x73, 0x4A)
DARK = RGBColor(0x22, 0x22, 0x22)
MUTED = RGBColor(0x55, 0x55, 0x55)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
HEADER_BG = "1A1A1A"
LIGHT_ROW = "F5F2EC"
CREAM = "F7F3EA"

HERE = Path(__file__).resolve().parent
OUT = HERE / "Vedanta_Kitchen_Work_Formula_and_Coverage.docx"


def set_run(run, *, size=11, bold=False, italic=False, color=DARK, font="Calibri"):
    run.font.name = font
    run._element.rPr.rFonts.set(qn("w:eastAsia"), font)
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = color


def shade_cell(cell, hex_color):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), hex_color)
    shd.set(qn("w:val"), "clear")
    tc_pr.append(shd)


def set_cell_borders(cell, color="CCCCCC"):
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), "4")
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), color)
        borders.append(el)
    tc_pr.append(borders)


def clear_paragraph(paragraph):
    p = paragraph._p
    for child in list(p):
        if child.tag != qn("w:pPr"):
            p.remove(child)


def write_cell(cell, text, *, bold=False, color=DARK, size=10, fill=None):
    clear_paragraph(cell.paragraphs[0])
    p = cell.paragraphs[0]
    run = p.add_run(text)
    set_run(run, size=size, bold=bold, color=color)
    if fill:
        shade_cell(cell, fill)
    set_cell_borders(cell)
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)


def add_table(doc, headers, rows):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, header in enumerate(headers):
        write_cell(table.rows[0].cells[i], header, bold=True, color=WHITE, fill=HEADER_BG)
    for r, row in enumerate(rows):
        fill = LIGHT_ROW if r % 2 else "FFFFFF"
        for c, value in enumerate(row):
            write_cell(table.rows[r + 1].cells[c], value, fill=fill)
    doc.add_paragraph().paragraph_format.space_after = Pt(6)


def heading(doc, text, level=1):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(16 if level == 1 else 10)
    p.paragraph_format.space_after = Pt(6)
    run = p.add_run(text)
    set_run(
        run,
        size=16 if level == 1 else 13 if level == 2 else 11,
        bold=True,
        color=NAVY if level != 2 else GOLD,
        font="Georgia",
    )


def body(doc, text, *, bold=False, italic=False, after=6):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(after)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    run = p.add_run(text)
    set_run(run, bold=bold, italic=italic)


def bullet(doc, text):
    p = doc.add_paragraph(style="List Bullet")
    clear_paragraph(p)
    run = p.add_run(text)
    set_run(run)
    p.paragraph_format.space_after = Pt(2)


def numbered(doc, items):
    for item in items:
        p = doc.add_paragraph(style="List Number")
        clear_paragraph(p)
        run = p.add_run(item)
        set_run(run)
        p.paragraph_format.space_after = Pt(2)


def callout(doc, text):
    table = doc.add_table(rows=1, cols=1)
    write_cell(table.rows[0].cells[0], text, bold=True, fill=CREAM, size=11)
    doc.add_paragraph().paragraph_format.space_after = Pt(8)


def add_page_field(paragraph):
    run = paragraph.add_run()
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = " PAGE "
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run._r.extend((begin, instr, end))
    set_run(run, size=9, color=MUTED)


def setup(doc):
    section = doc.sections[0]
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(2.0)
    section.bottom_margin = Cm(2.0)
    section.left_margin = Cm(2.0)
    section.right_margin = Cm(2.0)
    hp = section.header.paragraphs[0]
    clear_paragraph(hp)
    run = hp.add_run("THE VEDANTA")
    set_run(run, size=9, bold=True, color=GOLD, font="Georgia")
    run = hp.add_run("   ·   Kitchen work formula   ·   From Shyam, Head Chef")
    set_run(run, size=9, color=MUTED)
    fp = section.footer.paragraphs[0]
    clear_paragraph(fp)
    run = fp.add_run("Employment only   ·   10 / 20 / 30 / 50 guest coverage   ·   Page ")
    set_run(run, size=9, color=MUTED)
    add_page_field(fp)


def main():
    doc = Document()
    setup(doc)
    props = doc.core_properties
    props.title = "The Vedanta — Kitchen work formula and coverage"
    props.author = "Shyam, Head Chef"
    props.category = "Employment"
    props.comments = "Employment only. 35 years kitchen experience. Not an app document."

    k = doc.add_paragraph()
    k.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = k.add_run("EMPLOYMENT  ·  FROM THE HEAD CHEF  ·  NOT A THEORY PAPER")
    set_run(run, size=10, bold=True, color=GOLD)

    t = doc.add_paragraph()
    t.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = t.add_run("The Vedanta")
    set_run(run, size=28, bold=True, color=NAVY, font="Georgia")

    s = doc.add_paragraph()
    s.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = s.add_run("Kitchen work formula and coverage options")
    set_run(run, size=16, color=GOLD, font="Georgia")

    add_table(
        doc,
        ["Field", "Detail"],
        [
            ["From", "Shyam, Head Chef"],
            ["To", "Shannon, Louise (Duty Managers) and the General Manager"],
            ["Subject", "How the Kitchen actually works — coverage if the budget is tight"],
            ["Date", "7 September 2026"],
            ["Experience", "35 years in kitchens; chef, senior chef and executive chef at Avanti and The Vedanta"],
            ["This house", "Managed The Vedanta kitchen for 5½–6 years"],
        ],
    )
    callout(
        doc,
        "This is my work from the kitchen. Guest numbers are not fixed: 10, 20, 30, 50. "
        "If a rota line looks over-budget, use the lean option — not 07:00–21:00 with nobody on the board.",
    )

    heading(doc, "Email")
    body(doc, "Dear Shannon, Louise and [GM name],")
    body(
        doc,
        "I am writing this so we plan the Kitchen from the real job, not from a single guest number.",
    )
    body(
        doc,
        "I have worked in professional kitchens for 35 years — as chef, senior chef and executive chef — "
        "including Avanti and The Vedanta. I have managed The Vedanta kitchen for five and a half to six years. "
        "I know this house: HACCP, food safety, menus, ordering, and how the food has to change with the guest, "
        "the retreat and the staff who actually turn up.",
    )
    body(
        doc,
        "The guest number is not fixed. One week it is 10, then 20, then 30, then 50. Diets and allergens are "
        "often added on. Sometimes there is nobody on the Kitchen board, and I cover from 07:00 to 19:00, and "
        "on a heavy day through to 20:00 or 21:00, depending on the pressure and the work still left.",
    )
    body(
        doc,
        "If a line on the rota looks “over the budget”, I am not asking for luxury. I am asking for enough hands "
        "to cook the menu safely. Below is the step-by-step formula I use, and different coverage ideas for "
        "10, 20, 30 and 50 guests — including a leaner option for each, if money is tight.",
    )
    body(doc, "Please read this as the working picture from the Head Chef who runs the food.")
    body(doc, "Kind regards", italic=True)
    body(doc, "Shyam, Head Chef, The Vedanta")

    heading(doc, "1. What one dish really is")
    body(doc, "One dish on the menu is not one job. A single dish can have around ten elements:")
    numbered(
        doc,
        [
            "Collect and check the ingredient (date, quality, allergen).",
            "Wash.",
            "Peel / trim.",
            "Cut / chop to the recipe size.",
            "Weigh / measure to the recipe.",
            "Pre-cook or blanch.",
            "Make the sauce, dressing or finish.",
            "Garnish or second component.",
            "Plate or tray for handover.",
            "Wash the pot, board and tray — then label and date what is left.",
        ],
    )
    body(
        doc,
        "From starter to dessert we are often doing six different items — soup, salad, main, side, sauce, dessert. "
        "Each has a recipe. Each recipe must be calculated for that day’s guests, then every ingredient collected, then prepped.",
    )
    callout(doc, "6 items × 10 elements = 60 kitchen jobs before guest number, extra diets, washing, date checks, menu typing and close.")

    heading(doc, "2. The formula — how I programme the day")
    heading(doc, "Step 1 — Open safe", 2)
    for x in (
        "Clock in, uniform, hands.",
        "Fridge / freezer temperatures.",
        "Date-check every open label. Spot-check stock for today. Pull anything out of date.",
        "Note equipment faults and report them.",
    ):
        bullet(doc, x)
    body(doc, "This is HACCP. It is every day, 10 guests or 50.")

    heading(doc, "Step 2 — Lock the real number and the real diets", 2)
    for x in (
        "Confirm today’s guest count. It can be 10, 20, 30, 50 — and it can change.",
        "Confirm allergens and extra diets. Write them down. Verbal only at the pass is how mistakes happen.",
        "A diet added after prep has started is a new line of work, not a garnish.",
    ):
        bullet(doc, x)

    heading(doc, "Step 3 — Menu for this house, this day", 2)
    for x in (
        "Set the menu to the guest and to the staff who are actually in.",
        "If I have no support, the menu must be simpler. If I have 50 guests and six full items, I need hands.",
        "Type the menu. Print the menu. That is Kitchen time.",
    ):
        bullet(doc, x)

    heading(doc, "Step 4 — Calculate every recipe", 2)
    body(doc, "Ingredient qty today = recipe qty per portion × confirmed guests × yield factor, then plus each extra diet line.")
    body(doc, "If we skip this we either waste food or run out in service.")

    heading(doc, "Step 5 — Collect, then prep", 2)
    body(doc, "Collect every ingredient on the pick-list. Only then start the ten elements. Prep is the long part. Cooking is the visible part.")

    heading(doc, "Step 6 — Produce breakfast, lunch and dinner", 2)
    body(doc, "Finish to the recipe. Temperature and allergen check. Handover to Restaurant on time. Kitchen pot wash and reset. Restaurant owns guest-facing buffet and refreshment.")

    heading(doc, "Step 7 — Order, plan, print, clean", 2)
    body(doc, "Shortages onto the order list. Plan the next 48 hours against the next retreat number. Menu typing if it has changed. Cleaning, labelling, date-check again at close.")

    heading(doc, "Step 8 — Close, or keep going if the board is empty", 2)
    body(
        doc,
        "If there is no one on the Kitchen board, the same person who opened at 07:00 is still date-checking, "
        "washing and finishing dinner. That is how a day becomes 07:00–19:00 or 07:00–21:00. That is a gap, not a model.",
    )

    heading(doc, "3. How guest number changes the load")
    add_table(
        doc,
        ["Guests", "Factor", "On the floor"],
        [
            ["10", "1.0", "Full HACCP and full menu cycle. Fewer portions. Diet add-ons still hurt."],
            ["20", "1.6", "Normal working house. Two services overlap. Wash and prep are constant."],
            ["30", "2.2", "More trays, more diet lines, longer pot wash. One chef cannot also be the porter."],
            ["50", "3.2", "Retreat peak. Every element is multiplied. Close runs late unless support is real."],
        ],
    )
    body(doc, "Work score = (menu items × elements per item × guest factor) + diet add-ons.")
    body(doc, "Example, lunch at 20 guests, 6 items, 10 elements, 3 extra diet lines: 6 × 10 × 1.6 = 96, plus diets ≈ 99. The guests are 20. The jobs are not 20.")
    body(doc, "Each extra diet or allergen version is +0.5 to +1.0 extra dish — a separate collect, prep, cook and label.")

    heading(doc, "4. Coverage — recommended and leaner if budget is tight")
    body(doc, "If you think a line is over-given, use the lean option in that row. Do not use “no support and Shyam covers 07:00–21:00”.")

    heading(doc, "10 guests", 2)
    body(doc, "Recommended: 1 chef + a short 4-hour KA/KP window over the dirty period (after breakfast into lunch wash, or dinner close).")
    body(doc, "If budget is tight: 1 chef alone only if the menu is cut and diets are known the day before.")
    body(doc, "Different idea: chef 08:00–17:00; simpler dinner; Restaurant does all FOH wash. Do not cut the morning date-check.")

    heading(doc, "20 guests (normal house)", 2)
    body(doc, "Recommended: morning chef 07:00–16:00 + late chef 12:00–21:00. One chef owns lunch; the other uses overlap for handover, next prep and ordering. At least one full KA/KP window.")
    body(doc, "If budget is tight: 1 chef + 1 KA/KP on the dirty hours (split blocks or one 08:00–16:00). Second chef only on the heavier day of the week.")
    body(doc, "Different idea: two chef shifts on retreat-change days only; midweek stable 20-guest menu = 1 chef + 1 KA. Cook 20-guest quantities, not a 50-guest batch “in case”.")
    body(doc, "Do not cut a second pair of hands on at least one window. Do not roster 21:00 then 07:00.")

    heading(doc, "30 guests", 2)
    body(doc, "Recommended: two chef shifts + both KA/KP windows.")
    body(doc, "If budget is tight: two chefs + one KA/KP on the heavier window. Drop one extra element per dish.")
    body(doc, "Different idea: two chefs all week; KA/KP as casual/bank on arrival and departure days only.")
    body(doc, "Do not leave one chef at 30 covers with six full items.")

    heading(doc, "50 guests (peak)", 2)
    body(doc, "Recommended: two chefs + early and late KA/KP + extra hours on delivery day. Diet list locked 48 hours out if the office can give it.")
    body(doc, "If budget is tight: two chefs + two KA/KP windows, no extra FTE. Paid extra hours on the two peak days only, recorded. Fewer components on the menu.")
    body(doc, "Different idea: casual KP for wash only on 50-guest days (cheaper than a third chef), or a tighter menu that week (soup + main + dessert).")
    body(doc, "Do not ask one person to open at 07:00 and finish a 50-cover dinner.")

    heading(doc, "5. When there is nobody on the Kitchen board")
    add_table(
        doc,
        ["Situation", "What happens now", "What I need instead"],
        [
            ["No KA/KP on the board", "I cook and I wash. Close moves to 19:00–21:00.", "A short wash/prep window, or a simpler menu that day."],
            ["No second chef", "I cover 07:00 through dinner.", "A reliever on the opposite shift, or dinner simplified and an earlier close."],
            ["Number jumps 20 → 50", "Same staff, three times the trays.", "48-hour warning + casual KP or extra hours, recorded."],
            ["Diets added on the day", "New full prep line in the middle of service.", "Diets in writing the day before. Late add-on = simpler substitute, not a new à-la-carte line."],
        ],
    )
    callout(
        doc,
        "If there is no support, I will still run a safe menu. I will not run a 50-guest, six-item, ten-element menu as if the brigade were full.",
    )

    heading(doc, "6. What I am asking you to agree")
    numbered(
        doc,
        [
            "Plan from the formula (items × elements × guest factor + diets), not from “it is only 20 people”.",
            "Use the coverage table: recommended first; lean option if the budget is tight; never the empty-board 07:00–21:00 default.",
            "Give me the guest number and diet list in writing, and tell me when it changes.",
            "Accept that menu typing, recipe calculation, ordering, date checking and cleaning are daily Kitchen work.",
            "When the house jumps to 30 or 50, we either add hands or simplify the menu. Not both “full menu” and “no support”.",
        ],
    )
    body(doc, "I can run this house. I have done it for years. I am asking for a programmed way of covering it so the food stays safe and I am not the whole rota.")
    body(doc, "Shyam")
    body(doc, "Head Chef", after=0)
    body(doc, "The Vedanta")

    doc.save(OUT)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
