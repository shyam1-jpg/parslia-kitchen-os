#!/usr/bin/env python3
"""Rotate Pure Prasad Kitchen featured tip for today's date."""
from __future__ import annotations

import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BANK = ROOT / "pure-prasad-kitchen" / "content" / "tips.json"
TODAY = ROOT / "pure-prasad-kitchen" / "content" / "today.json"


def main() -> None:
    bank = json.loads(BANK.read_text(encoding="utf-8"))
    tips = bank.get("tips") or []
    if not tips:
        raise SystemExit("No tips in tips.json")

    today = date.today()
    tip = tips[(today.timetuple().tm_yday - 1) % len(tips)]
    doc = {
        "date": today.isoformat(),
        "source": "github-action",
        "tip": tip,
        "note": "Auto-rotated by GitHub Action from the Pure Prasad tip bank.",
    }
    TODAY.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    bank["updated"] = today.isoformat()
    BANK.write_text(json.dumps(bank, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{today.isoformat()}: {tip.get('title')}")


if __name__ == "__main__":
    main()
