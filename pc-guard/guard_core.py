"""
PC Guard — core monitoring logic.
Tracks who is on this PC and which files they touch.
"""

from __future__ import annotations

import getpass
import json
import os
import platform
import socket
import sqlite3
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import psutil
except ImportError:  # pragma: no cover
    psutil = None

try:
    from watchdog.events import FileSystemEventHandler
    from watchdog.observers import Observer
except ImportError:  # pragma: no cover
    FileSystemEventHandler = object  # type: ignore
    Observer = None

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
DB_PATH = DATA / "activity.db"
SNAPSHOTS = DATA / "snapshots"
CONFIG_PATH = ROOT / "config.json"

SKIP_NAMES = {".DS_Store", "Thumbs.db", "desktop.ini"}
SKIP_SUFFIXES = {".tmp", ".temp", ".swp", ".crdownload", ".partial"}


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def load_config() -> dict[str, Any]:
    defaults = {
        "watch_folders": [],
        "idle_seconds": 120,
        "webcam_on_activity": True,
        "dashboard_port": 8787,
        "log_active_window": True,
        "window_poll_seconds": 5,
    }
    if CONFIG_PATH.exists():
        try:
            data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
            defaults.update(data)
        except (json.JSONDecodeError, OSError):
            pass
    return defaults


def default_watch_folders() -> list[str]:
    home = Path.home()
    candidates = [
        home / "Desktop",
        home / "Documents",
        home / "Downloads",
        home / "OneDrive",
        home / "Pictures",
    ]
    # Windows recent shortcuts hint at opened files
    appdata = os.environ.get("APPDATA")
    if appdata:
        candidates.append(Path(appdata) / "Microsoft" / "Windows" / "Recent")
    return [str(p) for p in candidates if p.exists()]


def get_identity() -> dict[str, str]:
    return {
        "username": getpass.getuser(),
        "hostname": socket.gethostname(),
        "os": f"{platform.system()} {platform.release()}",
        "logged_at": utc_now(),
    }


class Store:
    def __init__(self, path: Path = DB_PATH) -> None:
        DATA.mkdir(parents=True, exist_ok=True)
        SNAPSHOTS.mkdir(parents=True, exist_ok=True)
        self.path = path
        self._lock = threading.Lock()
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._lock:
            conn = self._connect()
            try:
                conn.executescript(
                    """
                    CREATE TABLE IF NOT EXISTS sessions (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        started_at TEXT NOT NULL,
                        ended_at TEXT,
                        username TEXT,
                        hostname TEXT,
                        os_info TEXT,
                        snapshot_path TEXT,
                        note TEXT
                    );
                    CREATE TABLE IF NOT EXISTS file_events (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        created_at TEXT NOT NULL,
                        action TEXT NOT NULL,
                        path TEXT NOT NULL,
                        username TEXT,
                        session_id INTEGER
                    );
                    CREATE TABLE IF NOT EXISTS window_events (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        created_at TEXT NOT NULL,
                        title TEXT NOT NULL,
                        process_name TEXT,
                        username TEXT,
                        session_id INTEGER
                    );
                    CREATE TABLE IF NOT EXISTS activity_log (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        created_at TEXT NOT NULL,
                        kind TEXT NOT NULL,
                        message TEXT NOT NULL,
                        username TEXT,
                        session_id INTEGER
                    );
                    """
                )
                conn.commit()
            finally:
                conn.close()

    def start_session(self, identity: dict[str, str], snapshot: str | None = None) -> int:
        with self._lock:
            conn = self._connect()
            try:
                cur = conn.execute(
                    """
                    INSERT INTO sessions (started_at, username, hostname, os_info, snapshot_path, note)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        identity["logged_at"],
                        identity["username"],
                        identity["hostname"],
                        identity["os"],
                        snapshot,
                        "Session started",
                    ),
                )
                conn.commit()
                return int(cur.lastrowid)
            finally:
                conn.close()

    def end_session(self, session_id: int) -> None:
        with self._lock:
            conn = self._connect()
            try:
                conn.execute(
                    "UPDATE sessions SET ended_at = ? WHERE id = ?",
                    (utc_now(), session_id),
                )
                conn.commit()
            finally:
                conn.close()

    def add_file_event(self, action: str, path: str, username: str, session_id: int | None) -> None:
        with self._lock:
            conn = self._connect()
            try:
                conn.execute(
                    """
                    INSERT INTO file_events (created_at, action, path, username, session_id)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (utc_now(), action, path, username, session_id),
                )
                conn.commit()
            finally:
                conn.close()

    def add_window_event(
        self, title: str, process_name: str, username: str, session_id: int | None
    ) -> None:
        with self._lock:
            conn = self._connect()
            try:
                conn.execute(
                    """
                    INSERT INTO window_events (created_at, title, process_name, username, session_id)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (utc_now(), title, process_name, username, session_id),
                )
                conn.commit()
            finally:
                conn.close()

    def add_log(self, kind: str, message: str, username: str, session_id: int | None) -> None:
        with self._lock:
            conn = self._connect()
            try:
                conn.execute(
                    """
                    INSERT INTO activity_log (created_at, kind, message, username, session_id)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (utc_now(), kind, message, username, session_id),
                )
                conn.commit()
            finally:
                conn.close()

    def recent(self, limit: int = 200) -> dict[str, Any]:
        with self._lock:
            conn = self._connect()
            try:
                sessions = [
                    dict(r)
                    for r in conn.execute(
                        "SELECT * FROM sessions ORDER BY id DESC LIMIT ?", (limit,)
                    )
                ]
                files = [
                    dict(r)
                    for r in conn.execute(
                        "SELECT * FROM file_events ORDER BY id DESC LIMIT ?", (limit,)
                    )
                ]
                windows = [
                    dict(r)
                    for r in conn.execute(
                        "SELECT * FROM window_events ORDER BY id DESC LIMIT ?", (limit,)
                    )
                ]
                logs = [
                    dict(r)
                    for r in conn.execute(
                        "SELECT * FROM activity_log ORDER BY id DESC LIMIT ?", (limit,)
                    )
                ]
                return {
                    "sessions": sessions,
                    "files": files,
                    "windows": windows,
                    "logs": logs,
                    "identity": get_identity(),
                }
            finally:
                conn.close()


