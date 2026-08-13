# Guard (web app)

Open in any browser — **not** a Windows desktop app.

## Open it

After this branch is on GitHub Pages / your site:

- `/guard/` on your domain, or  
- open `guard/index.html` from the repo

Local preview:

```bash
python -m http.server 8000
```

Then visit: http://localhost:8000/guard/

## What it does

1. Set a PIN (only you can open the log)
2. Click **Start watching**
3. Allow camera → photos of who is at the screen
4. Optional: **Screen shot**, **Pick file**, **Pick folder** (Chrome/Edge)
5. Timeline of activity stays in **this browser only** (not uploaded)

## Important

A website cannot see every file on your PC by itself (browser security).  
This web Guard records:

- who was at the browser (camera)
- when the tab was used
- files/folders you choose to log
- optional screen captures you approve
