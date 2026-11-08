from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.config import WEB_DIR
from app import db
from app.ocr import OcrError, extract_text
from app.pipeline import build_house_recipe

app = FastAPI(title="Niramish", version="1.0.0")
db.init_db()


class RecipePayload(BaseModel):
    title: str
    description: str = ""
    servings: int | None = None
    prep_minutes: int | None = None
    cook_minutes: int | None = None
    cuisine: str | None = None
    course: str | None = None
    taste: str | None = None
    difficulty: str | None = None
    prep_time: str | None = None
    cook_time: str | None = None
    ingredients: list[dict] = Field(default_factory=list)
    steps: list[str] = Field(default_factory=list)
    substitutions: list[dict] = Field(default_factory=list)
    capture_id: str | None = None
    original_title: str | None = None
    original_servings: int | None = None
    original_steps: list[str] | None = None
    notes: list[str] | None = None


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "name": "niramish"}


@app.get("/api/ethos")
def ethos() -> dict:
    return {
        "name": "Niramish",
        "allowed": ["milk", "cheese", "cream", "butter", "ghee", "yogurt", "paneer", "buttermilk"],
        "forbidden": {
            "allium": ["onion", "garlic", "chives", "spring onion", "green onion", "leeks", "shallots", "scallions"],
            "meat": ["any meat or poultry"],
            "fish": ["fish and seafood"],
            "egg": ["eggs and mayonnaise"],
            "animal": ["honey, gelatin, lard and other non-dairy animal products"],
        },
        "transform": [
            "Forbidden foods are swapped for lacto-vegetarian stand-ins.",
            "Ingredient amounts are shifted so the stored recipe is not a copy of the page.",
            "The method is rephrased and timed slightly differently.",
        ],
    }


@app.post("/api/scan")
async def scan(
    photo: UploadFile | None = File(default=None),
    text: str | None = Form(default=None),
) -> dict:
    raw_text = (text or "").strip()
    photo_path = None
    if photo is not None and photo.filename:
        image_bytes = await photo.read()
        if not image_bytes:
            raise HTTPException(400, "Empty photo upload.")
        suffix = Path(photo.filename).suffix.lower() or ".jpg"
        if suffix not in {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}:
            suffix = ".jpg"
        photo_path = db.save_photo(image_bytes, suffix)
        try:
            raw_text = extract_text(image_bytes)
        except OcrError as exc:
            raise HTTPException(422, str(exc)) from exc
    if not raw_text:
        raise HTTPException(400, "Photograph a recipe page or paste the recipe text.")
    try:
        parsed, transformed = build_house_recipe(raw_text)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    capture = db.save_capture(
        ocr_text=raw_text,
        parsed=parsed.as_dict(),
        transformed=transformed.as_dict(),
        photo_path=photo_path,
    )
    return capture


@app.get("/api/captures/{capture_id}")
def read_capture(capture_id: str) -> dict:
    capture = db.get_capture(capture_id)
    if not capture:
        raise HTTPException(404, "Capture not found.")
    return capture


@app.get("/api/recipes")
def recipes(q: str | None = None) -> dict:
    return {"recipes": db.list_recipes(q)}


@app.get("/api/recipes/{recipe_id}")
def read_recipe(recipe_id: str) -> dict:
    recipe = db.get_recipe(recipe_id)
    if not recipe:
        raise HTTPException(404, "Recipe not found.")
    return recipe


@app.post("/api/recipes")
def save_recipe(payload: RecipePayload) -> dict:
    data = payload.model_dump()
    capture_id = data.pop("capture_id", None)
    if not data.get("ingredients") or not data.get("steps"):
        raise HTTPException(400, "A house recipe needs ingredients and a method.")
    from app.ethos import find_forbidden

    blobs = [data["title"], data.get("description") or "", *data["steps"]]
    blobs.extend(
        str(item.get("item") or item.get("name") or "")
        for item in data["ingredients"]
    )
    leftover = []
    for blob in blobs:
        leftover.extend(find_forbidden(blob))
    if leftover:
        phrases = ", ".join(sorted({hit.phrase for hit in leftover}))
        raise HTTPException(400, f"Still contains forbidden foods: {phrases}")
    return db.commit_recipe(data, capture_id)


@app.delete("/api/recipes/{recipe_id}")
def remove_recipe(recipe_id: str) -> dict:
    if not db.delete_recipe(recipe_id):
        raise HTTPException(404, "Recipe not found.")
    return {"ok": True}


@app.get("/")
def index() -> FileResponse:
    return FileResponse(WEB_DIR / "index.html")


if (WEB_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=WEB_DIR / "assets"), name="assets")
app.mount("/static", StaticFiles(directory=WEB_DIR), name="static")
