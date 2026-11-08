"""SQLite recipe database for Niramish house recipes."""

from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.config import CAPTURES_DIR, DATA_DIR, DB_PATH

SCHEMA = """
CREATE TABLE IF NOT EXISTS captures (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    photo_path TEXT,
    ocr_text TEXT NOT NULL,
    parsed_json TEXT NOT NULL,
    transformed_json TEXT NOT NULL,
    substitutions_json TEXT NOT NULL,
    committed_recipe_id TEXT
);

CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    servings INTEGER,
    prep_minutes INTEGER,
    cook_minutes INTEGER,
    cuisine TEXT,
    course TEXT,
    taste TEXT,
    difficulty TEXT,
    prep_time TEXT,
    cook_time TEXT,
    capture_id TEXT,
    ingredients_json TEXT NOT NULL,
    steps_json TEXT NOT NULL,
    substitutions_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    quantity REAL,
    unit TEXT,
    name TEXT NOT NULL,
    original_name TEXT,
    quantity_original REAL,
    substituted INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes(title);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_name ON recipe_ingredients(name);
"""


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    CAPTURES_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _commercial_seeds() -> list[dict]:
    from app.collection import load_source_recipes
    from app.pipeline import build_house_recipe

    seeds: list[dict] = []
    for parsed in load_source_recipes():
        try:
            _, transformed = build_house_recipe(parsed.ocr_text)
        except Exception:
            continue
        seeds.append(transformed.as_dict())
    return seeds


def init_db() -> None:
    with connect() as conn:
        conn.executescript(SCHEMA)
        count = conn.execute("SELECT COUNT(*) AS n FROM recipes").fetchone()["n"]
        if count == 0:
            for recipe in _commercial_seeds():
                _insert_recipe(conn, recipe, capture_id=None)


def _insert_recipe(conn: sqlite3.Connection, recipe: dict, capture_id: str | None) -> str:
    recipe_id = recipe.get("id") or str(uuid.uuid4())
    now = utc_now()
    conn.execute(
        """
        INSERT INTO recipes (
            id, created_at, updated_at, title, description, servings,
            prep_minutes, cook_minutes, cuisine, course, taste, difficulty,
            prep_time, cook_time, capture_id, ingredients_json,
            steps_json, substitutions_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            recipe_id,
            recipe.get("created_at", now),
            now,
            recipe["title"],
            recipe.get("description") or "",
            recipe.get("servings"),
            recipe.get("prep_minutes"),
            recipe.get("cook_minutes"),
            recipe.get("cuisine"),
            recipe.get("course"),
            recipe.get("taste"),
            recipe.get("difficulty"),
            recipe.get("prep_time"),
            recipe.get("cook_time"),
            capture_id,
            json.dumps(recipe["ingredients"], ensure_ascii=False),
            json.dumps(recipe["steps"], ensure_ascii=False),
            json.dumps(recipe.get("substitutions") or [], ensure_ascii=False),
        ),
    )
    conn.execute("DELETE FROM recipe_ingredients WHERE recipe_id = ?", (recipe_id,))
    for index, ingredient in enumerate(recipe["ingredients"]):
        conn.execute(
            """
            INSERT INTO recipe_ingredients (
                recipe_id, sort_order, quantity, unit, name,
                original_name, quantity_original, substituted
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                recipe_id,
                index,
                ingredient.get("quantity"),
                ingredient.get("unit"),
                ingredient.get("item") or ingredient.get("name") or "",
                ingredient.get("original_item"),
                ingredient.get("quantity_original"),
                1 if ingredient.get("substituted") else 0,
            ),
        )
    return recipe_id


def save_capture(
    ocr_text: str,
    parsed: dict,
    transformed: dict,
    photo_path: str | None,
) -> dict:
    capture_id = str(uuid.uuid4())
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO captures (
                id, created_at, photo_path, ocr_text, parsed_json,
                transformed_json, substitutions_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                capture_id,
                utc_now(),
                photo_path,
                ocr_text,
                json.dumps(parsed, ensure_ascii=False),
                json.dumps(transformed, ensure_ascii=False),
                json.dumps(transformed.get("substitutions") or [], ensure_ascii=False),
            ),
        )
    return get_capture(capture_id)


def get_capture(capture_id: str) -> dict | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM captures WHERE id = ?", (capture_id,)).fetchone()
    if not row:
        return None
    return _capture_from_row(row)


def commit_recipe(payload: dict, capture_id: str | None = None) -> dict:
    with connect() as conn:
        recipe_id = _insert_recipe(conn, payload, capture_id)
        if capture_id:
            conn.execute(
                "UPDATE captures SET committed_recipe_id = ? WHERE id = ?",
                (recipe_id, capture_id),
            )
    return get_recipe(recipe_id)


def get_recipe(recipe_id: str) -> dict | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM recipes WHERE id = ?", (recipe_id,)).fetchone()
    if not row:
        return None
    return _recipe_from_row(row)


def list_recipes(query: str | None = None) -> list[dict]:
    sql = "SELECT * FROM recipes"
    params: list[str] = []
    if query:
        sql += " WHERE title LIKE ? OR description LIKE ? OR ingredients_json LIKE ?"
        like = f"%{query}%"
        params.extend([like, like, like])
    sql += " ORDER BY created_at DESC"
    with connect() as conn:
        rows = conn.execute(sql, params).fetchall()
    return [_recipe_from_row(row) for row in rows]


def delete_recipe(recipe_id: str) -> bool:
    with connect() as conn:
        cur = conn.execute("DELETE FROM recipes WHERE id = ?", (recipe_id,))
        return cur.rowcount > 0


def save_photo(image_bytes: bytes, suffix: str = ".jpg") -> str:
    CAPTURES_DIR.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4()}{suffix}"
    path = CAPTURES_DIR / name
    path.write_bytes(image_bytes)
    return str(path)


def _recipe_from_row(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "title": row["title"],
        "description": row["description"],
        "servings": row["servings"],
        "prep_minutes": row["prep_minutes"],
        "cook_minutes": row["cook_minutes"],
        "cuisine": row["cuisine"],
        "course": row["course"],
        "taste": row["taste"],
        "difficulty": row["difficulty"],
        "prep_time": row["prep_time"],
        "cook_time": row["cook_time"],
        "capture_id": row["capture_id"],
        "ingredients": json.loads(row["ingredients_json"]),
        "steps": json.loads(row["steps_json"]),
        "substitutions": json.loads(row["substitutions_json"]),
    }


def _capture_from_row(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "created_at": row["created_at"],
        "photo_path": row["photo_path"],
        "ocr_text": row["ocr_text"],
        "parsed": json.loads(row["parsed_json"]),
        "transformed": json.loads(row["transformed_json"]),
        "substitutions": json.loads(row["substitutions_json"]),
        "committed_recipe_id": row["committed_recipe_id"],
    }


def database_path() -> Path:
    return DB_PATH
