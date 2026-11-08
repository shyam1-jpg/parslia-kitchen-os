"""Read a photographed recipe card into plain text."""

from __future__ import annotations

import io

from PIL import Image, ImageFilter, ImageOps


class OcrError(RuntimeError):
    pass


def _prepare(image: Image.Image) -> Image.Image:
    image = ImageOps.exif_transpose(image)
    image = image.convert("RGB")
    # Keep enough resolution for small cookbook type, without exploding RAM.
    max_side = 2200
    if max(image.size) > max_side:
        image.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    gray = ImageOps.grayscale(image)
    gray = ImageOps.autocontrast(gray)
    gray = gray.filter(ImageFilter.SHARPEN)
    # Light threshold helps photographed white pages.
    return gray.point(lambda p: 255 if p > 210 else p)


def extract_text(image_bytes: bytes) -> str:
    try:
        import pytesseract
    except ImportError as exc:
        raise OcrError("pytesseract is not installed.") from exc

    try:
        image = Image.open(io.BytesIO(image_bytes))
    except Exception as exc:
        raise OcrError("That file is not a readable image.") from exc

    prepared = _prepare(image)
    try:
        text = pytesseract.image_to_string(prepared)
    except pytesseract.TesseractNotFoundError as exc:
        raise OcrError(
            "Tesseract is not installed on this machine. Paste the recipe text instead, or install tesseract-ocr."
        ) from exc
    except Exception as exc:
        raise OcrError("Could not read text from that photo.") from exc

    cleaned = "\n".join(line.rstrip() for line in text.splitlines()).strip()
    if not cleaned:
        raise OcrError("No recipe text was readable in that photo. Try a tighter, brighter shot of the page.")
    return cleaned
