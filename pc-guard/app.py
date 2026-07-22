"""
PC Guard entrypoint.

Default mode = OFFLINE file dashboard (no firewall / no port).
Optional web mode: python app.py --web
"""

from __future__ import annotations

import atexit
import socket
import sys
import threading
import time
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from guard_core import (  # noqa: E402
    DASHBOARD_URL_FILE,
    SNAPSHOTS,
    WATCH_FALLBACK,
    GuardMonitor,
    load_config,
)
from report import LIVE_HTML, write_live_dashboard  # noqa: E402


def port_is_free(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind((host, port))
            return True
        except OSError:
            return False


def wait_and_open_browser(url: str, host: str, port: int, timeout: float = 20.0) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=0.5):
                break
        except OSError:
            time.sleep(0.25)
    else:
        print(f"  Could not auto-open browser. Open manually:\n  {url}")
        return
    time.sleep(0.35)
    try:
        webbrowser.open(url, new=2)
        print(f"  Browser opened: {url}")
    except Exception as exc:
        print(f"  Could not open browser ({exc}). Open manually:\n  {url}")


def run_offline(monitor: GuardMonitor) -> None:
    """No network port — writes data/live.html and opens it in the browser."""
    stop = threading.Event()

    def refresh_loop() -> None:
        while not stop.wait(2.5):
            try:
                write_live_dashboard(monitor.store.recent(250), monitor.status())
            except Exception as exc:
                print(f"  Dashboard refresh error: {exc}")

    # First paint immediately
    path = write_live_dashboard(monitor.store.recent(250), monitor.status())
    try:
        DASHBOARD_URL_FILE.write_text(path.resolve().as_uri() + "\n", encoding="utf-8")
    except OSError:
        pass

    print("")
    print("  ========================================")
    print("   PC Guard is running (NO FIREWALL MODE)")
    print(f"   Dashboard file: {path}")
    print("   Keep this window OPEN")
    print("  ========================================")
    folders = monitor.watched_folders
    if folders:
        print(f"  Watching {len(folders)} folder(s)")
        for f in folders[:6]:
            print(f"   - {f}")
    print("  To test: double-click TEST-NOW.bat")
    print("  Press Ctrl+C to stop")
    print("")

    threading.Thread(target=refresh_loop, name="live-html", daemon=True).start()
    try:
        webbrowser.open(path.resolve().as_uri(), new=2)
        print("  Browser opened the local dashboard file")
    except Exception as exc:
        print(f"  Open this file manually in Chrome/Edge:\n  {path}")
        print(f"  ({exc})")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n  Stopping...")
    finally:
        stop.set()


def run_web(monitor: GuardMonitor) -> None:
    from flask import Flask, jsonify, render_template, send_from_directory

    app = Flask(__name__, template_folder="templates", static_folder="static")

    @app.route("/")
    def index():
        return render_template("index.html")

    @app.route("/api/activity")
    def api_activity():
        return jsonify(monitor.store.recent(250))

    @app.route("/api/status")
    def api_status():
        cfg = load_config()
        st = monitor.status()
        st.update(
            {
                "port": cfg.get("dashboard_port", 8787),
                "url": DASHBOARD_URL_FILE.read_text(encoding="utf-8").strip()
                if DASHBOARD_URL_FILE.exists()
                else None,
            }
        )
        return jsonify(st)

    @app.route("/api/test-event", methods=["POST", "GET"])
    def api_test_event():
        from datetime import datetime

        WATCH_FALLBACK.mkdir(parents=True, exist_ok=True)
        path = WATCH_FALLBACK / f"TEST_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        path.write_text("PC Guard test file — safe to delete.\n", encoding="utf-8")
        if monitor.handler is not None:
            monitor.handler.record("created", str(path))
        return jsonify({"ok": True, "path": str(path)})

    @app.route("/snapshots/<path:filename>")
    def snapshots(filename: str):
        return send_from_directory(SNAPSHOTS, filename)

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
            print("  ERROR: ports busy. Use normal START.bat (no firewall mode) instead.")
            input("  Press Enter to close...")
            sys.exit(1)

    url = f"http://{host}:{port}"
    try:
        DASHBOARD_URL_FILE.write_text(url + "\n", encoding="utf-8")
    except OSError:
        pass

    print("")
    print("  ========================================")
    print("   PC Guard WEB mode")
    print(f"   Dashboard: {url}")
    print("   If blocked, use START.bat instead (no firewall)")
    print("  ========================================")
    print("")

    threading.Thread(
        target=wait_and_open_browser,
        args=(url, host, port),
        name="open-browser",
        daemon=True,
    ).start()
    app.run(host=host, port=port, debug=False, use_reloader=False, threaded=True)


def main() -> None:
    web = "--web" in sys.argv
    monitor = GuardMonitor()
    monitor.start()
    atexit.register(monitor.stop)
    if web:
        run_web(monitor)
    else:
        run_offline(monitor)


if __name__ == "__main__":
    main()
