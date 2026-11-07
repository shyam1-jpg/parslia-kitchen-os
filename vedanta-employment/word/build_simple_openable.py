#!/usr/bin/env python3
"""Build files that open on a normal PC: RTF (Word/WordPad) and a clean simple .docx.

The python-docx files can fail to open (customXml / stylesWithEffects).
These copies do not use those parts.
"""

from __future__ import annotations

import zipfile
from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED

HERE = Path(__file__).resolve().parent
PACK = HERE.parent / "SAVE-TO-YOUR-DESKTOP"
DESKTOP = Path("/home/ubuntu/Desktop")
ART = Path("/opt/cursor/artifacts")


def rtf_escape(text: str) -> str:
    text = text.replace("\\", r"\\").replace("{", r"\{").replace("}", r"\}")
    out = []
    for ch in text:
        code = ord(ch)
        if ch == "\n":
            out.append(r"\par ")
        elif code < 128:
            out.append(ch)
        else:
            out.append(rf"\u{code}?")
    return "".join(out)


def rtf_p(text: str, *, bold=False, size=22, space_after=120, color=None) -> str:
    bits = [rf"\pard\sa{space_after}\sl276\slmult1\f0\fs{size}"]
    if color:
        bits.append(rf"\cf{color}")
    if bold:
        bits.append(r"\b")
    bits.append(" ")
    bits.append(rtf_escape(text))
    bits.append(r"\b0\cf0\par")
    return "".join(bits)


def write_rtf(path: Path) -> None:
    parts = [
        r"{\rtf1\ansi\ansicpg1252\deff0\deflang2057",
        r"{\fonttbl{\f0\fswiss\fcharset0 Calibri;}{\f1\froman\fcharset0 Georgia;}}",
        r"{\colortbl ;\red47\green74\blue50;\red138\green115\blue74;\red26\green26\blue26;}",
        r"\paperw11909\paperh16834\margl1134\margr1134\margt1134\margb1134",
        rtf_p("THE VEDANTA  ·  EMPLOYMENT  ·  YASHAR", bold=True, size=20, color=2),
        rtf_p("Yashar — what you have to do", bold=True, size=36, color=1),
        rtf_p(
            "Follow Head Chef Shyam’s kitchen programme. Learn it, then do it in this order every shift."
        ),
        rtf_p(
            "You follow the daily. You do not skip date-check. You do not skip the recipe. 20 guests is not 20 jobs.",
            bold=True,
        ),
        rtf_p("1. What you have to do", bold=True, size=28, color=1),
        rtf_p("1. Open the kitchen safe (temps + date check) before you cook."),
        rtf_p("2. Confirm today’s guest number and today’s diets — they change (10, 20, 30, 50)."),
        rtf_p("3. Follow today’s menu and recipes — do not guess."),
        rtf_p("4. For every dish: calculate, collect, prep, cook, label, wash."),
        rtf_p("5. Help breakfast, lunch and dinner be ready on time."),
        rtf_p("6. Clean as you go. Date-check again at close."),
        rtf_p("7. If you are the only person on the board, say so early. Do not silently work 07:00 to 21:00."),
        rtf_p("8. Kitchen = food on the pass. Tea, buffet dressing and dining-room wash are not your default job."),
        rtf_p("2. What you have to learn", bold=True, size=28, color=1),
        rtf_p("One dish is about 10 jobs. If you only cook, you are late."),
        rtf_p("Starter to dessert is often 6 items — six recipes, not one pot."),
        rtf_p("Guests are not fixed: 10, 20, 30 or 50. Prep today’s number, not last week’s 50."),
        rtf_p("Extra diets = extra work. Write them down."),
        rtf_p("Recipe first: calculate each ingredient, then collect, then prep."),
        rtf_p("HACCP every day: temps and date-check, 10 guests or 50."),
        rtf_p("If the board is empty, you cook and wash. Ask for a wash window or a simpler menu."),
        rtf_p("3. How to follow the daily (in this order)", bold=True, size=28, color=1),
        rtf_p("Arrive: clock in, uniform, hands, read the day board."),
        rtf_p("Step 1 — Open safe: temps, date-check, pull out-of-date food, report broken kit."),
        rtf_p("Step 2 — Lock today’s number and diets in writing before big prep."),
        rtf_p("Step 3 — Cook this menu for this guest count with this staff. Alone = simpler menu."),
        rtf_p("Step 4 — Calculate: portion x today’s guests, then add each extra diet line."),
        rtf_p("Step 5 — Collect the pick-list first, then wash, cut and weigh."),
        rtf_p("Step 6 — Breakfast, lunch, dinner. Handover on time. Wash Kitchen pots."),
        rtf_p("Step 7 — Write shortages, clean, label, date-check again."),
        rtf_p("Step 8 — Close. A chef who finishes at 21:00 is not on at 07:00 the next day."),
        rtf_p("4. Your clock", bold=True, size=28, color=1),
        rtf_p("Morning 07:00-16:00 — open, breakfast, lunch, handover."),
        rtf_p("Late 12:00-21:00 — handover, dinner, Kitchen close."),
        rtf_p("Early KA/KP 07:00-15:00 — prep support, deliveries, Kitchen wash."),
        rtf_p("Late KA/KP 15:00-22:00 — dinner support and Kitchen close."),
        rtf_p("10 guests = same steps, fewer portions. 30 or 50 = you cannot be chef and porter."),
        rtf_p("5. This week", bold=True, size=28, color=1),
        rtf_p("Day 1-2: shadow the open. Count the ten elements on one dish."),
        rtf_p("Day 3-5: calculate one recipe. Collect a full pick-list. Run Kitchen wash in service."),
        rtf_p("Week 2: lead one prep block. Write a handover. Diet swap only from the written list."),
        rtf_p("6. If you get stuck", bold=True, size=28, color=1),
        rtf_p("No guest number: stop big prep. Ask Shyam or the Duty Manager."),
        rtf_p("Diet added in service: tell Shyam. Simple substitute if he says so."),
        rtf_p("You are alone on a full menu: say it. Safe small menu beats a late unsafe menu."),
        rtf_p("Asked to do Restaurant wash while Kitchen pots are out: Kitchen pots first."),
        rtf_p("Asked to start at 07:00 after a 21:00 finish: no. Tell Shyam or the Duty Manager."),
        rtf_p(
            "Kitchen owns the food. Restaurant owns guest-facing dining and refreshment. Yashar follows the daily in order."
        ),
        "}",
    ]
    path.write_bytes("\n".join(parts).encode("ascii", "replace"))


