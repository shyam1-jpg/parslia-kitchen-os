"""
PC Guard — run the monitor + local dashboard.

Usage:
  python app.py
  Dashboard opens automatically at http://127.0.0.1:8787
"""

from __future__ import annotations

import atexit
import socket
import sys
import threading
import time
import webbrowser
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


def port_is_free(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind((host, port))
            return True
        except OSError:
            return False


def wait_and_open_browser(url: str, host: str, port: int, timeout: float = 20.0) -> None:
    """Open the dashboard only after the server accepts connections."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=0.5):
                break
        except OSError:
            time.sleep(0.25)
    else:
        print(f"  Could not auto-open browser. Type this in Chrome/Edge:\n  {url}")
        return
    time.sleep(0.3)
    try:
        webbrowser.open(url, new=2)
        print(f"  Browser opened: {url}")
    except Exception as exc:
        print(f"  Could not open browser ({exc}). Open manually:\n  {url}")


def main() -> None:
    cfg = load_config()
    host = "127.0.0.1"
    port = int(cfg.get("dashboard_port") or 8787)

    if not port_is_free(host, port):
        for candidate in range(port + 1, port + 20):
            if port_is_free(host, candidate):
                print(f"  Port {port} busy — using {candidate} instead")
                port = candidate
                break
        else:
            print(f"  ERROR: ports {port}-{port + 19} are busy.")
            print("  Close other PC Guard windows, or change dashboard_port in config.json")
            input("  Press Enter to close...")
            sys.exit(1)

    monitor.start()
    atexit.register(monitor.stop)

    url = f"http://{host}:{port}"
    print("")
    print("  ========================================")
    print("   PC Guard is running")
    print(f"   Dashboard: {url}")
    print("   Keep this window OPEN")
    print("  ========================================")
    print("  Watching Desktop, Documents, Downloads")
    print("  Press Ctrl+C to stop")
    print("")

    threading.Thread(
        target=wait_and_open_browser,
        args=(url, host, port),
        name="open-browser",
        daemon=True,
    ).start()

    try:
        app.run(host=host, port=port, debug=False, use_reloader=False, threaded=True)
    except OSError as exc:
        print(f"  Failed to start dashboard: {exc}")
        input("  Press Enter to close...")
        sys.exit(1)


if __name__ == "__main__":
    main()
