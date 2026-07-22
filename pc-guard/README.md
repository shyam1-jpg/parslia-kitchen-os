# PC Guard — find out who used your PC and what files they touched

Simple local app for **your own computer**. It runs in the background and records:

1. **Who** — Windows/Mac/Linux username + machine name (optional webcam photo when someone starts using the PC again after idle)
2. **What files** — create / modify / delete / move in Desktop, Documents, Downloads (and Recent on Windows)
3. **Screen shot at that exact time** — every file event saves a full-screen capture so you can see who was at the desk
4. **Face photo (optional)** — webcam still at the same moment if OpenCV is installed
5. **What apps** — foreground window titles while the PC is in use

Everything stays in `pc-guard/data/` on this PC. Nothing is uploaded to the internet.

---

## Quick start (Windows)

Read **`HOW-TO-RUN.txt`** for the shortest steps.

**Default mode needs no internet** — open the local file `data/live.html` only.

Do **not** open `http://127.0.0.1` or `localhost` in Chrome (that causes “Check your Internet connection”).

1. Download the latest zip:  
   https://github.com/shyam1-jpg/parslia-kitchen-os/archive/refs/heads/cursor/pc-usage-guard-d44d.zip
2. Extract → open folder **`pc-guard`**
3. Double-click **`DOUBLE-CLICK-ME`** and keep the black window open
4. If Chrome shows an internet error, close that tab and double-click **`DASHBOARD.html`**  
   or open **`data/live.html`**
5. Double-click **`TEST-NOW`** to create a test file event

If you only see `START` with no `.bat`, that **is** the start file.

Optional face photos:

```bat
.venv\Scripts\pip install opencv-python-headless
```

Then set `webcam_on_file_use` to `true` in `config.json` and restart.

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
| See the screen at that moment | Click the **Screen** thumbnail next to each file |
| See their face (optional) | Install OpenCV, then click **Face** next to the file |
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
| `screenshot_on_file_use` | Take a full-screen shot when a file is used (default true) |
| `webcam_on_file_use` | Take a webcam face photo at the same moment (needs OpenCV) |
| `screenshot_min_interval_seconds` | Minimum gap between new screen shots (stops save floods) |
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