def w_p(text: str, *, bold=False, size="22", color="1A1A1A") -> str:
    b = "<w:b/>" if bold else ""
    return (
        "<w:p>"
        "<w:pPr><w:spacing w:after=\"120\"/></w:pPr>"
        "<w:r>"
        f"<w:rPr>{b}<w:sz w:val=\"{size}\"/><w:szCs w:val=\"{size}\"/>"
        f"<w:color w:val=\"{color}\"/>"
        "<w:rFonts w:ascii=\"Calibri\" w:hAnsi=\"Calibri\" w:eastAsia=\"Calibri\"/>"
        "</w:rPr>"
        f"<w:t xml:space=\"preserve\">{escape(text)}</w:t>"
        "</w:r></w:p>"
    )


def write_simple_docx(path: Path) -> None:
    body = "".join(
        [
            w_p("THE VEDANTA  ·  EMPLOYMENT  ·  YASHAR", bold=True, size="20", color="8A734A"),
            w_p("Yashar — what you have to do", bold=True, size="36", color="2F4A32"),
            w_p("Follow Head Chef Shyam’s kitchen programme. Learn it, then do it in this order every shift."),
            w_p(
                "You follow the daily. You do not skip date-check. You do not skip the recipe. 20 guests is not 20 jobs.",
                bold=True,
            ),
            w_p("1. What you have to do", bold=True, size="28", color="2F4A32"),
            w_p("1. Open the kitchen safe (temps + date check) before you cook."),
            w_p("2. Confirm today’s guest number and today’s diets — they change (10, 20, 30, 50)."),
            w_p("3. Follow today’s menu and recipes — do not guess."),
            w_p("4. For every dish: calculate, collect, prep, cook, label, wash."),
            w_p("5. Help breakfast, lunch and dinner be ready on time."),
            w_p("6. Clean as you go. Date-check again at close."),
            w_p("7. If you are the only person on the board, say so early. Do not silently work 07:00 to 21:00."),
            w_p("8. Kitchen = food on the pass. Tea, buffet dressing and dining-room wash are not your default job."),
            w_p("2. What you have to learn", bold=True, size="28", color="2F4A32"),
            w_p("One dish is about 10 jobs. If you only cook, you are late."),
            w_p("Starter to dessert is often 6 items — six recipes, not one pot."),
            w_p("Guests are not fixed: 10, 20, 30 or 50. Prep today’s number, not last week’s 50."),
            w_p("Extra diets = extra work. Write them down."),
            w_p("Recipe first: calculate each ingredient, then collect, then prep."),
            w_p("HACCP every day: temps and date-check, 10 guests or 50."),
            w_p("If the board is empty, you cook and wash. Ask for a wash window or a simpler menu."),
            w_p("3. How to follow the daily (in this order)", bold=True, size="28", color="2F4A32"),
            w_p("Arrive: clock in, uniform, hands, read the day board."),
            w_p("Step 1 — Open safe: temps, date-check, pull out-of-date food, report broken kit."),
            w_p("Step 2 — Lock today’s number and diets in writing before big prep."),
            w_p("Step 3 — Cook this menu for this guest count with this staff. Alone = simpler menu."),
            w_p("Step 4 — Calculate: portion x today’s guests, then add each extra diet line."),
            w_p("Step 5 — Collect the pick-list first, then wash, cut and weigh."),
            w_p("Step 6 — Breakfast, lunch, dinner. Handover on time. Wash Kitchen pots."),
            w_p("Step 7 — Write shortages, clean, label, date-check again."),
            w_p("Step 8 — Close. A chef who finishes at 21:00 is not on at 07:00 the next day."),
            w_p("4. Your clock", bold=True, size="28", color="2F4A32"),
            w_p("Morning 07:00-16:00 — open, breakfast, lunch, handover."),
            w_p("Late 12:00-21:00 — handover, dinner, Kitchen close."),
            w_p("Early KA/KP 07:00-15:00 — prep support, deliveries, Kitchen wash."),
            w_p("Late KA/KP 15:00-22:00 — dinner support and Kitchen close."),
            w_p("10 guests = same steps, fewer portions. 30 or 50 = you cannot be chef and porter."),
            w_p("5. This week", bold=True, size="28", color="2F4A32"),
            w_p("Day 1-2: shadow the open. Count the ten elements on one dish."),
            w_p("Day 3-5: calculate one recipe. Collect a full pick-list. Run Kitchen wash in service."),
            w_p("Week 2: lead one prep block. Write a handover. Diet swap only from the written list."),
            w_p("6. If you get stuck", bold=True, size="28", color="2F4A32"),
            w_p("No guest number: stop big prep. Ask Shyam or the Duty Manager."),
            w_p("Diet added in service: tell Shyam. Simple substitute if he says so."),
            w_p("You are alone on a full menu: say it. Safe small menu beats a late unsafe menu."),
            w_p("Asked to do Restaurant wash while Kitchen pots are out: Kitchen pots first."),
            w_p("Asked to start at 07:00 after a 21:00 finish: no. Tell Shyam or the Duty Manager."),
            w_p("Kitchen owns the food. Restaurant owns guest-facing dining and refreshment. Yashar follows the daily in order."),
        ]
    )
    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f"<w:body>{body}"
        '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'
        '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/>'
        "</w:sectPr></w:body></w:document>"
    )
    styles_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri"/>
      <w:sz w:val="22"/><w:szCs w:val="22"/>
    </w:rPr></w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/><w:qFormat/>
  </w:style>