def try_webcam_snapshot(label: str = "activity") -> str | None:
    """Capture a webcam photo if OpenCV is installed. Returns relative path or None."""
    try:
        import cv2  # type: ignore
    except ImportError:
        return None

    cam = cv2.VideoCapture(0)
    if not cam.isOpened():
        cam.release()
        return None
    # Warm up camera
    for _ in range(5):
        cam.read()
        time.sleep(0.05)
    ok, frame = cam.read()
    cam.release()
    if not ok or frame is None:
        return None

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{label}_{stamp}.jpg"
    out = SNAPSHOTS / filename
    cv2.imwrite(str(out), frame)
    return f"snapshots/{filename}"


def get_idle_seconds() -> float | None:
    """Best-effort idle time (Windows / Linux / macOS)."""
    system = platform.system()
    try:
        if system == "Windows":
            import ctypes
            from ctypes import wintypes

            class LASTINPUTINFO(ctypes.Structure):
                _fields_ = [("cbSize", wintypes.UINT), ("dwTime", wintypes.DWORD)]

            lii = LASTINPUTINFO()
            lii.cbSize = ctypes.sizeof(LASTINPUTINFO)
            if ctypes.windll.user32.GetLastInputInfo(ctypes.byref(lii)):
                millis = ctypes.windll.kernel32.GetTickCount() - lii.dwTime
                return max(0.0, millis / 1000.0)
        elif system == "Darwin":
            # Quartz idle time
            import subprocess

            out = subprocess.check_output(
                [
                    "ioreg",
                    "-c",
                    "IOHIDSystem",
                ],
                text=True,
            )
            for line in out.splitlines():
                if "HIDIdleTime" in line:
                    # nanoseconds
                    ns = int(line.split("=")[-1].strip())
                    return ns / 1_000_000_000
        else:
            # Linux: /proc/uptime + X11 idle is hard; use psutil cpu as weak signal
            # Prefer xssstate if present
            import shutil
            import subprocess

            if shutil.which("xssstate"):
                out = subprocess.check_output(["xssstate", "-i"], text=True).strip()
                return float(out) / 1000.0
    except Exception:
        return None
    return None


def get_active_window() -> tuple[str, str] | None:
    """Return (title, process_name) for the foreground window when possible."""
    system = platform.system()
    try:
        if system == "Windows":
            import ctypes
            from ctypes import wintypes

            user32 = ctypes.windll.user32
            hwnd = user32.GetForegroundWindow()
            if not hwnd:
                return None
            length = user32.GetWindowTextLengthW(hwnd)
            buf = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buf, length + 1)
            title = buf.value or "(no title)"

            pid = wintypes.DWORD()
            user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            name = "unknown"
            if psutil and pid.value:
                try:
                    name = psutil.Process(pid.value).name()
                except (psutil.Error, OSError):
                    pass
            return title, name
        if system == "Linux":
            import shutil
            import subprocess

            if shutil.which("xdotool"):
                wid = subprocess.check_output(
                    ["xdotool", "getactivewindow"],
                    text=True,
                    stderr=subprocess.DEVNULL,
                ).strip()
                title = subprocess.check_output(
                    ["xdotool", "getwindowname", wid],
                    text=True,
                    stderr=subprocess.DEVNULL,
                ).strip()
                return title or "(no title)", "x11"
    except Exception:
        return None
    return None


