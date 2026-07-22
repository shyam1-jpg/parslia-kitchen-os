"""
PC Guard desktop window — no Chrome, no internet, no firewall.
Uses Tkinter (included with normal Windows Python).
"""

from __future__ import annotations

import os
import sys
import threading
import time
import webbrowser
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from guard_core import WATCH_FALLBACK, GuardMonitor  # noqa: E402
from report import write_live_dashboard  # noqa: E402


def _short(path: str, n: int = 70) -> str:
    s = str(path or "")
    return s if len(s) <= n else "…" + s[-(n - 1) :]


class DesktopApp:
    def __init__(self) -> None:
        import tkinter as tk
        from tkinter import messagebox, ttk

        self.tk = tk
        self.messagebox = messagebox
        self.monitor = GuardMonitor()
        self.monitor.start()

        self.root = tk.Tk()
        self.root.title("PC Guard — who used this PC")
        self.root.geometry("920x640")
        self.root.minsize(720, 480)

        # Header
        top = ttk.Frame(self.root, padding=12)
        top.pack(fill="x")
        ttk.Label(top, text="PC Guard", font=("Segoe UI", 18, "bold")).pack(anchor="w")
        self.status_var = tk.StringVar(value="Starting…")
        ttk.Label(top, textvariable=self.status_var, foreground="#1a6b4a").pack(anchor="w")
        self.who_var = tk.StringVar(value="")
        ttk.Label(top, textvariable=self.who_var).pack(anchor="w")
        self.watch_var = tk.StringVar(value="")
        ttk.Label(top, textvariable=self.watch_var, wraplength=860).pack(anchor="w")

        btns = ttk.Frame(self.root, padding=(12, 0))
        btns.pack(fill="x")
        ttk.Button(btns, text="Create test event", command=self.create_test).pack(side="left")
        ttk.Button(btns, text="Refresh now", command=self.refresh).pack(side="left", padx=8)
        ttk.Button(btns, text="Open snapshots folder", command=self.open_snapshots).pack(side="left")
        ttk.Button(btns, text="Also open HTML file", command=self.open_html).pack(side="left", padx=8)

        # Notebook
        nb = ttk.Notebook(self.root)
        nb.pack(fill="both", expand=True, padx=12, pady=12)

        self.files_list = self._make_list(nb, "Files touched")
        self.windows_list = self._make_list(nb, "Apps / windows")
        self.sessions_list = self._make_list(nb, "Sessions")
        self.logs_list = self._make_list(nb, "Activity log")

        self.root.protocol("WM_DELETE_WINDOW", self.on_close)
        self._alive = True
        self.refresh()
        self.root.after(2500, self._tick)

        # Keep writing live.html in background for people who want the file too
        threading.Thread(target=self._html_loop, name="html-loop", daemon=True).start()

    def _make_list(self, notebook, title: str):
        from tkinter import ttk

        frame = ttk.Frame(notebook, padding=6)
        notebook.add(frame, text=title)
        scroll = ttk.Scrollbar(frame)
        scroll.pack(side="right", fill="y")
        lb = self.tk.Listbox(frame, yscrollcommand=scroll.set, font=("Consolas", 10))
        lb.pack(fill="both", expand=True)
        scroll.config(command=lb.yview)
        return lb

    def _fill(self, lb, lines: list[str]) -> None:
        lb.delete(0, "end")
        if not lines:
            lb.insert("end", "(nothing yet)")
            return
        for line in lines:
            lb.insert("end", line)

    def refresh(self) -> None:
        data = self.monitor.store.recent(200)
        st = self.monitor.status()
        ident = st.get("identity") or {}
        self.who_var.set(
            f"{ident.get('username', '?')} on {ident.get('hostname', '?')}  ·  {ident.get('os', '')}"
        )
        self.watch_var.set(
            f"Watching {st.get('watch_count', 0)} folder(s). Test folder: {st.get('fallback_folder')}"
        )
        self.status_var.set("Watching · live  (no Chrome needed)")

        files = []
        for f in data.get("files") or []:
            shot = " [SCREEN]" if f.get("screenshot_path") else ""
            files.append(
                f"{f.get('created_at')}  {f.get('action')}{shot}  {_short(f.get('path'))}"
            )
        self._fill(self.files_list, files)

        wins = [
            f"{w.get('created_at')}  {w.get('process_name')}  {_short(w.get('title'), 60)}"
            for w in (data.get("windows") or [])
        ]
        self._fill(self.windows_list, wins)

        sessions = [
            f"#{s.get('id')}  {s.get('username')}@{s.get('hostname')}  {s.get('started_at')}"
            for s in (data.get("sessions") or [])
        ]
        self._fill(self.sessions_list, sessions)

        logs = [
            f"{l.get('created_at')}  [{l.get('kind')}]  {_short(l.get('message'), 80)}"
            for l in (data.get("logs") or [])
        ]
        self._fill(self.logs_list, logs)

        try:
            write_live_dashboard(data, st)
        except Exception:
            pass

    def _tick(self) -> None:
        if not self._alive:
            return
        try:
            self.refresh()
        except Exception as exc:
            self.status_var.set(f"Refresh error: {exc}")
        self.root.after(2500, self._tick)

    def _html_loop(self) -> None:
        while self._alive:
            time.sleep(3)

    def create_test(self) -> None:
        WATCH_FALLBACK.mkdir(parents=True, exist_ok=True)
        path = WATCH_FALLBACK / f"TEST_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        path.write_text("PC Guard desktop test file — safe to delete.\n", encoding="utf-8")
        if self.monitor.handler is not None:
            self.monitor.handler.record("created", str(path))
        self.refresh()
        self.messagebox.showinfo("PC Guard", f"Test event created:\n{path}")

    def open_snapshots(self) -> None:
        folder = ROOT / "data" / "snapshots"
        folder.mkdir(parents=True, exist_ok=True)
        self._open_path(folder)

    def open_html(self) -> None:
        path = write_live_dashboard(self.monitor.store.recent(200), self.monitor.status())
        self._open_path(path)

    def _open_path(self, path: Path) -> None:
        path = path.resolve()
        try:
            if hasattr(os, "startfile"):
                os.startfile(str(path))  # type: ignore[attr-defined]
            else:
                webbrowser.open(path.as_uri())
        except Exception as exc:
            self.messagebox.showerror("PC Guard", f"Could not open:\n{path}\n\n{exc}")

    def on_close(self) -> None:
        self._alive = False
        try:
            self.monitor.stop()
        except Exception:
            pass
        self.root.destroy()

    def run(self) -> None:
        self.root.mainloop()


def main() -> int:
    try:
        import tkinter  # noqa: F401
    except ImportError:
        print("Tkinter not available. Falling back to file dashboard mode.")
        print("On Windows, reinstall Python from python.org and keep tcl/tk checked.")
        return 2

    print("Starting PC Guard desktop window…")
    print("No Chrome / no internet / no firewall needed.")
    app = DesktopApp()
    app.run()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
