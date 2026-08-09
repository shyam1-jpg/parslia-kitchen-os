#!/usr/bin/env python3
"""Generate Parslia Kitchen OS App Store iPhone screenshots at Apple sizes."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "app-store-screenshots"
ARTIFACTS = Path("/opt/cursor/artifacts/app-store-screenshots")

GREEN = (6, 63, 50)
GREEN_DEEP = (4, 42, 34)
GREEN_MID = (10, 79, 64)
COPPER = (184, 115, 51)
CREAM = (243, 235, 224)
CREAM_CARD = (255, 249, 241)
INK = (27, 42, 36)
MUTED = (107, 94, 78)
WHITE = (255, 255, 255)
SIDEBAR = (5, 46, 38)

SERIF = "/usr/share/fonts/truetype/noto/NotoSerif-Bold.ttf"
SERIF_REG = "/usr/share/fonts/truetype/noto/NotoSerif-Regular.ttf"
SANS = "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf"
SANS_BOLD = "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"

SIZES = {
    "1284x2778": (1284, 2778),
    "1242x2688": (1242, 2688),
}

SHOTS = [
    {
        "id": "01-recipe-library",
        "tagline": "Every recipe, costed & compliant",
        "screen": "library",
        "nav": "Recipe Library",
    },
    {
        "id": "02-dashboard",
        "tagline": "Today's kitchen at a glance",
        "screen": "dashboard",
        "nav": "Home",
    },
    {
        "id": "03-ai-image",
        "tagline": "AI Image for menus & boards",
        "screen": "ai-image",
        "nav": "AI Image",
    },
    {
        "id": "04-ai-voice",
        "tagline": "Find recipes by voice",
        "screen": "ai-voice",
        "nav": "AI Voice",
    },
    {
        "id": "05-menu-planner",
        "tagline": "Plan breakfast to events",
        "screen": "menu",
        "nav": "Menus",
    },
    {
        "id": "06-allergens",
        "tagline": "Nutrition & allergens, done right",
        "screen": "allergens",
        "nav": "Nutrition & Allergens",
    },
    {
        "id": "07-portions",
        "tagline": "Scale portions with confidence",
        "screen": "portions",
        "nav": "Portions",
    },
    {
        "id": "08-compliance",
        "tagline": "Logs that keep you audit-ready",
        "screen": "logs",
        "nav": "Logs",
    },
    {
        "id": "09-stock",
        "tagline": "Stock & suppliers, calm and clear",
        "screen": "stock",
        "nav": "Stock",
    },
    {
        "id": "10-rota",
        "tagline": "Rota that fits the kitchen",
        "screen": "rota",
        "nav": "Rota",
    },
]

NAV = [
    "Home",
    "Dashboard",
    "Recipe Library",
    "Nutrition & Allergens",
    "AI Image",
    "AI Voice",
    "Menus",
    "Portions",
    "Logs",
    "Stock",
    "Rota",
    "Settings",
]


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def rounded_rect(draw: ImageDraw.ImageDraw, xy, radius: int, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def draw_food_circle(img: Image.Image, cx: int, cy: int, r: int, seed: int):
    draw = ImageDraw.Draw(img)
    colors = [
        ((210, 150, 70), (150, 80, 35)),
        ((180, 90, 55), (120, 45, 30)),
        ((120, 150, 70), (70, 100, 40)),
        ((200, 120, 60), (130, 65, 35)),
        ((160, 70, 50), (100, 40, 30)),
        ((190, 140, 70), (120, 85, 40)),
    ]
    c1, c2 = colors[seed % len(colors)]
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(244, 237, 227))
    inner = int(r * 0.86)
    draw.ellipse((cx - inner, cy - inner, cx + inner, cy + inner), fill=c2)
    # soft highlight
    hr = int(r * 0.28)
    draw.ellipse((cx - r * 0.35 - hr // 2, cy - r * 0.25 - hr // 2,
                  cx - r * 0.35 + hr // 2, cy - r * 0.25 + hr // 2), fill=(*c1, ))
    # plate rim
    draw.ellipse((cx - inner, cy - inner, cx + inner, cy + inner), outline=(255, 255, 255, 40), width=2)


def text_center(draw, xy, text, fnt, fill):
    draw.text(xy, text, font=fnt, fill=fill, anchor="mm")


def wrap_text(draw, text, fnt, max_width):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textlength(trial, font=fnt) <= max_width:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def draw_background(img: Image.Image):
    w, h = img.size
    px = img.load()
    cx, cy = w // 2, int(h * 0.42)
    max_d = (cx ** 2 + cy ** 2) ** 0.5
    for y in range(h):
        t = y / max(h - 1, 1)
        base_r = int(GREEN_MID[0] * (1 - t) + GREEN_DEEP[0] * t)
        base_g = int(GREEN_MID[1] * (1 - t) + GREEN_DEEP[1] * t)
        base_b = int(GREEN_MID[2] * (1 - t) + GREEN_DEEP[2] * t)
        for x in range(w):
            # soft yellow-green glow behind phone
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 / max_d
            glow = max(0.0, 1.0 - d * 1.35) ** 2 * 0.22
            r = int(base_r * (1 - glow) + 180 * glow)
            g = int(base_g * (1 - glow) + 190 * glow)
            b = int(base_b * (1 - glow) + 90 * glow)
            px[x, y] = (r, g, b, 255) if img.mode == "RGBA" else (r, g, b)


def draw_phone_chrome(base: Image.Image, phone_box):
    x0, y0, x1, y1 = phone_box
    phone_w, phone_h = x1 - x0, y1 - y0
    radius = int(phone_w * 0.11)
    # drop shadow
    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle(
        (x0 + 8, y0 + 18, x1 + 8, y1 + 28),
        radius=radius,
        fill=(0, 0, 0, 90),
    )
    base.alpha_composite(shadow)

    draw = ImageDraw.Draw(base)
    # metal frame
    rounded_rect(draw, phone_box, radius, fill=(26, 26, 26))
    # silver rim (App Store marketing frame)
    rounded_rect(
        draw,
        phone_box,
        radius,
        fill=None,
        outline=(198, 198, 200),
        width=max(3, phone_w // 180),
    )
    inset = max(8, phone_w // 55)
    screen = (x0 + inset, y0 + inset, x1 - inset, y1 - inset)
    screen_r = max(24, radius - inset)
    rounded_rect(draw, screen, screen_r, fill=CREAM)

    # dynamic island
    iw = int(phone_w * 0.28)
    ih = int(phone_w * 0.07)
    ix = (x0 + x1) // 2 - iw // 2
    iy = y0 + inset + int(phone_w * 0.03)
    rounded_rect(draw, (ix, iy, ix + iw, iy + ih), ih // 2, fill=(10, 10, 10))
    return screen


def draw_sidebar(img, box, active: str, scale: float):
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(img)
    draw.rectangle(box, fill=SIDEBAR)
    f_brand = font(SERIF, max(28, int(40 * scale)))
    f_nav = font(SANS, max(11, int(13 * scale)))
    # Large P mark like the marketing frames
    draw.text((x0 + 14, y0 + int(10 * scale)), "P", font=f_brand, fill=WHITE)

    y = y0 + int(70 * scale)
    pad = max(3, int(5 * scale))
    for item in NAV:
        h = max(24, int(28 * scale))
        label = item if len(item) < 18 else item[:16] + "…"
        if item == active:
            rounded_rect(
                draw,
                (x0 + 6, y, x1 - 6, y + h),
                8,
                fill=COPPER,
            )
            draw.text((x0 + 12, y + h // 2), label, font=f_nav, fill=WHITE, anchor="lm")
        else:
            draw.text((x0 + 12, y + h // 2), label, font=f_nav, fill=(210, 225, 218), anchor="lm")
        y += h + pad
        if y > y1 - 20:
            break


def draw_rows(draw, box, rows, scale, accent_idxs=None):
    accent_idxs = accent_idxs or set()
    x0, y0, x1, y1 = box
    f = font(SANS, max(13, int(16 * scale)))
    fb = font(SANS_BOLD, max(13, int(16 * scale)))
    y = y0
    row_h = max(40, int(48 * scale))
    gap = max(8, int(10 * scale))
    for i, (left, right) in enumerate(rows):
        fill = (255, 240, 220) if i in accent_idxs else CREAM_CARD
        outline = (220, 180, 130) if i in accent_idxs else (230, 220, 205)
        rounded_rect(draw, (x0, y, x1, y + row_h), 12, fill=fill, outline=outline)
        draw.text((x0 + 14, y + row_h // 2), left, font=f, fill=INK, anchor="lm")
        draw.text((x1 - 14, y + row_h // 2), right, font=fb, fill=GREEN, anchor="rm")
        y += row_h + gap
        if y + row_h > y1:
            break


def draw_library(img, box, scale):
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(img)
    fh = font(SERIF, max(22, int(30 * scale)))
    fs = font(SANS, max(12, int(14 * scale)))
    draw.text((x0, y0), "Recipe Library", font=fh, fill=GREEN)
    draw.text((x0, y0 + int(36 * scale)), "Costed · scaled · allergen-ready", font=fs, fill=MUTED)

    recipes = [
        ("Herb roast chicken", "£4.20 / portion", 0),
        ("Coconut dal bowl", "£2.10 / portion", 1),
        ("Lemon linguine", "£3.40 / portion", 2),
        ("Root veg curry", "£2.80 / portion", 3),
        ("Sattvic khichdi", "£1.90 / portion", 4),
        ("Garden risotto", "£3.15 / portion", 5),
    ]
    top = y0 + int(70 * scale)
    gap = max(8, int(12 * scale))
    col_w = (x1 - x0 - gap) // 2
    card_h = max(150, int(175 * scale))
    fn = font(SANS_BOLD, max(11, int(13 * scale)))
    fp = font(SANS, max(10, int(12 * scale)))
    fpill = font(SANS, max(9, int(10 * scale)))

    for i, (name, price, seed) in enumerate(recipes):
        col = i % 2
        row = i // 2
        cx0 = x0 + col * (col_w + gap)
        cy0 = top + row * (card_h + gap)
        if cy0 + card_h > y1:
            break
        rounded_rect(draw, (cx0, cy0, cx0 + col_w, cy0 + card_h), 14, fill=CREAM_CARD, outline=(230, 220, 205))
        # food
        fr = min(col_w, card_h) // 3
        draw_food_circle(img, cx0 + col_w // 2, cy0 + int(18 * scale) + fr, fr, seed)
        ty = cy0 + int(18 * scale) + fr * 2 + int(12 * scale)
        draw.text((cx0 + 10, ty), name, font=fn, fill=GREEN)
        draw.text((cx0 + 10, ty + int(18 * scale)), price, font=fp, fill=COPPER)
        # pills
        py = ty + int(40 * scale)
        for j, label in enumerate(("Allergens", "Tags")):
            tw = int(draw.textlength(label, font=fpill)) + 12
            px = cx0 + 10 + j * (tw + 6)
            rounded_rect(draw, (px, py, px + tw, py + int(18 * scale)), 9, fill=(230, 236, 230))
            draw.text((px + tw // 2, py + int(9 * scale)), label, font=fpill, fill=(53, 88, 76), anchor="mm")


def draw_dashboard(img, box, scale):
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(img)
    fh = font(SERIF, max(22, int(30 * scale)))
    fs = font(SANS, max(12, int(14 * scale)))
    draw.text((x0, y0), "Today's kitchen", font=fh, fill=GREEN)
    draw.text((x0, y0 + int(36 * scale)), "Service · prep · compliance", font=fs, fill=MUTED)
    rows = [
        ("Lunch covers", "142"),
        ("Recipes in play", "18"),
        ("Fridge checks due", "2"),
        ("Allergen alerts", "Clear"),
    ]
    content = (x0, y0 + int(70 * scale), x1, y1 - int(140 * scale))
    draw_rows(draw, content, rows, scale, accent_idxs={3})
    # panel
    py0 = y1 - int(120 * scale)
    rounded_rect(draw, (x0, py0, x1, y1 - 4), 16, fill=GREEN)
    f1 = font(SERIF, max(18, int(24 * scale)))
    f2 = font(SANS, max(12, int(15 * scale)))
    draw.text((x0 + 16, py0 + int(18 * scale)), "Next service", font=f1, fill=WHITE)
    draw.text((x0 + 16, py0 + int(52 * scale)), "Retreat lunch · 12:30 · Hall A", font=f2, fill=WHITE)
    draw.text((x0 + 16, py0 + int(78 * scale)), "Menu locked · costs approved", font=f2, fill=(200, 220, 210))


def draw_ai_image(img, box, scale):
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(img)
    fh = font(SERIF, max(22, int(30 * scale)))
    fs = font(SANS, max(12, int(14 * scale)))
    draw.text((x0, y0), "AI Image", font=fh, fill=GREEN)
    draw.text((x0, y0 + int(36 * scale)), "Dish photos for menus & training", font=fs, fill=MUTED)

    # Preview plate card
    preview_top = y0 + int(70 * scale)
    preview_h = int(280 * scale)
    rounded_rect(
        draw,
        (x0, preview_top, x1, preview_top + preview_h),
        16,
        fill=CREAM_CARD,
        outline=(230, 220, 205),
    )
    cx = (x0 + x1) // 2
    cy = preview_top + preview_h // 2 - int(10 * scale)
    draw_food_circle(img, cx, cy, int(95 * scale), 0)

    card_y = preview_top + preview_h + int(16 * scale)
    card_h = min(int(160 * scale), y1 - card_y - 4)
    rounded_rect(draw, (x0, card_y, x1, card_y + card_h), 16, fill=CREAM_CARD, outline=(230, 220, 205))
    fl = font(SANS_BOLD, max(11, int(13 * scale)))
    fn = font(SANS_BOLD, max(16, int(20 * scale)))
    fp = font(SANS, max(12, int(14 * scale)))
    draw.text((x0 + 16, card_y + int(22 * scale)), "GENERATED", font=fl, fill=COPPER)
    draw.text((x0 + 16, card_y + int(54 * scale)), "Lemon herb pasta", font=fn, fill=GREEN)
    draw.text((x0 + 16, card_y + int(86 * scale)), "Ready for board · print · menu", font=fp, fill=MUTED)
    # action pills
    fpill = font(SANS, max(10, int(12 * scale)))
    py = card_y + int(120 * scale)
    for j, label in enumerate(("Regenerate", "Save to library")):
        tw = int(draw.textlength(label, font=fpill)) + 16
        px = x0 + 16 + j * (tw + 8)
        if px + tw < x1 - 8:
            rounded_rect(draw, (px, py, px + tw, py + int(22 * scale)), 11, fill=(230, 236, 230))
            draw.text((px + tw // 2, py + int(11 * scale)), label, font=fpill, fill=(53, 88, 76), anchor="mm")


def draw_ai_voice(img, box, scale):
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(img)
    fh = font(SERIF, max(22, int(30 * scale)))
    fs = font(SANS, max(12, int(14 * scale)))
    draw.text((x0, y0), "AI Voice Finder", font=fh, fill=GREEN)
    draw.text((x0, y0 + int(36 * scale)), "Hands-free during prep", font=fs, fill=MUTED)

    cx = (x0 + x1) // 2
    cy = y0 + int(160 * scale)
    r = int(70 * scale)
    draw.ellipse((cx - r - 18, cy - r - 18, cx + r + 18, cy + r + 18), outline=(220, 180, 130), width=3)
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=GREEN)
    # mic body
    draw.rounded_rectangle((cx - 12, cy - 28, cx + 12, cy + 10), 12, fill=WHITE)
    draw.arc((cx - 28, cy - 8, cx + 28, cy + 36), 0, 180, fill=WHITE, width=3)
    draw.line((cx, cy + 36, cx, cy + 50), fill=WHITE, width=3)
    draw.line((cx - 16, cy + 50, cx + 16, cy + 50), fill=WHITE, width=3)

    fq = font(SERIF, max(14, int(18 * scale)))
    q = '"Find gluten-free lunch recipes under £3"'
    lines = wrap_text(draw, q, fq, x1 - x0)
    ty = cy + r + int(40 * scale)
    for line in lines:
        draw.text(((x0 + x1) // 2, ty), line, font=fq, fill=GREEN, anchor="mm")
        ty += int(26 * scale)

    results = [
        ("Coconut dal bowl", "£2.10"),
        ("Sattvic khichdi", "£1.90"),
        ("Root veg curry", "£2.80"),
    ]
    draw_rows(draw, (x0, ty + 10, x1, y1), results, scale)


def draw_menu(img, box, scale):
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(img)
    fh = font(SERIF, max(22, int(30 * scale)))
    fs = font(SANS, max(12, int(14 * scale)))
    draw.text((x0, y0), "Menu planner", font=fh, fill=GREEN)
    draw.text((x0, y0 + int(36 * scale)), "Breakfast · lunch · dinner · events", font=fs, fill=MUTED)
    days = [
        ("Mon", ["Oat porridge", "Herb chicken", "Dal & rice"], False),
        ("Tue", ["Fruit bowl", "Linguine", "Khichdi"], False),
        ("Wed", ["Yogurt pots", "Risotto", "Curry night"], True),
        ("Thu", ["Overnight oats", "Garden bowl", "Pasta bake"], False),
    ]
    fday = font(SANS_BOLD, max(14, int(18 * scale)))
    fitem = font(SANS, max(12, int(14 * scale)))
    y = y0 + int(70 * scale)
    for day, items, on in days:
        h = int(96 * scale)
        fill = (255, 240, 220) if on else CREAM_CARD
        outline = (220, 180, 130) if on else (230, 220, 205)
        rounded_rect(draw, (x0, y, x1, y + h), 14, fill=fill, outline=outline)
        draw.text((x0 + 16, y + h // 2), day, font=fday, fill=GREEN, anchor="lm")
        iy = y + int(16 * scale)
        for item in items:
            draw.text((x0 + int(80 * scale), iy), item, font=fitem, fill=INK)
            iy += int(22 * scale)
        y += h + int(12 * scale)
        if y + h > y1:
            break


def draw_allergen_icon(draw, cx, cy, r, kind, style="filled"):
    """Simple circular nutrition / free-from icons."""
    if style == "filled":
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=COPPER)
        ink = WHITE
    elif style == "outline-brown":
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(140, 100, 60), width=max(2, r // 8))
        ink = (140, 100, 60)
    else:
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(140, 140, 140), width=max(2, r // 8))
        ink = (120, 120, 120)

    # glyph
    if kind == "flame":
        draw.polygon(
            [(cx, cy - r // 2), (cx - r // 3, cy + r // 5), (cx, cy + r // 2), (cx + r // 3, cy + r // 5)],
            fill=ink,
        )
    elif kind == "grain":
        draw.ellipse((cx - r // 3, cy - r // 2, cx + r // 3, cy + r // 2), fill=ink)
    elif kind == "drop":
        draw.polygon([(cx, cy - r // 2), (cx - r // 3, cy), (cx, cy + r // 2), (cx + r // 3, cy)], fill=ink)
    elif kind == "slash":
        # peanut / allergen with diagonal free-from slash
        draw.ellipse((cx - r // 3, cy - r // 3, cx + r // 3, cy + r // 3), outline=ink, width=max(2, r // 10))
        draw.line((cx - r // 2, cy + r // 2, cx + r // 2, cy - r // 2), fill=ink, width=max(2, r // 8))
    else:
        draw.ellipse((cx - r // 4, cy - r // 4, cx + r // 4, cy + r // 4), fill=ink)
        if style != "filled":
            draw.line((cx - r // 2, cy + r // 2, cx + r // 2, cy - r // 2), fill=ink, width=max(2, r // 8))


def draw_allergens(img, box, scale):
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(img)
    fh = font(SERIF, max(20, int(26 * scale)))
    draw.text((x0, y0), "Nutrition & Allergens", font=fh, fill=GREEN)

    # Nutrition stats card
    card_y = y0 + int(48 * scale)
    card_h = int(150 * scale)
    rounded_rect(draw, (x0, card_y, x1, card_y + card_h), 16, fill=WHITE, outline=(230, 220, 205))
    stats = [
        ("Calories", "590 kcal"),
        ("Protein", "3.3 g"),
        ("Carbs", "23.0 g"),
        ("Fat", "0.3 g"),
    ]
    fl = font(SANS, max(11, int(13 * scale)))
    fv = font(SANS_BOLD, max(14, int(18 * scale)))
    col_w = (x1 - x0) // 2
    for i, (label, value) in enumerate(stats):
        col = i % 2
        row = i // 2
        cx = x0 + col * col_w + col_w // 2
        cy = card_y + int(28 * scale) + row * int(60 * scale)
        draw.text((cx, cy), label, font=fl, fill=MUTED, anchor="mm")
        draw.text((cx, cy + int(24 * scale)), value, font=fv, fill=GREEN, anchor="mm")

    # Icon grids
    icons_top = card_y + card_h + int(28 * scale)
    r = max(16, int(22 * scale))
    gap_x = (x1 - x0) // 5
    # Row 1 filled copper nutrition icons
    row1 = ["flame", "grain", "grain", "drop", "grain"]
    for i, kind in enumerate(row1):
        cx = x0 + gap_x // 2 + i * gap_x
        draw_allergen_icon(draw, cx, icons_top, r, kind, "filled")
    # Row 2 brown free-from
    row2_y = icons_top + int(60 * scale)
    for i in range(5):
        cx = x0 + gap_x // 2 + i * gap_x
        draw_allergen_icon(draw, cx, row2_y, r, "slash", "outline-brown")
    # Row 3 grey free-from
    row3_y = row2_y + int(60 * scale)
    if row3_y + r < y1:
        for i in range(5):
            cx = x0 + gap_x // 2 + i * gap_x
            draw_allergen_icon(draw, cx, row3_y, r, "dot", "outline-grey")


def draw_portions(img, box, scale):
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(img)
    fh = font(SERIF, max(22, int(30 * scale)))
    fs = font(SANS, max(12, int(14 * scale)))
    draw.text((x0, y0), "Portions", font=fh, fill=GREEN)
    draw.text((x0, y0 + int(36 * scale)), "Scale for 12 or 120", font=fs, fill=MUTED)
    card = (x0, y0 + int(90 * scale), x1, y1 - int(20 * scale))
    rounded_rect(draw, card, 20, fill=CREAM_CARD, outline=(230, 220, 205))
    fbig = font(SERIF, max(72, int(110 * scale)))
    fl = font(SANS_BOLD, max(14, int(18 * scale)))
    fm = font(SANS, max(12, int(15 * scale)))
    cx = (x0 + x1) // 2
    draw.text((cx, card[1] + int(80 * scale)), "48", font=fbig, fill=GREEN, anchor="mm")
    draw.text((cx, card[1] + int(160 * scale)), "COVERS", font=fl, fill=COPPER, anchor="mm")
    # bar
    bx0, bx1 = x0 + 30, x1 - 30
    by = card[1] + int(200 * scale)
    rounded_rect(draw, (bx0, by, bx1, by + 12), 6, fill=(230, 236, 230))
    fill_w = int((bx1 - bx0) * 0.72)
    # gradient-ish copper/green bar
    rounded_rect(draw, (bx0, by, bx0 + fill_w, by + 12), 6, fill=COPPER)
    draw.text((bx0, by + 36), "Cost / cover £3.42", font=fm, fill=INK)
    draw.text((bx1, by + 36), "Food cost 28%", font=fm, fill=INK, anchor="ra")


def draw_logs(img, box, scale):
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(img)
    fh = font(SERIF, max(22, int(30 * scale)))
    fs = font(SANS, max(12, int(14 * scale)))
    draw.text((x0, y0), "Kitchen logs", font=fh, fill=GREEN)
    draw.text((x0, y0 + int(36 * scale)), "Fridge · freezer · cleaning", font=fs, fill=MUTED)
    rows = [
        ("Walk-in fridge", "2.1°C · 07:40"),
        ("Freezer 1", "−18.4°C · 07:42"),
        ("Cleaning schedule", "Due 14:00"),
        ("Probe calibration", "Passed"),
    ]
    draw_rows(draw, (x0, y0 + int(70 * scale), x1, y1), rows, scale, accent_idxs={2})


def draw_stock(img, box, scale):
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(img)
    fh = font(SERIF, max(22, int(30 * scale)))
    fs = font(SANS, max(12, int(14 * scale)))
    draw.text((x0, y0), "Stock & suppliers", font=fh, fill=GREEN)
    draw.text((x0, y0 + int(36 * scale)), "What you have · what to order", font=fs, fill=MUTED)
    rows = [
        ("Basmati rice", "42 kg"),
        ("Coconut milk", "Low"),
        ("Olive oil", "18 L"),
        ("Fresh coriander", "On order"),
        ("Chickpeas", "26 kg"),
    ]
    draw_rows(draw, (x0, y0 + int(70 * scale), x1, y1), rows, scale, accent_idxs={1})


def draw_rota(img, box, scale):
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(img)
    fh = font(SERIF, max(22, int(30 * scale)))
    fs = font(SANS, max(12, int(14 * scale)))
    draw.text((x0, y0), "Staff rota", font=fh, fill=GREEN)
    draw.text((x0, y0 + int(36 * scale)), "Who's on · who's covering", font=fs, fill=MUTED)
    rows = [
        ("Chef de partie", "06:00–14:00"),
        ("Commis", "07:00–15:00"),
        ("Pastry", "08:00–16:00"),
        ("Service lead", "10:00–18:00"),
        ("Porter", "11:00–19:00"),
    ]
    draw_rows(draw, (x0, y0 + int(70 * scale), x1, y1), rows, scale, accent_idxs={3})


SCREEN_FN = {
    "library": draw_library,
    "dashboard": draw_dashboard,
    "ai-image": draw_ai_image,
    "ai-voice": draw_ai_voice,
    "menu": draw_menu,
    "allergens": draw_allergens,
    "portions": draw_portions,
    "logs": draw_logs,
    "stock": draw_stock,
    "rota": draw_rota,
}


def render_shot(shot: dict, width: int, height: int) -> Image.Image:
    img = Image.new("RGBA", (width, height), GREEN)
    draw_background(img)
    draw = ImageDraw.Draw(img)

    scale = width / 1284
    # Brand header
    f_title = font(SERIF, max(28, int(42 * scale)))
    f_tag = font(SERIF, max(34, int(52 * scale)))
    draw.text((width // 2, int(70 * scale)), "Parslia Kitchen OS", font=f_title, fill=WHITE, anchor="mm")

    tag_lines = wrap_text(draw, shot["tagline"], f_tag, int(width * 0.86))
    ty = int(130 * scale)
    for line in tag_lines:
        draw.text((width // 2, ty), line, font=f_tag, fill=WHITE, anchor="mm")
        ty += int(58 * scale)

    # Phone
    phone_w = int(width * 0.78)
    phone_h = int(height * 0.70)
    px0 = (width - phone_w) // 2
    py0 = int(height * 0.26)
    # keep phone bottom padded
    if py0 + phone_h > height - int(40 * scale):
        phone_h = height - py0 - int(40 * scale)
    phone_box = (px0, py0, px0 + phone_w, py0 + phone_h)
    screen = draw_phone_chrome(img, phone_box)
    sx0, sy0, sx1, sy1 = screen

    # content inset below island
    content_top = sy0 + int(phone_w * 0.12)
    side_w = int((sx1 - sx0) * 0.34)
    side_box = (sx0, content_top, sx0 + side_w, sy1)
    main_box = (
        sx0 + side_w + int(14 * scale),
        content_top + int(4 * scale),
        sx1 - int(12 * scale),
        sy1 - int(12 * scale),
    )

    # paint sidebar region with rounded left already cream — fill left strip
    draw_sidebar(img, side_box, shot["nav"], scale)

    # main content on cream
    SCREEN_FN[shot["screen"]](img, main_box, scale)

    return img.convert("RGB")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    manifest = []

    for size_name, (w, h) in SIZES.items():
        size_dir = OUT / size_name
        size_dir.mkdir(parents=True, exist_ok=True)
        art_dir = ARTIFACTS / size_name
        art_dir.mkdir(parents=True, exist_ok=True)

        for shot in SHOTS:
            out = size_dir / f"{shot['id']}.png"
            print(f"Rendering {size_name}/{shot['id']} ({w}x{h})...")
            im = render_shot(shot, w, h)
            assert im.size == (w, h), im.size
            im.save(out, "PNG", optimize=True)
            art = art_dir / f"{shot['id']}.png"
            im.save(art, "PNG", optimize=True)
            manifest.append(
                {
                    "file": str(out.relative_to(ROOT)),
                    "artifact": str(art),
                    "size": list(im.size),
                    "id": shot["id"],
                    "tagline": shot["tagline"],
                }
            )
            print(f"  -> {im.size}  {out.stat().st_size // 1024}KB")

    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
    (ARTIFACTS / "manifest.json").write_text(json.dumps(manifest, indent=2))
    (OUT / "README.md").write_text(
        """# Parslia App Store iPhone screenshots

Apple App Store Connect accepted sizes:

- **1284 × 2778 px** (portrait) — folder `1284x2778/`
- **1242 × 2688 px** (portrait) — folder `1242x2688/`

Upload all 10 PNGs from **one** size folder into App Store Connect → Screenshots → iPhone.

Suggested order:
1. Recipe Library — Every recipe, costed & compliant
2. Dashboard — Today's kitchen at a glance
3. AI Image — AI Image for menus & boards
4. AI Voice Finder — Find recipes by voice
5. Menu planner — Plan breakfast to events
6. Allergens — Allergen control built in
7. Portions — Scale portions with confidence
8. Kitchen logs — Logs that keep you audit-ready
9. Stock & suppliers — Stock & suppliers, calm and clear
10. Staff rota — Rota that fits the kitchen

Brand: green `#063F32`, copper `#B87333`.

Regenerate:
```bash
python3 scripts/app-store-shots/generate.py
```
"""
    )
    print("Done.")


if __name__ == "__main__":
    main()
