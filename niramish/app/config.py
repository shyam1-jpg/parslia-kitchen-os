import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
WEB_DIR = ROOT / "web"
DB_PATH = Path(os.environ.get("NIRAMISH_DB", DATA_DIR / "niramish.db"))
CAPTURES_DIR = Path(os.environ.get("NIRAMISH_CAPTURES", DATA_DIR / "captures"))

HOST = "0.0.0.0"
PORT = 8787

# House recipes must differ from the photographed page.
QUANTITY_SHIFT_MIN = 0.86
QUANTITY_SHIFT_MAX = 1.16
