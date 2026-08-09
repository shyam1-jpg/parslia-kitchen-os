#!/usr/bin/env python3
"""Generate Parslia Kitchen OS Mac App Store screenshots (16:10 Apple sizes)."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "app-store-screenshots" / "mac"
ARTIFACTS = Path("/opt/cursor/artifacts/app-store-screenshots/mac")

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
SANS = "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf"
SANS_BOLD = "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"

# Apple Mac App Store accepted sizes (16:10)
SIZES = {
    "2560x1600": (2560, 1600),
    "1280x800": (1280, 800),
}

SHOTS = [
    {"id": "01-recipe-library", "tagline": "Every recipe, costed & compliant", "screen": "library", "nav": "Recipe Library"},
    {"id": "02-dashboard", "tagline": "Today's kitchen at a glance", "screen": "dashboard", "nav": "Home"},
    {"id": "03-ai-image", "tagline": "AI Image for menus & boards", "screen": "ai-image", "nav": "AI Image"},
    {"id": "04-ai-voice", "tagline": "Find recipes by voice", "screen": "ai-voice", "nav": "AI Voice"},
    {"id": "05-menu-planner", "tagline": "Plan breakfast to events", "screen": "menu", "nav": "Menus"},
    {"id": "06-allergens", "tagline": "Nutrition & allergens, done right", "screen": "allergens", "nav": "Nutrition & Allergens"},
    {"id": "07-portions", "tagline": "Scale portions with confidence", "screen": "portions", "nav": "Portions"},
    {"id": "08-compliance", "tagline": "Logs that keep you audit-ready", "screen": "logs", "nav": "Logs"},
    {"id": "09-stock", "tagline": "Stock & suppliers, calm and clear", "screen": "stock", "nav": "Stock"},
    {"id": "10-rota", "tagline": "Rota that fits the kitchen", "screen": "rota", "nav": "Rota"},
]

NAV = [
    "Home", "Dashboard", "Recipe Library", "Nutrition & Allergens",
    "AI Image", "AI Voice", "Menus", "Portions", "Logs", "Stock", "Rota", "Settings",
]


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def rounded_rect(draw, xy, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


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
    cx, cy = w // 2, int(h * 0.48)
    max_d = (cx ** 2 + (h * 0.6) ** 2) ** 0.5
    for y in range(h):
        t = y / max(h - 1, 1)
        br = int(GREEN_MID[0] * (1 - t) + GREEN_DEEP[0] * t)
        bg = int(GREEN_MID[1] * (1 - t) + GREEN_DEEP[1] * t)
        bb = int(GREEN_MID[2] * (1 - t) + GREEN_DEEP[2] * t)
        for x in range(w):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 / max_d
            glow = max(0.0, 1.0 - d * 1.4) ** 2 * 0.20
            r = int(br * (1 - glow) + 180 * glow)
            g = int(bg * (1 - glow) + 190 * glow)
            b = int(bb * (1 - glow) + 90 * glow)
            px[x, y] = (r, g, b)


def draw_mac_window(base: Image.Image, box):
    """Draw a macOS-style window chrome; return content area."""
    x0, y0, x1, y1 = box
    w = x1 - x0
    title_h = max(28, int(w * 0.028))
    radius = max(14, int(w * 0.012))

    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((x0 + 10, y0 + 14, x1 + 10, y1 + 18), radius=radius, fill=(0, 0, 0, 80))
    base.alpha_composite(shadow)

    draw = ImageDraw.Draw(base)
    rounded_rect(draw, box, radius, fill=(40, 40, 42))
    # title bar
    rounded_rect(draw, (x0, y0, x1, y0 + title_h + radius), radius, fill=(55, 55, 58))
    draw.rectangle((x0, y0 + title_h, x1, y0 + title_h + radius + 2), fill=(55, 55, 58))
    # traffic lights
    cy = y0 + title_h // 2
    r = max(5, title_h // 5)
    for i, color in enumerate(((255, 95, 86), (255, 189, 46), (39, 201, 63))):
        cx = x0 + int(w * 0.02) + i * (r * 3)
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=color)
    # title
    f = font(SANS, max(11, int(title_h * 0.42)))
    draw.text(((x0 + x1) // 2, cy), "Parslia Kitchen OS", font=f, fill=(220, 220, 220), anchor="mm")

    content = (x0 + 2, y0 + title_h, x1 - 2, y1 - 2)
    rounded_rect(draw, content, max(8, radius - 4), fill=CREAM)
    # square off top of content under title bar
    draw.rectangle((content[0], content[1], content[2], content[1] + 12), fill=CREAM)
    return content


def draw_sidebar(img, box, active, scale):
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(img)
    draw.rectangle(box, fill=SIDEBAR)
    f_brand = font(SERIF, max(22, int(28 * scale)))
    f_nav = font(SANS, max(12, int(14 * scale)))
    draw.text((x0 + 16, y0 + 14), "P", font=f_brand, fill=WHITE)
    y = y0 + int(56 * scale)
    for item in NAV:
        h = max(26, int(30 * scale))
        label = item if len(item) < 22 else item[:20] + "…"
        if item == active:
            rounded_rect(draw, (x0 + 8, y, x1 - 8, y + h), 8, fill=COPPER)
            draw.text((x0 + 16, y + h // 2), label, font=f_nav, fill=WHITE, anchor="lm")
        else:
            draw.text((x0 + 16, y + h // 2), label, font=f_nav, fill=(210, 225, 218), anchor="lm")
        y += h + max(3, int(4 * scale))
        if y > y1 - 20:
            break


def draw_rows(draw, box, rows, scale, accent_idxs=None):
    accent_idxs = accent_idxs or set()
    x0, y0, x1, y1 = box
    f = font(SANS, max(13, int(15 * scale)))
    fb = font(SANS_BOLD, max(13, int(15 * scale)))
    y = y0
    row_h = max(42, int(48 * scale))
    gap = max(8, int(10 * scale))
    for i, (left, right) in enumerate(rows):
        fill = (255, 240, 220) if i in accent_idxs else CREAM_CARD
        outline = (220, 180, 130) if i in accent_idxs else (230, 220, 205)
        rounded_rect(draw, (x0, y, x1, y + row_h), 12, fill=fill, outline=outline)
        draw.text((x0 + 16, y + row_h // 2), left, font=f, fill=INK, anchor="lm")
        draw.text((x1 - 16, y + row_h // 2), right, font=fb, fill=GREEN, anchor="rm")
        y += row_h + gap
        if y + row_h > y1:
            break


def draw_food(img, cx, cy, r, seed):
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
    hr = int(r * 0.28)
    draw.ellipse((cx - r * 0.35 - hr // 2, cy - r * 0.25 - hr // 2,
                  cx - r * 0.35 + hr // 2, cy - r * 0.25 + hr // 2), fill=c1)


def draw_library(img, box, scale):
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(img)
    draw.text((x0, y0), "Recipe Library", font=font(SERIF, max(24, int(32 * scale))), fill=GREEN)
    draw.text((x0, y0 + int(38 * scale)), "Costed · scaled · allergen-ready", font=font(SANS, max(12, int(14 * scale))), fill=MUTED)
    recipes = [
        ("Herb roast chicken", "£4.20 / portion", 0),
        ("Coconut dal bowl", "£2.10 / portion", 1),
        ("Lemon linguine", "£3.40 / portion", 2),
        ("Root veg curry", "£2.80 / portion", 3),
        ("Sattvic khichdi", "£1.90 / portion", 4),
        ("Garden risotto", "£3.15 / portion", 5),
    ]
    top = y0 + int(70 * scale)
    gap = max(10, int(14 * scale))
    cols = 3
    col_w = (x1 - x0 - gap * (cols - 1)) // cols
    card_h = max(160, int(200 * scale))
    fn = font(SANS_BOLD, max(12, int(14 * scale)))
    fp = font(SANS, max(11, int(13 * scale)))
    for i, (name, price, seed) in enumerate(recipes):
        col, row = i % cols, i // cols
        cx0 = x0 + col * (col_w + gap)
        cy0 = top + row * (card_h + gap)
        if cy0 + card_h > y1:
            break
        rounded_rect(draw, (cx0, cy0, cx0 + col_w, cy0 + card_h), 14, fill=CREAM_CARD, outline=(230, 220, 205))
        fr = min(col_w, card_h) // 4
        draw_food(img, cx0 + col_w // 2, cy0 + int(20 * scale) + fr, fr, seed)
        ty = cy0 + int(28 * scale) + fr * 2
        draw.text((cx0 + 12, ty), name, font=fn, fill=GREEN)
        draw.text((cx0 + 12, ty + int(22 * scale)), price, font=fp, fill=COPPER)


def draw_dashboard(img, box, scale):
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(img)
    draw.text((x0, y0), "Today's kitchen", font=font(SERIF, max(24, int(32 * scale))), fill=GREEN)
    draw.text((x0, y0 + int(38 * scale)), "Service · prep · compliance", font=font(SANS, max(12, int(14 * scale))), fill=MUTED)
    rows = [("Lunch covers", "142"), ("Recipes in play", "18"), ("Fridge checks due", "2"), ("Allergen alerts", "Clear")]
    draw_rows(draw, (x0, y0 + int(70 * scale), x1, y1 - int(120 * scale)), rows, scale, {3})
    py0 = y1 - int(100 * scale)
    rounded_rect(draw, (x0, py0, x1, y1 - 4), 16, fill=GREEN)
    draw.text((x0 + 18, py0 + int(18 * scale)), "Next service", font=font(SERIF, max(18, int(22 * scale))), fill=WHITE)
    draw.text((x0 + 18, py0 + int(52 * scale)), "Retreat lunch · 12:30 · Hall A — menu locked · costs approved",
              font=font(SANS, max(12, int(14 * scale))), fill=(200, 220, 210))


def draw_ai_image(img, box, scale):
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(img)
    draw.text((x0, y0), "AI Image", font=font(SERIF, max(24, int(32 * scale))), fill=GREEN)
    draw.text((x0, y0 + int(38 * scale)), "Dish photos for menus & training", font=font(SANS, max(12, int(14 * scale))), fill=MUTED)
    preview_top = y0 + int(70 * scale)
    preview_h = int(min(320 * scale, (y1 - y0) * 0.45))
    rounded_rect(draw, (x0, preview_top, x1, preview_top + preview_h), 16, fill=CREAM_CARD, outline=(230, 220, 205))
    draw_food(img, (x0 + x1) // 2, preview_top + preview_h // 2, int(90 * scale), 0)
    card_y = preview_top + preview_h + int(16 * scale)
    rounded_rect(draw, (x0, card_y, x1, min(y1 - 4, card_y + int(120 * scale))), 16, fill=CREAM_CARD, outline=(230, 220, 205))
    draw.text((x0 + 18, card_y + int(20 * scale)), "GENERATED", font=font(SANS_BOLD, max(11, int(13 * scale))), fill=COPPER)
    draw.text((x0 + 18, card_y + int(48 * scale)), "Lemon herb pasta", font=font(SANS_BOLD, max(16, int(20 * scale))), fill=GREEN)
    draw.text((x0 + 18, card_y + int(80 * scale)), "Ready for board · print · menu", font=font(SANS, max(12, int(14 * scale))), fill=MUTED)


def draw_ai_voice(img, box, scale):
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(img)
    draw.text((x0, y0), "AI Voice Finder", font=font(SERIF, max(24, int(32 * scale))), fill=GREEN)
    draw.text((x0, y0 + int(38 * scale)), "Hands-free during prep", font=font(SANS, max(12, int(14 * scale))), fill=MUTED)
    cx, cy = (x0 + x1) // 2, y0 + int(150 * scale)
    r = int(60 * scale)
    draw.ellipse((cx - r - 16, cy - r - 16, cx + r + 16, cy + r + 16), outline=(220, 180, 130), width=3)
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=GREEN)
    draw.rounded_rectangle((cx - 10, cy - 24, cx + 10, cy + 8), 10, fill=WHITE)
    draw.arc((cx - 24, cy - 6, cx + 24, cy + 30), 0, 180, fill=WHITE, width=3)
    fq = font(SERIF, max(14, int(18 * scale)))
    q = '"Find gluten-free lunch recipes under £3"'
    ty = cy + r + int(36 * scale)
    for line in wrap_text(draw, q, fq, x1 - x0):
        draw.text(((x0 + x1) // 2, ty), line, font=fq, fill=GREEN, anchor="mm")
        ty += int(26 * scale)
    draw_rows(draw, (x0, ty + 8, x1, y1), [
        ("Coconut dal bowl", "£2.10"),
        ("Sattvic khichdi", "£1.90"),
        ("Root veg curry", "£2.80"),
    ], scale)


def draw_menu(img, box, scale):
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(img)
    draw.text((x0, y0), "Menu planner", font=font(SERIF, max(24, int(32 * scale))), fill=GREEN)
    draw.text((x0, y0 + int(38 * scale)), "Breakfast · lunch · dinner · events", font=font(SANS, max(12, int(14 * scale))), fill=MUTED)
    days = [
        ("Mon", ["Oat porridge", "Herb chicken", "Dal & rice"], False),
        ("Tue", ["Fruit bowl", "Linguine", "Khichdi"], False),
        ("Wed", ["Yogurt pots", "Risotto", "Curry night"], True),
        ("Thu", ["Overnight oats", "Garden bowl", "Pasta bake"], False),
    ]
    fday = font(SANS_BOLD, max(14, int(17 * scale)))
    fitem = font(SANS, max(12, int(14 * scale)))
    y = y0 + int(70 * scale)
    for day, items, on in days:
        h = int(88 * scale)
        fill = (255, 240, 220) if on else CREAM_CARD
        outline = (220, 180, 130) if on else (230, 220, 205)
        rounded_rect(draw, (x0, y, x1, y + h), 14, fill=fill, outline=outline)
        draw.text((x0 + 18, y + h // 2), day, font=fday, fill=GREEN, anchor="lm")
        iy = y + int(14 * scale)
        for item in items:
            draw.text((x0 + int(90 * scale), iy), item, font=fitem, fill=INK)
            iy += int(22 * scale)
        y += h + int(12 * scale)
        if y + h > y1:
            break


def draw_allergens(img, box, scale):
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(img)
    draw.text((x0, y0), "Nutrition & Allergens", font=font(SERIF, max(22, int(28 * scale))), fill=GREEN)
    card_y = y0 + int(48 * scale)
    card_h = int(140 * scale)
    rounded_rect(draw, (x0, card_y, x1, card_y + card_h), 16, fill=WHITE, outline=(230, 220, 205))
    stats = [("Calories", "590 kcal"), ("Protein", "3.3 g"), ("Carbs", "23.0 g"), ("Fat", "0.3 g")]
    fl = font(SANS, max(12, int(14 * scale)))
    fv = font(SANS_BOLD, max(15, int(18 * scale)))
    col_w = (x1 - x0) // 4
    for i, (label, value) in enumerate(stats):
        cx = x0 + col_w * i + col_w // 2
        cy = card_y + card_h // 2 - int(12 * scale)
        draw.text((cx, cy), label, font=fl, fill=MUTED, anchor="mm")
        draw.text((cx, cy + int(28 * scale)), value, font=fv, fill=GREEN, anchor="mm")
    rows = [
        ("Gluten", "Tracked"), ("Dairy", "Tracked"), ("Nuts", "Present · 2 dishes"),
        ("Sesame", "Clear"), ("Eggs", "Tracked"),
    ]
    draw_rows(draw, (x0, card_y + card_h + int(20 * scale), x1, y1), rows, scale, {2})


def draw_portions(img, box, scale):
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(img)
    draw.text((x0, y0), "Portions", font=font(SERIF, max(24, int(32 * scale))), fill=GREEN)
    draw.text((x0, y0 + int(38 * scale)), "Scale for 12 or 120", font=font(SANS, max(12, int(14 * scale))), fill=MUTED)
    card = (x0, y0 + int(80 * scale), x1, y1 - int(16 * scale))
    rounded_rect(draw, card, 20, fill=CREAM_CARD, outline=(230, 220, 205))
    cx = (x0 + x1) // 2
    draw.text((cx, card[1] + int(70 * scale)), "48", font=font(SERIF, max(80, int(100 * scale))), fill=GREEN, anchor="mm")
    draw.text((cx, card[1] + int(150 * scale)), "COVERS", font=font(SANS_BOLD, max(14, int(18 * scale))), fill=COPPER, anchor="mm")
    bx0, bx1 = x0 + 40, x1 - 40
    by = card[1] + int(190 * scale)
    rounded_rect(draw, (bx0, by, bx1, by + 12), 6, fill=(230, 236, 230))
    rounded_rect(draw, (bx0, by, bx0 + int((bx1 - bx0) * 0.72), by + 12), 6, fill=COPPER)
    fm = font(SANS, max(12, int(14 * scale)))
    draw.text((bx0, by + 36), "Cost / cover £3.42", font=fm, fill=INK)
    draw.text((bx1, by + 36), "Food cost 28%", font=fm, fill=INK, anchor="ra")


def draw_logs(img, box, scale):
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(img)
    draw.text((x0, y0), "Kitchen logs", font=font(SERIF, max(24, int(32 * scale))), fill=GREEN)
    draw.text((x0, y0 + int(38 * scale)), "Fridge · freezer · cleaning", font=font(SANS, max(12, int(14 * scale))), fill=MUTED)
    draw_rows(draw, (x0, y0 + int(70 * scale), x1, y1), [
        ("Walk-in fridge", "2.1°C · 07:40"),
        ("Freezer 1", "−18.4°C · 07:42"),
        ("Cleaning schedule", "Due 14:00"),
        ("Probe calibration", "Passed"),
    ], scale, {2})


def draw_stock(img, box, scale):
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(img)
    draw.text((x0, y0), "Stock & suppliers", font=font(SERIF, max(24, int(32 * scale))), fill=GREEN)
    draw.text((x0, y0 + int(38 * scale)), "What you have · what to order", font=font(SANS, max(12, int(14 * scale))), fill=MUTED)
    draw_rows(draw, (x0, y0 + int(70 * scale), x1, y1), [
        ("Basmati rice", "42 kg"),
        ("Coconut milk", "Low"),
        ("Olive oil", "18 L"),
        ("Fresh coriander", "On order"),
        ("Chickpeas", "26 kg"),
    ], scale, {1})


def draw_rota(img, box, scale):
    x0, y0, x1, y1 = box
    draw = ImageDraw.Draw(img)
    draw.text((x0, y0), "Staff rota", font=font(SERIF, max(24, int(32 * scale))), fill=GREEN)
    draw.text((x0, y0 + int(38 * scale)), "Who's on · who's covering", font=font(SANS, max(12, int(14 * scale))), fill=MUTED)
    draw_rows(draw, (x0, y0 + int(70 * scale), x1, y1), [
        ("Chef de partie", "06:00–14:00"),
        ("Commis", "07:00–15:00"),
        ("Pastry", "08:00–16:00"),
        ("Service lead", "10:00–18:00"),
        ("Porter", "11:00–19:00"),
    ], scale, {3})


SCREENS = {
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


def render_mac(shot: dict, width: int, height: int) -> Image.Image:
    img = Image.new("RGBA", (width, height), GREEN)
    draw_background(img)
    draw = ImageDraw.Draw(img)

    scale = width / 2560
    # Left brand column
    f_title = font(SERIF, max(28, int(42 * scale * 1.5)))
    f_tag = font(SERIF, max(34, int(52 * scale * 1.5)))
    left_w = int(width * 0.30)
    draw.text((int(left_w * 0.5), int(height * 0.28)), "Parslia Kitchen OS", font=f_title, fill=WHITE, anchor="mm")
    ty = int(height * 0.38)
    for line in wrap_text(draw, shot["tagline"], f_tag, int(left_w * 0.85)):
        draw.text((int(left_w * 0.5), ty), line, font=f_tag, fill=WHITE, anchor="mm")
        ty += int(56 * scale * 1.5)

    # Mac window on the right
    win_x0 = int(width * 0.32)
    win_y0 = int(height * 0.08)
    win_x1 = width - int(width * 0.04)
    win_y1 = height - int(height * 0.08)
    content = draw_mac_window(img, (win_x0, win_y0, win_x1, win_y1))
    sx0, sy0, sx1, sy1 = content

    side_w = int((sx1 - sx0) * 0.26)
    ui_scale = (sx1 - sx0) / 1400
    side_box = (sx0, sy0, sx0 + side_w, sy1)
    main_box = (sx0 + side_w + int(18 * ui_scale), sy0 + int(16 * ui_scale), sx1 - int(16 * ui_scale), sy1 - int(16 * ui_scale))
    draw_sidebar(img, side_box, shot["nav"], ui_scale)
    SCREENS[shot["screen"]](img, main_box, ui_scale)
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
            print(f"Rendering Mac {size_name}/{shot['id']} ({w}x{h})...")
            im = render_mac(shot, w, h)
            assert im.size == (w, h), im.size
            im.save(out, "PNG", optimize=True)
            im.save(art_dir / f"{shot['id']}.png", "PNG", optimize=True)
            manifest.append({"file": str(out.relative_to(ROOT)), "size": list(im.size), "id": shot["id"]})
            print(f"  -> {im.size}")

    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
    (OUT / "README.md").write_text(
        """# Parslia Mac App Store screenshots

Apple Mac screenshot sizes (16:10):

- **2560 × 1600** — use folder `2560x1600/` (recommended)
- **1280 × 800** — use folder `1280x800/`

In App Store Connect → your app → **Mac** → Screenshots, upload the 10 PNGs from **one** folder.

Regenerate:
```bash
python3 scripts/app-store-shots/generate_mac.py
```
"""
    )
    # update root screenshots README
    root_readme = ROOT / "assets" / "app-store-screenshots" / "README.md"
    if root_readme.exists():
        text = root_readme.read_text()
        if "mac/" not in text:
            text += "\n\n## Mac\n\nUpload from `mac/2560x1600/` (2560×1600, Apple 16:10).\n"
            root_readme.write_text(text)
    print("Done.")


if __name__ == "__main__":
    main()
