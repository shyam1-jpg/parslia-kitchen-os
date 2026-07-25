#!/usr/bin/env python3
"""Build a single polished Vedanta Kitchen combined risk assessment Word document."""

from datetime import date

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

# Brand colours
NAVY = RGBColor(0x1B, 0x3A, 0x4B)
TEAL = RGBColor(0x2F, 0x6F, 0x6A)
DARK = RGBColor(0x22, 0x22, 0x22)
MUTED = RGBColor(0x55, 0x55, 0x55)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT_ROW = "F3F7F6"
HEADER_BG = "1B3A4B"
ALT_HEADER = "2F6F6A"


def set_run(run, *, size=11, bold=False, color=DARK, font="Calibri"):
    run.font.name = font
    run._element.rPr.rFonts.set(qn("w:eastAsia"), font)
    run.font.size = Pt(size)
    run.bold = bold
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


def write_cell(cell, text, *, bold=False, color=DARK, size=10, center=False, fill=None):
    clear_paragraph(cell.paragraphs[0])
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER if center else WD_ALIGN_PARAGRAPH.LEFT
    run = p.add_run(text)
    set_run(run, size=size, bold=bold, color=color)
    if fill:
        shade_cell(cell, fill)
    set_cell_borders(cell)
    for paragraph in cell.paragraphs:
        paragraph.paragraph_format.space_before = Pt(2)
        paragraph.paragraph_format.space_after = Pt(2)


def add_heading_styled(doc, text, level=1):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(18 if level == 1 else 10)
    p.paragraph_format.space_after = Pt(8)
    run = p.add_run(text)
    if level == 1:
        set_run(run, size=16, bold=True, color=NAVY, font="Georgia")
    elif level == 2:
        set_run(run, size=13, bold=True, color=TEAL, font="Georgia")
    else:
        set_run(run, size=11, bold=True, color=NAVY)
    return p


def add_body(doc, text, *, bold=False, size=11, space_after=6):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
    run = p.add_run(text)
    set_run(run, size=size, bold=bold, color=DARK)
    return p


def add_bullet(doc, text):
    p = doc.add_paragraph(style="List Bullet")
    clear_paragraph(p)
    run = p.add_run(text)
    set_run(run, size=11, color=DARK)
    p.paragraph_format.space_after = Pt(3)
    return p


def add_numbered(doc, items):
    for i, item in enumerate(items, 1):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.left_indent = Cm(0.5)
        run = p.add_run(f"{i}. {item}")
        set_run(run, size=11, color=DARK)