class FileHandler(FileSystemEventHandler):
    def __init__(self, store: Store, username: str, session_ref: dict[str, int | None]) -> None:
        super().__init__()
        self.store = store
        self.username = username
        self.session_ref = session_ref
        self._last: dict[str, float] = {}

    def _should_skip(self, path: str) -> bool:
        name = Path(path).name
        if name in SKIP_NAMES:
            return True
        if Path(path).suffix.lower() in SKIP_SUFFIXES:
            return True
        # Debounce noisy rapid events on the same path
        now = time.time()
        prev = self._last.get(path, 0)
        if now - prev < 1.0:
            return True
        self._last[path] = now
        return False

    def _record(self, action: str, path: str) -> None:
        if self._should_skip(path):
            return
        self.store.add_file_event(action, path, self.username, self.session_ref.get("id"))

    def on_created(self, event):  # type: ignore[no-untyped-def]
        if getattr(event, "is_directory", False):
            return
        self._record("created", event.src_path)

    def on_modified(self, event):  # type: ignore[no-untyped-def]
        if getattr(event, "is_directory", False):
            return
        self._record("modified", event.src_path)

    def on_deleted(self, event):  # type: ignore[no-untyped-def]
        if getattr(event, "is_directory", False):
            return
        self._record("deleted", event.src_path)

    def on_moved(self, event):  # type: ignore[no-untyped-def]
        if getattr(event, "is_directory", False):
            return
        dest = getattr(event, "dest_path", "")
        self._record("moved", f"{event.src_path} → {dest}")


class GuardMonitor:
    def __init__(self) -> None:
        self.config = load_config()
        self.store = Store()
        self.identity = get_identity()
        self.session_ref: dict[str, int | None] = {"id": None}
        self._observer: Any = None
        self._stop = threading.Event()
        self._threads: list[threading.Thread] = []
        self._last_window = ""
        self._was_idle = False

    def start(self) -> None:
        snap = None
        if self.config.get("webcam_on_activity"):
            snap = try_webcam_snapshot("session_start")
        sid = self.store.start_session(self.identity, snap)
        self.session_ref["id"] = sid
        self.store.add_log(
            "session",
            f"PC Guard started for {self.identity['username']}@{self.identity['hostname']}",
            self.identity["username"],
            sid,
        )
        if snap:
            self.store.add_log("webcam", f"Snapshot saved: {snap}", self.identity["username"], sid)
        else:
            self.store.add_log(
                "webcam",
                "No webcam snapshot (install opencv-python-headless to enable)",
                self.identity["username"],
                sid,
            )

        folders = self.config.get("watch_folders") or default_watch_folders()
        if Observer is None:
            self.store.add_log(
                "error",
                "watchdog not installed — file watching disabled",
                self.identity["username"],
                sid,
            )
        else:
            handler = FileHandler(self.store, self.identity["username"], self.session_ref)
            observer = Observer()
            watched = 0
            for folder in folders:
                p = Path(folder)
                if p.exists():
                    try:
                        observer.schedule(handler, str(p), recursive=True)
                        watched += 1
                        self.store.add_log(
                            "watch",
                            f"Watching folder: {p}",
                            self.identity["username"],
                            sid,
                        )
                    except OSError as exc:
                        self.store.add_log(
                            "error",
                            f"Cannot watch {p}: {exc}",
                            self.identity["username"],
                            sid,
                        )
            if watched:
                observer.start()
                self._observer = observer

        if self.config.get("log_active_window"):
            t = threading.Thread(target=self._window_loop, name="window-poll", daemon=True)
            t.start()
            self._threads.append(t)

        t2 = threading.Thread(target=self._idle_loop, name="idle-poll", daemon=True)
        t2.start()
        self._threads.append(t2)

    def _window_loop(self) -> None:
        interval = float(self.config.get("window_poll_seconds") or 5)
        while not self._stop.wait(interval):
            info = get_active_window()
            if not info:
                continue
            title, proc = info
            key = f"{proc}|{title}"
            if key == self._last_window:
                continue
            self._last_window = key
            self.store.add_window_event(
                title, proc, self.identity["username"], self.session_ref.get("id")
            )

    def _idle_loop(self) -> None:
        threshold = float(self.config.get("idle_seconds") or 120)
        while not self._stop.wait(3):
            idle = get_idle_seconds()
            if idle is None:
                continue
            if idle >= threshold:
                if not self._was_idle:
                    self._was_idle = True
                    self.store.add_log(
                        "idle",
                        f"PC idle for {int(idle)}s",
                        self.identity["username"],
                        self.session_ref.get("id"),
                    )
            elif self._was_idle:
                self._was_idle = False
                snap = None
                if self.config.get("webcam_on_activity"):
                    snap = try_webcam_snapshot("return_from_idle")
                msg = "Someone is using the PC again (returned from idle)"
                if snap:
                    msg += f" — photo: {snap}"
                self.store.add_log(
                    "activity",
                    msg,
                    self.identity["username"],
                    self.session_ref.get("id"),
                )

    def stop(self) -> None:
        self._stop.set()
        if self._observer is not None:
            self._observer.stop()
            self._observer.join(timeout=5)
        sid = self.session_ref.get("id")
        if sid:
            self.store.end_session(sid)
            self.store.add_log(
                "session",
                "PC Guard stopped",
                self.identity["username"],
                sid,
            )
