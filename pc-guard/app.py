"""
PC Guard — run the monitor + local dashboard.

Usage:
  python app.py
  Then open http://127.0.0.1:8787
"""

from __future__ import annotations

import atexit
import sys
from pathlib import Path

from flask import Flask, jsonify, render_template, send_from_directory

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from guard_core import SNAPSHOTS, GuardMonitor, load_config  # noqa: E402

app = Flask(__name__, template_folder="templates", static_folder="static")
monitor = GuardMonitor()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/activity")
def api_activity():
    return jsonify(monitor.store.recent(250))


@app.route("/api/status")
def api_status():
    cfg = load_config()
    return jsonify(
        {
            "running": True,
            "session_id": monitor.session_ref.get("id"),
            "identity": monitor.identity,
            "port": cfg.get("dashboard_port", 8787),
            "webcam_on_activity": bool(cfg.get("webcam_on_activity")),
            "screenshot_on_file_use": bool(cfg.get("screenshot_on_file_use", True)),
            "webcam_on_file_use": bool(cfg.get("webcam_on_file_use", True)),
        }
    )


@app.route("/snapshots/<path:filename>")
def snapshots(filename: str):
    return send_from_directory(SNAPSHOTS, filename)


def main() -> None:
    cfg = load_config()
    port = int(cfg.get("dashboard_port") or 8787)
    monitor.start()
    atexit.register(monitor.stop)
    print("")
    print("  PC Guard is running")
    print(f"  Open dashboard: http://127.0.0.1:{port}")
    print("  Watching Desktop, Documents, Downloads (and more if present)")
    print("  Press Ctrl+C to stop")
    print("")
    app.run(host="127.0.0.1", port=port, debug=False, use_reloader=False)


if __name__ == "__main__":
    main()