def info_table(doc, rows):
    table = doc.add_table(rows=len(rows), cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True
    for i, (label, value) in enumerate(rows):
        write_cell(table.rows[i].cells[0], label, bold=True, size=10, fill=LIGHT_ROW, color=NAVY)
        write_cell(table.rows[i].cells[1], value, size=10)
        table.rows[i].cells[0].width = Cm(5.5)
        table.rows[i].cells[1].width = Cm(11)
    doc.add_paragraph()


def risk_table(doc, hazards):
    """hazards: list of (hazard, people, before, measures, after)"""
    table = doc.add_table(rows=1 + len(hazards), cols=5)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    headers = ["Hazard", "People at Risk", "Risk Before", "Control Measures", "Risk After"]
    for i, h in enumerate(headers):
        write_cell(table.rows[0].cells[i], h, bold=True, color=WHITE, size=9, center=True, fill=HEADER_BG)
    for r, row in enumerate(hazards, 1):
        fill = LIGHT_ROW if r % 2 == 0 else None
        for c, val in enumerate(row):
            write_cell(
                table.rows[r].cells[c],
                val,
                size=9,
                center=(c in (2, 4)),
                fill=fill,
                bold=(c in (2, 4)),
                color=TEAL if c in (2, 4) else DARK,
            )
    doc.add_paragraph()


def page_break(doc):
    doc.add_page_break()


def cover_page(doc):
    for _ in range(3):
        doc.add_paragraph()
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run("VEDANTA KITCHEN & RETREAT CENTRE")
    set_run(run, size=14, bold=True, color=TEAL, font="Georgia")

    main = doc.add_paragraph()
    main.alignment = WD_ALIGN_PARAGRAPH.CENTER
    main.paragraph_format.space_before = Pt(12)
    run = main.add_run("Combined Equipment &\nKitchen Risk Assessments")
    set_run(run, size=28, bold=True, color=NAVY, font="Georgia")

    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub.paragraph_format.space_before = Pt(18)
    run = sub.add_run(
        "A single reference pack covering kitchen equipment,\n"
        "catering operations, front-of-house, and food safety controls."
    )
    set_run(run, size=12, color=MUTED)

    meta = doc.add_paragraph()
    meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    meta.paragraph_format.space_before = Pt(36)
    run = meta.add_run(
        f"Assessor: Shyam Prasad\n"
        f"Location: The Vedanta Kitchen & Retreat Centre\n"
        f"Document date: {date.today().strftime('%d %B %Y')}\n"
        f"Review due: 04 November 2025"
    )
    set_run(run, size=11, color=DARK)

    note = doc.add_paragraph()
    note.alignment = WD_ALIGN_PARAGRAPH.CENTER
    note.paragraph_format.space_before = Pt(40)
    run = note.add_run(
        "Sources merged into this pack:\n"
        "Thermomix TM6 · Caso Ice Creamer · Ninja Hand Blender ·\n"
        "KitchenAid Professional Stand Mixer · Waring Stick Blender ·\n"
        "Knives / Mandoline / Slicers / Peelers ·\n"
        "Vedanta Kitchen, Catering Services, FOH & Generic Kitchen Assessments"
    )
    set_run(run, size=9, color=MUTED)
    page_break(doc)


def contents_page(doc, sections):
    add_heading_styled(doc, "Contents", 1)
    add_body(doc, "Use this pack as the master risk assessment file for kitchen and catering operations.")
    for i, name in enumerate(sections, 1):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(4)
        run = p.add_run(f"{i}.  {name}")
        set_run(run, size=11, color=DARK)
    page_break(doc)


def equipment_section(
    doc,
    title,
    brand,
    model,
    description,
    procedure,
    hazards,
    ppe,
    *,
    extra_notes=None,
):
    add_heading_styled(doc, title, 1)
    add_heading_styled(doc, "1. Equipment Information", 2)
    info_table(
        doc,
        [
            ("Location", "The Vedanta Kitchen & Retreat Centre"),
            ("Assessor", "Shyam Prasad"),
            ("Brand", brand),
            ("Model", model),
            ("Date Completed", date.today().strftime("%d/%m/%Y")),
            ("Review Date", "04/11/2025"),
        ],
    )

    add_heading_styled(doc, "2. Description of Equipment", 2)
    add_body(doc, description)

    add_heading_styled(doc, "3. Operating Procedure (How to Use)", 2)
    add_numbered(doc, procedure)

    add_heading_styled(doc, "4. Risk Assessment", 2)
    risk_table(doc, hazards)

    add_heading_styled(doc, "5. Required PPE", 2)
    for item in ppe:
        add_bullet(doc, item)

    if extra_notes:
        add_heading_styled(doc, "6. Additional Notes", 2)
        for note in extra_notes:
            add_bullet(doc, note)

    page_break(doc)


def area_section(doc, title, scope, hazards, controls, ppe, notes=None):
    add_heading_styled(doc, title, 1)
    add_heading_styled(doc, "1. Scope", 2)
    add_body(doc, scope)

    add_heading_styled(doc, "2. Key Information", 2)
    info_table(
        doc,
        [
            ("Location", "The Vedanta Kitchen & Retreat Centre"),
            ("Assessor", "Shyam Prasad"),
            ("Assessment type", "Area / activity risk assessment"),
            ("Date Completed", date.today().strftime("%d/%m/%Y")),
            ("Review Date", "04/11/2025"),
        ],
    )

    add_heading_styled(doc, "3. Risk Assessment", 2)
    risk_table(doc, hazards)

    add_heading_styled(doc, "4. Control Summary", 2)
    for c in controls:
        add_bullet(doc, c)

    add_heading_styled(doc, "5. Required PPE", 2)
    for item in ppe:
        add_bullet(doc, item)

    if notes:
        add_heading_styled(doc, "6. Additional Notes", 2)
        for n in notes:
            add_bullet(doc, n)

    page_break(doc)


def sign_off(doc):
    add_heading_styled(doc, "Document Control & Sign-Off", 1)
    add_body(
        doc,
        "This combined pack replaces the separate equipment and area risk assessment files listed on the cover. "
        "It should be reviewed after any incident, equipment change, or at least annually.",
    )
    info_table(
        doc,
        [
            ("Document owner", "Shyam Prasad"),
            ("Approved by", ""),
            ("Approval date", ""),
            ("Next review", "04/11/2025"),
            ("Version", "1.0 Combined Pack"),
        ],
    )
    add_heading_styled(doc, "Staff acknowledgement", 2)
    add_body(doc, "I confirm I have read and understood the relevant sections for equipment and tasks I use.")

    table = doc.add_table(rows=6, cols=3)
    for i, h in enumerate(["Name", "Role / Area", "Date / Signature"]):
        write_cell(table.rows[0].cells[i], h, bold=True, color=WHITE, size=10, center=True, fill=ALT_HEADER)
    for r in range(1, 6):
        for c in range(3):
            write_cell(table.rows[r].cells[c], "", size=10, fill=LIGHT_ROW if r % 2 == 0 else None)


def build():
    doc = Document()

    section = doc.sections[0]
    section.top_margin = Cm(1.8)
    section.bottom_margin = Cm(1.8)
    section.left_margin = Cm(2.0)
    section.right_margin = Cm(2.0)

    # Default style
    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style.font.size = Pt(11)

    section_titles = [
        "Thermomix TM6",
        "Caso Ice Creamer",
        "Ninja Hand Blender",
        "KitchenAid Professional Stand Mixer",
        "Waring Stick Blender",
        "Knives, Mandoline, Slicers & Peelers",
        "Vedanta Kitchen Risk Assessment",
        "Vedanta Catering Services Risk Assessment",
        "Vedanta Front of House & Kitchen Risk Assessment",
        "Vedanta Generic Kitchen Risk Assessment (June 2024)",
        "Document Control & Sign-Off",
    ]

    cover_page(doc)
    contents_page(doc, section_titles)

    # --- Thermomix TM6 ---
    equipment_section(
        doc,
        "Thermomix TM6 — Equipment Risk Assessment & Operating Procedures",
        "Thermomix",
        "TM6",
        "A multi-function cooking appliance used for chopping, blending, cooking, steaming, "
        "kneading and precise heating. Used for soups, sauces, doughs, purees and prepared dishes "
        "in bakery and catering production.",
        [
            "Place the Thermomix on a stable, dry, level work surface with adequate ventilation around the base.",
            "Ensure the mixing bowl is correctly seated and locked before use.",
            "Fit the correct blade or accessory for the task and secure the lid and measuring cup as required.",
            "Select the appropriate mode, temperature and speed for the recipe; do not exceed recommended fill levels.",
            "Keep hands, utensils and cloths away from the blade area while the machine is running.",
            "Allow hot contents to settle before opening the lid; open away from the face to avoid steam.",
            "Use the spatula only through the lid opening when the manufacturer instructions allow.",
            "Switch off and unplug before changing accessories, emptying the bowl or cleaning.",
            "Clean food-contact parts thoroughly after each use and follow HACCP hygiene controls.",
        ],
        [
            (
                "Blade contact / finger injury",
                "Staff",
                "High",
                "Never reach into the bowl while powered; lock lid; unplug before removing blade.",
                "Low",
            ),
            (
                "Steam / hot liquid burns",
                "Staff",
                "High",
                "Use correct temperature settings; open lid carefully; use oven cloths for hot bowls.",
                "Low",
            ),
            (
                "Electrical shock",
                "Staff",
                "Medium",
                "Inspect cable and base; keep area dry; unplug before cleaning.",
                "Low",
            ),
            (
                "Splash / ejection of hot contents",
                "Staff",
                "Medium",
                "Do not overfill; use measuring cup; start at low speed for hot liquids.",
                "Low",
            ),
            (
                "Food contamination",
                "Guests / Staff",
                "High",
                "Clean and sanitise bowl, lid and blade; separate raw and ready-to-eat use; follow HACCP.",
                "Low",
            ),
        ],
        [
            "Apron",
            "Non-slip footwear",
            "Heat-resistant gloves or cloths when handling hot bowls / steam",
        ],
    )

    # --- Caso Ice Creamer ---
    equipment_section(
        doc,
        "Caso Ice Creamer — Equipment Risk Assessment & Operating Procedures",
        "Caso",
        "Ice Creamer",
        "A countertop ice cream / frozen dessert machine used to churn and freeze ice cream, "
        "sorbet and similar products for catering and retreat service.",
        [
            "Position the machine on a stable, ventilated surface away from heat sources.",
            "Ensure the freezing bowl / canister is correctly pre-frozen or pre-chilled as per the manual.",
            "Assemble the paddle, lid and bowl securely before switching on.",
            "Prepare mix to the correct recipe and temperature; do not overfill the bowl.",
            "Start the machine and supervise during churning; do not leave unattended for long periods.",
            "Do not insert hands or utensils into the bowl while the paddle is moving.",
            "Switch off before removing the paddle or scraping the finished product.",
            "Transfer product with clean utensils into sanitised containers and store under correct temperature control.",
            "Clean all food-contact parts after use and dry thoroughly before storage.",
        ],
        [
            (
                "Finger entrapment in paddle",
                "Staff",
                "High",
                "Keep hands clear while running; switch off before scraping or removing paddle.",
                "Low",
            ),
            (
                "Cold burns / freezer bowl handling",
                "Staff",
                "Medium",
                "Handle frozen canister with dry cloths or gloves; do not touch with wet hands.",
                "Low",
            ),
            (
                "Electrical shock",
                "Staff",
                "Medium",
                "Keep cable and controls dry; inspect before use; unplug before cleaning.",
                "Low",
            ),
            (
                "Slips from spilled mix",
                "Staff",
                "Medium",
                "Wipe spills immediately; keep floor clear around machine.",
                "Low",
            ),
            (
                "Food contamination / temperature abuse",
                "Guests / Staff",
                "High",
                "Use clean utensils; chill finished product promptly; follow shelf-life and HACCP controls.",
                "Low",
            ),
        ],
        [
            "Apron",
            "Non-slip footwear",
            "Protective gloves when handling frozen canisters",
        ],
    )

    # --- Ninja Hand Blender ---
    equipment_section(
        doc,
        "Ninja Hand Blender — Equipment Risk Assessment & Operating Procedures",
        "Ninja",
        "Hand Blender",
        "A handheld immersion blender used for pureeing soups, sauces, dressings and soft mixtures "
        "directly in pans or containers.",
        [
            "Check the blender shaft, blade guard and cable before use; do not use if damaged.",
            "Ensure the pan or jug is stable and only partially filled to avoid splash-over.",
            "Fully immerse the blade guard in the food before switching on.",
            "Start on a low speed and keep the head submerged while blending.",
            "Never blend with the blade above the liquid surface or near the rim of a shallow pan.",
            "Do not insert fingers or utensils near the blade while powered.",
            "Switch off and unplug before removing the shaft or cleaning the blade.",
            "Allow hot liquids to cool slightly where practical to reduce splash risk.",
            "Wash detachable parts, sanitise, dry and store with blade guard protected.",
        ],
        [
            (
                "Blade cuts",
                "Staff",
                "High",
                "Keep hands clear; unplug before cleaning; store with guard / cover.",
                "Low",
            ),
            (
                "Hot liquid splash / burns",
                "Staff",
                "High",
                "Immerse fully before starting; blend gently; use tall containers where possible.",
                "Low",
            ),
            (
                "Electrical shock",
                "Staff",
                "Medium",
                "Keep motor body dry; never immerse the handle; inspect cable.",
                "Low",
            ),
            (
                "Dropped appliance / impact injury",
                "Staff",
                "Medium",
                "Use two hands for deep pans; dry grip; do not stretch cables across walkways.",
                "Low",
            ),
            (
                "Food contamination",
                "Guests / Staff",
                "High",
                "Clean and sanitise shaft and blade after each use; avoid cross-contamination.",
                "Low",
            ),
        ],
        [
            "Apron",
            "Non-slip footwear",
            "Cut-resistant glove recommended when washing the blade",
        ],
    )

    # --- KitchenAid (from user's screenshot content) ---
    equipment_section(
        doc,
        "KitchenAid Professional Stand Mixer — Equipment Risk Assessment & Operating Procedures",
        "KitchenAid",
        "Professional Stand Mixer",
        "A heavy-duty stand mixer used for mixing doughs, batters, creams and other food ingredients. "
        "Commonly used for bakery and catering production.",
        [
            "Ensure the mixer is placed on a stable, dry surface before use.",
            "Attach the correct tool (dough hook, whisk or flat beater) and lock the bowl securely.",
            "Add ingredients carefully; do not exceed the recommended bowl capacity.",
            "Start the mixer on the lowest speed and increase gradually as needed.",
            "Never insert hands, spatulas or utensils into the bowl while the mixer is operating.",
            "Stop the mixer completely before scraping the bowl or changing tools.",
            "Unplug the mixer before cleaning or removing attachments.",
            "Clean all food-contact parts thoroughly after each use.",
            "Store attachments safely when not in use.",
        ],
        [
            (
                "Finger entrapment",
                "Staff",
                "High",
                "Keep hands away from moving parts; ensure mixer is off when changing tools.",
                "Low",
            ),
            (
                "Electrical shock",
                "Staff",
                "Medium",
                "Inspect cables; keep hands dry; unplug before cleaning.",
                "Low",
            ),
            (
                "Cuts from whisk or hook edges",
                "Staff",
                "Medium",
                "Handle attachments carefully; unplug before removal.",
                "Low",
            ),
            (
                "Mixer movement during heavy loads",
                "Staff",
                "Medium",
                "Ensure stable surface; supervise during thick dough mixing.",
                "Low",
            ),
            (
                "Food contamination",
                "Guests / Staff",
                "High",
                "Clean thoroughly; sanitise food-contact parts; follow HACCP.",
                "Low",
            ),
        ],
        [
            "Apron",
            "Non-slip footwear",
            "Heat-resistant gloves (when working with warm mixtures)",
        ],
    )

    # --- Waring Stick Blender ---
    equipment_section(
        doc,
        "Waring Stick Blender — Equipment Risk Assessment & Operating Procedures",
        "Waring",
        "Stick / Immersion Blender",
        "A commercial stick blender used for blending soups, sauces and large-batch liquids "
        "in pots and deep containers within the kitchen.",
        [
            "Inspect the shaft, blade, switch and power cable before each use.",
            "Place the pot on a stable surface; do not overfill.",
            "Immerse the blade fully before switching on.",
            "Hold the blender with a firm grip; support the pot if needed.",
            "Blend at controlled speed to avoid splash-back of hot liquids.",
            "Never place hands near the blade while the unit is plugged in.",
            "Switch off and unplug before dismantling or washing.",
            "Clean immediately after use; sanitise food-contact surfaces.",
            "Store hanging or in a designated safe location with blade protected.",
        ],
        [
            (
                "Severe blade cuts",
                "Staff",
                "High",
                "Unplug before cleaning; never leave plugged-in blender unattended in a pot; use blade cover in storage.",
                "Low",
            ),
            (
                "Hot liquid burns / splash",
                "Staff",
                "High",
                "Start submerged; use deep pots; reduce speed for hot liquids.",
                "Low",
            ),
            (
                "Electrical shock",
                "Staff",
                "Medium",
                "Keep motor housing dry; check cable integrity; RCD-protected circuits where available.",
                "Low",
            ),
            (
                "Musculoskeletal strain",
                "Staff",
                "Medium",
                "Use correct posture; avoid extended one-handed use; take breaks on large batches.",
                "Low",
            ),
            (
                "Food contamination",
                "Guests / Staff",
                "High",
                "Clean and sanitise after each product; follow allergen and HACCP controls.",
                "Low",
            ),
        ],
        [
            "Apron",
            "Non-slip footwear",
            "Cut-resistant glove when washing blades",
        ],
        extra_notes=[
            "This section consolidates Risk_Assessment_Waring_Stick_Blender.docx and the duplicate “(1)” file.",
        ],
    )

    # --- Knives / Mandoline / Slicers / Peelers ---
    equipment_section(
        doc,
        "Knives, Mandoline, Slicers & Peelers — Risk Assessment & Safe Use",
        "Various",
        "Chef knives, mandoline, slicers and peelers",
        "Hand tools and small cutting equipment used for preparation of fruit, vegetables, meat "
        "and other ingredients. This section merges the Knives/Mandoline/Peelers and "
        "Knives/Slicers/Peelers assessments into one procedure.",
        [
            "Select the correct knife or tool for the task; check blades are clean and undamaged.",
            "Use a stable chopping board with a non-slip mat underneath.",
            "Keep fingers curled and clear of the blade path (claw grip).",
            "For mandoline / slicers: always use the hand guard or cut-resistant glove; never push product by hand.",
            "Cut away from the body; do not catch falling knives — let them drop.",
            "Wash knives individually; never leave blades loose in sinks under water.",
            "Store knives in a knife block, magnetic strip or sheath — not loose in drawers.",
            "Sharpen / hone as required; a dull blade increases slip risk.",
            "Report damaged tools and remove from service.",
        ],
        [
            (
                "Cuts / lacerations from knives",
                "Staff",
                "High",
                "Training on safe knife skills; claw grip; cut-resistant gloves for high-risk tasks; safe storage.",
                "Low",
            ),
            (
                "Severe cuts from mandoline / slicer",
                "Staff",
                "High",
                "Mandatory use of guard or cut-resistant glove; dismantle carefully for cleaning.",
                "Low",
            ),
            (
                "Cross-contamination (raw / allergens)",
                "Guests / Staff",
                "High",
                "Colour-coded boards and knives; wash between products; follow HACCP and allergen matrix.",
                "Low",
            ),
            (
                "Slips from peelings / waste on floor",
                "Staff",
                "Medium",
                "Clear waste regularly; wipe floors; use non-slip footwear.",
                "Low",
            ),
            (
                "Incorrect tool storage injuries",
                "Staff",
                "Medium",
                "Sheaths / magnetic strip / designated knife area; never leave in sinks.",
                "Low",
            ),
        ],
        [
            "Apron",
            "Non-slip footwear",
            "Cut-resistant gloves for mandoline, slicer and high-volume prep",
        ],
    )

    # --- Kitchen area ---
    area_section(
        doc,
        "Vedanta Kitchen Risk Assessment",
        "Covers general kitchen operations including food preparation, cooking, cleaning, "
        "storage, waste handling and staff movement within The Vedanta Kitchen.",
        [
            (
                "Slips, trips and falls",
                "Staff / Visitors",
                "High",
                "Clean spills immediately; clear walkways; non-slip mats; suitable footwear.",
                "Low",
            ),
            (
                "Burns from ovens, hobs, hot pans",
                "Staff",
                "High",
                "Use dry cloths / gloves; announce “hot”; keep pan handles turned inward.",
                "Low",
            ),
            (
                "Fire (oil, electrical, gas)",
                "Staff / Guests",
                "High",
                "Never leave fryers/pans unattended; know extinguisher types; fire training; extract cleaning.",
                "Low",
            ),
            (
                "Manual handling injuries",
                "Staff",
                "Medium",
                "Team lifts for heavy stock; use trolleys; training on safe lifting.",
                "Low",
            ),
            (
                "Food poisoning / contamination",
                "Guests",
                "High",
                "Temperature control; date labelling; cleaning schedules; allergen controls; HACCP.",
                "Low",
            ),
            (
                "Chemical exposure (cleaners)",
                "Staff",
                "Medium",
                "COSHH sheets; correct dilution; PPE; store chemicals away from food.",
                "Low",
            ),
        ],
        [
            "Maintain daily opening/closing cleaning checklists.",
            "Record fridge/freezer temperatures at required intervals.",
            "Keep first-aid kit and burn gel accessible.",
            "Report all near-misses and incidents.",
        ],
        [
            "Apron / chef whites",
            "Non-slip footwear",
            "Heat-resistant gloves / cloths as needed",
            "Gloves for cleaning chemicals",
        ],
    )

    # --- Catering services ---
    area_section(
        doc,
        "Vedanta Catering Services Risk Assessment",
        "Covers off-site and on-site catering service: transport of food, service set-up, "
        "hot holding, buffet/service lines, and breakdown.",
        [
            (
                "Temperature abuse during transport",
                "Guests",
                "High",
                "Use insulated boxes; hot-hold above 63°C or cold below 5°C; temperature logs.",
                "Low",
            ),
            (
                "Vehicle loading injuries / traffic risk",
                "Staff",
                "Medium",
                "Use trolleys; secure loads; park safely; two-person lifts for heavy items.",
                "Low",
            ),
            (
                "Burns / hot holding equipment",
                "Staff",
                "Medium",
                "Warn guests/staff of hot surfaces; use correct lids and gloves.",
                "Low",
            ),
            (
                "Allergen cross-contact at service",
                "Guests",
                "High",
                "Clear allergen labelling; separate utensils; trained service staff; guest enquiry process.",
                "Low",
            ),
            (
                "Slips at service points",
                "Staff / Guests",
                "Medium",
                "Manage cable runs; wipe spills; clear guest walkways.",
                "Low",
            ),
        ],
        [
            "Complete a service checklist before departure and on arrival.",
            "Keep probe thermometer and sanitising wipes with the catering kit.",
            "Return leftovers under temperature control or dispose per food safety policy.",
        ],
        [
            "Apron / service uniform",
            "Non-slip footwear",
            "Heat-resistant gloves for hot equipment",
            "Disposable gloves for ready-to-eat service where required",
        ],
    )

    # --- FOH and Kitchen ---
    area_section(
        doc,
        "Vedanta Front of House & Kitchen Risk Assessment",
        "Covers interaction between front-of-house and kitchen areas: service pass, guest areas, "
        "beverage service, and shared walkways during service periods.",
        [
            (
                "Collision in pass / corridor",
                "Staff",
                "Medium",
                "Keep-left / call-outs (“behind”, “hot”); keep floors clear; limit congestion.",
                "Low",
            ),
            (
                "Hot plate / spill burns at pass",
                "Staff",
                "Medium",
                "Use dry cloths; communicate plate status; stable stacking.",
                "Low",
            ),
            (
                "Guest slips in dining areas",
                "Guests / Staff",
                "Medium",
                "Prompt spill response; suitable mats at entrances; clear trailing cables.",
                "Low",
            ),
            (
                "Broken glass / crockery",
                "Staff / Guests",
                "Medium",
                "Clear immediately with dustpan; dispose in glass bin; cordon if needed.",
                "Low",
            ),
            (
                "Allergen information failure",
                "Guests",
                "High",
                "Up-to-date allergen matrix; FOH trained to check with kitchen; never guess.",
                "Low",
            ),
        ],
        [
            "FOH and kitchen brief before busy service.",
            "Keep emergency exits and fire routes clear at all times.",
            "Ensure allergen folder / matrix is current for the day’s menu.",
        ],
        [
            "Non-slip footwear",
            "Service apron where required",
            "Gloves for clearing waste / glass",
        ],
    )

    # --- Generic kitchen June 2024 ---
    area_section(
        doc,
        "Vedanta Generic Kitchen Risk Assessment (June 2024)",
        "General kitchen hazards and standard controls for The Vedanta Kitchen & Retreat Centre, "
        "based on the June 2024 generic kitchen risk assessment. Use alongside equipment-specific sheets.",
        [
            (
                "General kitchen injury (cuts, burns, strains)",
                "Staff",
                "High",
                "Induction training; supervision of new staff; safe systems of work; PPE.",
                "Low",
            ),
            (
                "Electrical equipment faults",
                "Staff",
                "Medium",
                "Visual checks before use; PAT testing schedule; remove defective kit from service.",
                "Low",
            ),
            (
                "Poor housekeeping",
                "Staff / Guests",
                "Medium",
                "Clean-as-you-go; end-of-day deep clean; designated storage for tools and stock.",
                "Low",
            ),
            (
                "Pest activity",
                "Guests / Staff",
                "Medium",
                "Seal food; waste control; report sightings; pest contractor visits.",
                "Low",
            ),
            (
                "Inadequate first aid response",
                "Staff / Guests",
                "Medium",
                "Trained first aiders; stocked kit; incident reporting forms available.",
                "Low",
            ),
        ],
        [
            "Review this generic assessment whenever menus, staffing or layout change.",
            "Keep SDS / COSHH information accessible for all cleaning chemicals.",
            "Link this pack to staff induction and refresher training records.",
        ],
        [
            "Apron",
            "Non-slip footwear",
            "Task-specific gloves (heat, cut, chemical)",
        ],
        notes=[
            "Source file reference: Vedanta generic kitchen risk assessments June 2024 (AutoRecovered).",
            "Where an equipment sheet and this generic sheet both apply, follow the stricter control.",
        ],
    )

    sign_off(doc)

    out = "/workspace/vedanta-risk-assessments/Vedanta_Combined_Kitchen_Risk_Assessments.docx"
    doc.save(out)
    print(out)


if __name__ == "__main__":
    build()
