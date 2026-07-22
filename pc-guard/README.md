# PC Guard — find out who used your PC and what files they touched

Simple local app for **your own computer**. It runs in the background and records:

1. **Who** — Windows/Mac/Linux username + machine name (optional webcam photo when someone starts using the PC again after idle)
2. **What files** — create / modify / delete / move in Desktop, Documents, Downloads (and Recent on Windows)
3. **What apps** — foreground window titles while the PC is in use

Everything stays in `pc-guard/data/` on this PC. Nothing is uploaded to the internet.

---

## Quick start (Windows)

1. Install [Python 3](https://www.python.org/downloads/) (tick **Add to PATH**)
2. Double-click **`START.bat`**
3. Browser opens **http://127.0.0.1:8787** — leave the black window open while you want monitoring on

Optional webcam photos when activity resumes:

```bat
.venv\Scripts\pip install opencv-python-headless
```

Then restart `START.bat`.

---

## Quick start (Mac / Linux)

```bash
cd pc-guard
chmod +x START.sh
./START.sh
```

Open http://127.0.0.1:8787

---

## How to use it

| Goal | What to do |
|------|------------|
| See who was on the PC | Open dashboard → **Sessions** (username + optional photo) |
| See which files they opened/changed | **Files touched** tab |
| See which programs they used | **Apps / windows** tab |
| Catch someone after you left | Leave PC Guard running; when the PC wakes from idle it logs “Someone is using the PC again” |

**Tip:** Start PC Guard before you leave the desk. Keep the console window open (or minimize it).

---

## Settings

Edit `config.json`:

| Setting | Meaning |
|---------|---------|
| `watch_folders` | Extra folders to watch (empty = auto Desktop/Documents/Downloads) |
| `idle_seconds` | How long quiet before “idle” (default 120) |
| `webcam_on_activity` | Take a photo when session starts / returns from idle |
| `dashboard_port` | Web UI port (default 8787) |
| `log_active_window` | Record app window titles |

---

## Privacy & honesty

- This is for **your own PC** that you own or administer.
- Tell household members if you monitor a shared computer.
- Webcam photos are stored only under `data/snapshots/`.
- Delete `data/activity.db` anytime to wipe history.

---

## Files in this folder

| File | Purpose |
|------|---------|
| `START.bat` / `START.sh` | One-click start |
| `app.py` | Monitor + dashboard |
| `guard_core.py` | Logging, file watch, idle, webcam |
| `config.json` | Options |
| `data/` | Database + snapshots (created automatically) |
