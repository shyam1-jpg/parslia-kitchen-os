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
import subprocess
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
WATCH_FALLBACK = ROOT / "watched"
CONFIG_PATH = ROOT / "config.json"
DASHBOARD_URL_FILE = DATA / "dashboard.url"

SKIP_NAMES = {".DS_Store", "Thumbs.db", "desktop.ini"}
SKIP_SUFFIXES = {".tmp", ".temp", ".swp", ".crdownload", ".partial", ".download"}


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def load_config() -> dict[str, Any]:
    defaults = {
        "watch_folders": [],
        "idle_seconds": 120,
        "webcam_on_activity": False,
        "screenshot_on_file_use": True,
        "webcam_on_file_use": False,
        "screenshot_min_interval_seconds": 0.8,
        "dashboard_port": 8787,
        "log_active_window": True,
        "window_poll_seconds": 5,
        "recent_poll_seconds": 3,
    }
    if CONFIG_PATH.exists():
        try:
            data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
            defaults.update(data)
        except (json.JSONDecodeError, OSError):
            pass
    return defaults


def _unique_existing(paths: list[Path]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for p in paths:
        try:
            if not p.exists():
                continue
            key = str(p.resolve()).lower()
        except OSError:
            key = str(p).lower()
            if not p.exists():
                continue
        if key in seen:
            continue
        seen.add(key)
        out.append(str(p))
    return out


def default_watch_folders() -> list[str]:
    """Find real user folders on Windows/Mac/Linux, including OneDrive paths."""
    home = Path.home()
    userprofile = Path(os.environ.get("USERPROFILE") or home)
    candidates: list[Path] = [
        home / "Desktop",
        home / "Documents",
        home / "Downloads",
        home / "Pictures",
        home / "OneDrive" / "Desktop",
        home / "OneDrive" / "Documents",
        home / "OneDrive" / "Downloads",
        userprofile / "Desktop",
        userprofile / "Documents",
        userprofile / "Downloads",
        userprofile / "OneDrive" / "Desktop",
        userprofile / "OneDrive" / "Documents",
    ]

    # Known-folder env vars (Windows)
    for key in ("OneDrive", "OneDriveConsumer", "OneDriveCommercial"):
        val = os.environ.get(key)
        if val:
            base = Path(val)
            candidates.extend([base / "Desktop", base / "Documents", base / "Downloads", base])

    appdata = os.environ.get("APPDATA")
    if appdata:
        candidates.append(Path(appdata) / "Microsoft" / "Windows" / "Recent")

    # Always have a local fallback folder so the app can prove it works
    WATCH_FALLBACK.mkdir(parents=True, exist_ok=True)
    candidates.append(WATCH_FALLBACK)

    return _unique_existing(candidates)


def recent_folder() -> Path | None:
    appdata = os.environ.get("APPDATA")
    if not appdata:
        return None
    p = Path(appdata) / "Microsoft" / "Windows" / "Recent"
    return p if p.exists() else None


def get_identity() -> dict[str, str]:
    return {
        "username": getpass.getuser(),
        "hostname": socket.gethostname(),
        "os": f"{platform.system()} {platform.release()}",
        "logged_at": utc_now(),
    }


def resolve_windows_shortcut(lnk_path: str) -> str | None:
    """Resolve a Windows .lnk shortcut to its target file path."""
    if platform.system() != "Windows" or not lnk_path.lower().endswith(".lnk"):
        return None
    try:
        completed = subprocess.run(
            [
                "powershell",
                "-NoProfile",
                "-Command",
                f"(New-Object -ComObject WScript.Shell).CreateShortcut('{lnk_path.replace(chr(39), chr(39)+chr(39))}').TargetPath",
            ],
            capture_output=True,
            text=True,
            timeout=4,
            check=False,
        )
        target = (completed.stdout or "").strip()
        if target and Path(target).exists():
            return target
    except Exception:
        return None
    return None


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
                        session_id INTEGER,
                        screenshot_path TEXT,
                        webcam_path TEXT
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
                cols = {
                    row[1]
                    for row in conn.execute("PRAGMA table_info(file_events)").fetchall()
                }
                if "screenshot_path" not in cols:
                    conn.execute("ALTER TABLE file_events ADD COLUMN screenshot_path TEXT")
                if "webcam_path" not in cols:
                    conn.execute("ALTER TABLE file_events ADD COLUMN webcam_path TEXT")
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

    def add_file_event(
        self,
        action: str,
        path: str,
        username: str,
        session_id: int | None,
        screenshot_path: str | None = None,
        webcam_path: str | None = None,
    ) -> None:
        with self._lock:
            conn = self._connect()
            try:
                conn.execute(
                    """
                    INSERT INTO file_events
                      (created_at, action, path, username, session_id, screenshot_path, webcam_path)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        utc_now(),
                        action,
                        path,
                        username,
                        session_id,
                        screenshot_path,
                        webcam_path,
                    ),
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


def _webcam_capture_blocking(label: str) -> str | None:
    try:
        import cv2  # type: ignore
    except ImportError:
        return None

    cam = cv2.VideoCapture(0, getattr(cv2, "CAP_DSHOW", 0)) if platform.system() == "Windows" else cv2.VideoCapture(0)
    if not cam.isOpened():
        cam.release()
        return None
    for _ in range(4):
        cam.read()
        time.sleep(0.04)
    ok, frame = cam.read()
    cam.release()
    if not ok or frame is None:
        return None

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"{label}_{stamp}.jpg"
    out = SNAPSHOTS / filename
    cv2.imwrite(str(out), frame)
    return f"snapshots/{filename}"


def try_webcam_snapshot(label: str = "activity", timeout: float = 2.5) -> str | None:
    """Capture a webcam photo with a hard timeout so startup never hangs."""
    result: list[str | None] = [None]

    def worker() -> None:
        try:
            result[0] = _webcam_capture_blocking(label)
        except Exception:
            result[0] = None

    t = threading.Thread(target=worker, name="webcam", daemon=True)
    t.start()
    t.join(timeout)
    return result[0]


_last_capture_error_logged = False
_screenshot_lock = threading.Lock()
_last_screenshot_at = 0.0
_last_screenshot_path: str | None = None
_last_capture_error: str | None = None


def _capture_screen_windows_gdi(out: Path) -> bool:
    """BitBlt fallback for Windows when mss fails."""
    if platform.system() != "Windows":
        return False
    try:
        import ctypes
        from ctypes import wintypes

        user32 = ctypes.windll.user32
        gdi32 = ctypes.windll.gdi32
        user32.SetProcessDPIAware()
        width = user32.GetSystemMetrics(0)
        height = user32.GetSystemMetrics(1)
        if width <= 0 or height <= 0:
            return False

        hdc = user32.GetDC(0)
        memdc = gdi32.CreateCompatibleDC(hdc)
        bmp = gdi32.CreateCompatibleBitmap(hdc, width, height)
        gdi32.SelectObject(memdc, bmp)
        gdi32.BitBlt(memdc, 0, 0, width, height, hdc, 0, 0, 0x00CC0020)

        class BITMAPINFOHEADER(ctypes.Structure):
            _fields_ = [
                ("biSize", wintypes.DWORD),
                ("biWidth", wintypes.LONG),
                ("biHeight", wintypes.LONG),
                ("biPlanes", wintypes.WORD),
                ("biBitCount", wintypes.WORD),
                ("biCompression", wintypes.DWORD),
                ("biSizeImage", wintypes.DWORD),
                ("biXPelsPerMeter", wintypes.LONG),
                ("biYPelsPerMeter", wintypes.LONG),
                ("biClrUsed", wintypes.DWORD),
                ("biClrImportant", wintypes.DWORD),
            ]

        bmi = BITMAPINFOHEADER()
        bmi.biSize = ctypes.sizeof(BITMAPINFOHEADER)
        bmi.biWidth = width
        bmi.biHeight = -height
        bmi.biPlanes = 1
        bmi.biBitCount = 24
        bmi.biCompression = 0

        row_stride = ((width * 3 + 3) & ~3)
        buf_size = row_stride * height
        buf = (ctypes.c_char * buf_size)()
        gdi32.GetDIBits(memdc, bmp, 0, height, buf, ctypes.byref(bmi), 0)

        # Minimal BMP writer
        file_size = 54 + buf_size
        with open(out, "wb") as f:
            f.write(b"BM")
            f.write(file_size.to_bytes(4, "little"))
            f.write((0).to_bytes(4, "little"))
            f.write((54).to_bytes(4, "little"))
            f.write((40).to_bytes(4, "little"))
            f.write(int(width).to_bytes(4, "little", signed=True))
            f.write(int(height).to_bytes(4, "little", signed=True))
            f.write((1).to_bytes(2, "little"))
            f.write((24).to_bytes(2, "little"))
            f.write((0).to_bytes(4, "little"))
            f.write(int(buf_size).to_bytes(4, "little"))
            f.write((0).to_bytes(16, "little"))
            f.write(bytes(buf))

        gdi32.DeleteObject(bmp)
        gdi32.DeleteDC(memdc)
        user32.ReleaseDC(0, hdc)
        return out.exists() and out.stat().st_size > 0
    except Exception:
        return False


def capture_screen(label: str = "file", min_interval: float = 0.4) -> str | None:
    """Capture the full screen at this exact moment."""
    global _last_screenshot_at, _last_screenshot_path, _last_capture_error_logged, _last_capture_error
    SNAPSHOTS.mkdir(parents=True, exist_ok=True)

    with _screenshot_lock:
        now = time.time()
        if (
            min_interval > 0
            and _last_screenshot_path
            and (now - _last_screenshot_at) < min_interval
        ):
            return _last_screenshot_path

        stamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        filename = f"screen_{label}_{stamp}.png"
        out = SNAPSHOTS / filename
        errors: list[str] = []

        try:
            import mss  # type: ignore

            MSS = getattr(mss, "MSS", None) or mss.mss
            tools = mss.tools
            with MSS() as sct:
                monitor = sct.monitors[1] if len(sct.monitors) > 1 else sct.monitors[0]
                shot = sct.grab(monitor)
                tools.to_png(shot.rgb, shot.size, output=str(out))
            _last_screenshot_at = now
            _last_screenshot_path = f"snapshots/{filename}"
            return _last_screenshot_path
        except Exception as exc:
            errors.append(f"mss: {exc}")

        try:
            from PIL import ImageGrab  # type: ignore

            img = ImageGrab.grab(all_screens=True)
            img.save(out, "PNG")
            _last_screenshot_at = now
            _last_screenshot_path = f"snapshots/{filename}"
            return _last_screenshot_path
        except Exception as exc:
            errors.append(f"pillow: {exc}")

        # Windows GDI fallback writes BMP; rename extension for clarity
        bmp_name = f"screen_{label}_{stamp}.bmp"
        bmp_out = SNAPSHOTS / bmp_name
        if _capture_screen_windows_gdi(bmp_out):
            _last_screenshot_at = now
            _last_screenshot_path = f"snapshots/{bmp_name}"
            return _last_screenshot_path
        errors.append("gdi: failed")

        _last_capture_error = " | ".join(errors)
        if not _last_capture_error_logged:
            _last_capture_error_logged = True
            print("PC Guard: screen capture failed —", _last_capture_error)
        return None


def get_idle_seconds() -> float | None:
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
            out = subprocess.check_output(["ioreg", "-c", "IOHIDSystem"], text=True)
            for line in out.splitlines():
                if "HIDIdleTime" in line:
                    ns = int(line.split("=")[-1].strip())
                    return ns / 1_000_000_000
        else:
            import shutil

            if shutil.which("xssstate"):
                out = subprocess.check_output(["xssstate", "-i"], text=True).strip()
                return float(out) / 1000.0
    except Exception:
        return None
    return None


def get_active_window() -> tuple[str, str] | None:
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
    def __init__(
        self,
        store: Store,
        username: str,
        session_ref: dict[str, int | None],
        config: dict[str, Any] | None = None,
    ) -> None:
        super().__init__()
        self.store = store
        self.username = username
        self.session_ref = session_ref
        self.config = config or {}
        self._last: dict[str, float] = {}
        self._data_root = str(DATA.resolve())

    def _should_skip(self, path: str) -> bool:
        name = Path(path).name
        if name in SKIP_NAMES:
            return True
        if Path(path).suffix.lower() in SKIP_SUFFIXES:
            return True
        try:
            resolved = str(Path(path).resolve())
            if resolved.startswith(self._data_root):
                return True
        except OSError:
            pass
        now = time.time()
        prev = self._last.get(path, 0)
        if now - prev < 1.0:
            return True
        self._last[path] = now
        return False

    def record(self, action: str, path: str) -> None:
        self._record(action, path)

    def _record(self, action: str, path: str) -> None:
        # Windows Recent shortcuts → real opened file
        if path.lower().endswith(".lnk"):
            target = resolve_windows_shortcut(path)
            if target:
                action = "opened"
                path = target

        if self._should_skip(path):
            return

        screenshot_path = None
        webcam_path = None
        safe_label = Path(path).stem[:24] or "file"
        safe_label = "".join(c if c.isalnum() or c in "-_" else "_" for c in safe_label)

        if self.config.get("screenshot_on_file_use", True):
            interval = float(self.config.get("screenshot_min_interval_seconds") or 0.8)
            screenshot_path = capture_screen(
                safe_label, min_interval=max(0.35, min(interval, 2.0))
            )

        if self.config.get("webcam_on_file_use", False):
            webcam_path = try_webcam_snapshot(f"face_{safe_label}", timeout=2.0)

        self.store.add_file_event(
            action,
            path,
            self.username,
            self.session_ref.get("id"),
            screenshot_path=screenshot_path,
            webcam_path=webcam_path,
        )

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
        self.watched_folders: list[str] = []
        self.handler: FileHandler | None = None
        self.last_screen_error = None

    def status(self) -> dict[str, Any]:
        return {
            "running": self.session_ref.get("id") is not None,
            "session_id": self.session_ref.get("id"),
            "identity": self.identity,
            "watched_folders": self.watched_folders,
            "watch_count": len(self.watched_folders),
            "screenshot_on_file_use": bool(self.config.get("screenshot_on_file_use", True)),
            "webcam_on_file_use": bool(self.config.get("webcam_on_file_use", False)),
            "webcam_on_activity": bool(self.config.get("webcam_on_activity", False)),
            "fallback_folder": str(WATCH_FALLBACK),
            "last_screen_error": _last_capture_error,
            "dashboard_url_file": str(DASHBOARD_URL_FILE),
        }

    def start(self) -> None:
        sid = self.store.start_session(self.identity, None)
        self.session_ref["id"] = sid
        self.store.add_log(
            "session",
            f"PC Guard started for {self.identity['username']}@{self.identity['hostname']}",
            self.identity["username"],
            sid,
        )

        # Webcam in background so startup never freezes
        if self.config.get("webcam_on_activity"):
            def _cam() -> None:
                snap = try_webcam_snapshot("session_start", timeout=3.0)
                if snap:
                    self.store.add_log(
                        "webcam", f"Snapshot saved: {snap}", self.identity["username"], sid
                    )
                else:
                    self.store.add_log(
                        "webcam",
                        "No webcam photo (optional). Install opencv-python-headless to enable.",
                        self.identity["username"],
                        sid,
                    )

            threading.Thread(target=_cam, name="session-webcam", daemon=True).start()

        if self.config.get("screenshot_on_file_use", True):
            self.store.add_log(
                "screen",
                "Screen shots will be taken when a watched file is used",
                self.identity["username"],
                sid,
            )

        folders = self.config.get("watch_folders") or default_watch_folders()
        self.watched_folders = list(folders)

        if Observer is None:
            self.store.add_log(
                "error",
                "watchdog not installed — file watching disabled. Run START.bat again.",
                self.identity["username"],
                sid,
            )
        else:
            handler = FileHandler(
                self.store, self.identity["username"], self.session_ref, self.config
            )
            self.handler = handler
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
            else:
                self.store.add_log(
                    "error",
                    "No folders could be watched. Put a test file in pc-guard/watched/",
                    self.identity["username"],
                    sid,
                )

        if self.config.get("log_active_window"):
            t = threading.Thread(target=self._window_loop, name="window-poll", daemon=True)
            t.start()
            self._threads.append(t)

        t2 = threading.Thread(target=self._idle_loop, name="idle-poll", daemon=True)
        t2.start()
        self._threads.append(t2)

        if platform.system() == "Windows" and recent_folder() is not None:
            t3 = threading.Thread(target=self._recent_loop, name="recent-poll", daemon=True)
            t3.start()
            self._threads.append(t3)

        # Prove the pipeline works immediately
        self._write_startup_probe()

    def _write_startup_probe(self) -> None:
        """Create a tiny file in the fallback watch folder so the UI shows a first event."""
        try:
            WATCH_FALLBACK.mkdir(parents=True, exist_ok=True)
            probe = WATCH_FALLBACK / f"PC_GUARD_STARTED_{datetime.now().strftime('%H%M%S')}.txt"
            probe.write_text(
                "PC Guard is watching this folder.\n"
                "If you see this event in the dashboard, file watching works.\n",
                encoding="utf-8",
            )
            # Also record directly in case observer is still warming up
            if self.handler is not None:
                time.sleep(0.4)
                self.handler.record("created", str(probe))
        except OSError as exc:
            self.store.add_log(
                "error",
                f"Could not write startup probe: {exc}",
                self.identity["username"],
                self.session_ref.get("id"),
            )

    def _recent_loop(self) -> None:
        """Poll Windows Recent folder for newly opened files (.lnk shortcuts)."""
        folder = recent_folder()
        if folder is None or self.handler is None:
            return
        interval = float(self.config.get("recent_poll_seconds") or 3)
        seen: dict[str, float] = {}
        try:
            for p in folder.glob("*.lnk"):
                try:
                    seen[str(p)] = p.stat().st_mtime
                except OSError:
                    pass
        except OSError:
            pass

        while not self._stop.wait(interval):
            try:
                for p in folder.glob("*.lnk"):
                    try:
                        mtime = p.stat().st_mtime
                    except OSError:
                        continue
                    key = str(p)
                    prev = seen.get(key)
                    if prev is not None and mtime <= prev:
                        continue
                    seen[key] = mtime
                    # Only treat as open if shortcut is fresh (last few minutes)
                    if time.time() - mtime > 180:
                        continue
                    self.handler.record("opened", key)
            except OSError:
                continue

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
                    snap = try_webcam_snapshot("return_from_idle", timeout=2.5)
                msg = "Someone is using the PC again (returned from idle)"
                if snap:
                    msg += f" — photo: {snap}"
                # Always take a screen shot when someone returns
                screen = capture_screen("return_idle", min_interval=0)
                if screen:
                    msg += f" — screen: {screen}"
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
