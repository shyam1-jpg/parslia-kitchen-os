import os
from pathlib import Path

ROOT = Path("/tmp/niramish-pytest")
ROOT.mkdir(parents=True, exist_ok=True)
os.environ["NIRAMISH_DB"] = str(ROOT / "test.db")
os.environ["NIRAMISH_CAPTURES"] = str(ROOT / "captures")
