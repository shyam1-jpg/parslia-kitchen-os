"""Quick self-check for PC Guard. Run: python selftest.py"""

from __future__ import annotations

import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))


def main() -> int:
    print("PC Guard self-test")
    print("-" * 40)
    errors = 0

    for mod in ("flask", "watchdog", "psutil", "mss"):
        try:
            __import__(mod)
            print(f"[OK] import {mod}")
        except ImportError:
            print(f"[FAIL] missing package: {mod}")
            print("       Fix: run START.bat  (or: pip install -r requirements.txt)")
            errors += 1

    try:
        from PIL import ImageGrab  # noqa: F401

        print("[OK] import pillow")
    except ImportError:
        print("[WARN] pillow not installed (screen fallback weaker)")

    from guard_core import (
        WATCH_FALLBACK,
        FileHandler,
        Store,
        capture_screen,
        default_watch_folders,
        get_identity,
        load_config,
    )

    folders = default_watch_folders()
    print(f"[OK] watch folders found: {len(folders)}")
    for f in folders[:8]:
        print(f"     - {f}")
    if not folders:
        print("[FAIL] no folders to watch")
        errors += 1

    ident = get_identity()
    print(f"[OK] user: {ident['username']} @ {ident['hostname']}")

    screen = capture_screen("selftest", min_interval=0)
    if screen:
        print(f"[OK] screenshot saved: {screen}")
    else:
        print("[WARN] screenshot failed here (normal in remote/cloud). On your real PC it should work.")

    store = Store(ROOT / "data" / "selftest.db")
    sid = store.start_session(ident)
    handler = FileHandler(store, ident["username"], {"id": sid}, load_config())
    WATCH_FALLBACK.mkdir(parents=True, exist_ok=True)
    probe = WATCH_FALLBACK / "SELFTEST.txt"
    probe.write_text("selftest\n", encoding="utf-8")
    handler.record("created", str(probe))
    time.sleep(0.2)
    files = store.recent(5)["files"]
    if files:
        print(f"[OK] file event recorded: {files[0]['action']} → {files[0]['path']}")
    else:
        print("[FAIL] file event not recorded")
        errors += 1

    print("-" * 40)
    if errors:
        print(f"RESULT: {errors} problem(s). Run START.bat, then try again.")
        return 1
    print("RESULT: core looks good.")
    print("Next: double-click START.bat and open the dashboard.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