</w:styles>
"""
    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>
"""
    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>
"""
    doc_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
"""
    core = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
 xmlns:dc="http://purl.org/dc/elements/1.1/"
 xmlns:dcterms="http://purl.org/dc/terms/"
 xmlns:dcmitype="http://purl.org/dc/dcmitype/"
 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Yashar — follow the daily</dc:title>
  <dc:creator>The Vedanta Kitchen</dc:creator>
  <cp:lastModifiedBy>The Vedanta Kitchen</cp:lastModifiedBy>
  <cp:revision>1</cp:revision>
</cp:coreProperties>
"""
    app = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Microsoft Office Word</Application>
  <DocSecurity>0</DocSecurity>
  <Pages>2</Pages>
  <Words>500</Words>
</Properties>
"""
    path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path, "w", ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("_rels/.rels", rels)
        z.writestr("word/document.xml", document_xml)
        z.writestr("word/styles.xml", styles_xml)
        z.writestr("word/_rels/document.xml.rels", doc_rels)
        z.writestr("docProps/core.xml", core)
        z.writestr("docProps/app.xml", app)


def main() -> None:
    PACK.mkdir(parents=True, exist_ok=True)
    DESKTOP.mkdir(parents=True, exist_ok=True)

    rtf = PACK / "OPEN_THIS_Yashar_Follow.rtf"
    docx = PACK / "OPEN_THIS_Yashar_Follow.docx"
    write_rtf(rtf)
    write_simple_docx(docx)

    html_src = HERE.parent / "print" / "Yashar-Daily-Follow.html"
    html_dst = PACK / "OPEN_THIS_Yashar_Follow.html"
    if html_src.exists():
        html_dst.write_bytes(html_src.read_bytes())

    howto = PACK / "HOW-TO-OPEN.txt"
    howto.write_text(
        "If the old Word file will not open, use THESE files instead.\n\n"
        "1. First try:  OPEN_THIS_Yashar_Follow.rtf\n"
        "   Double-click it. Word or WordPad will open it.\n"
        "   Then File > Save As > Desktop > Word Document (*.docx) if you want.\n\n"
        "2. Or double-click:  OPEN_THIS_Yashar_Follow.docx\n"
        "   This is a simple Word file (no extra parts).\n\n"
        "3. If Word is not on the computer:  OPEN_THIS_Yashar_Follow.html\n"
        "   Double-click. It opens in your internet browser. Print it from there.\n\n"
        "Do not use the old .dotx file. Do not open a web preview of the file.\n"
        "Right-click the downloaded file > Open with > Word  or  WordPad.\n",
        encoding="utf-8",
    )

    for src in (rtf, docx, html_dst, howto):
        if src.exists():
            (DESKTOP / src.name).write_bytes(src.read_bytes())
            try:
                ART.mkdir(parents=True, exist_ok=True)
                (ART / src.name).write_bytes(src.read_bytes())
            except OSError:
                pass

    print("Wrote", rtf, rtf.stat().st_size)
    print("Wrote", docx, docx.stat().st_size)
    with zipfile.ZipFile(docx) as z:
        assert z.testzip() is None
        names = z.namelist()
        assert "customXml/item1.xml" not in names
        assert "word/stylesWithEffects.xml" not in names
    print("clean docx parts:", names)


if __name__ == "__main__":
    main()
