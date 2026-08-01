# Pure Prasad Kitchen

Everyday Ayurvedic kitchen ideas — **something new each day**.

## Live page

- Path: `/pure-prasad-kitchen/`
- Local: open `pure-prasad-kitchen/index.html` or run a static server from the repo root

## How “auto every day” works

1. **Built-in (always on)**  
   `daily.js` loads `content/today.json` when the date matches today; otherwise it rotates through `content/tips.json` by calendar day. Visitors always see a fresh idea without any login.

2. **Cursor Automation (AI fresh tip)**  
   Copy the prompt from `.cursor/automations/pure-prasad-daily.md` into a daily scheduled automation at [cursor.com/automations](https://cursor.com/automations) with this repository selected. Each morning the agent writes a new tip into `today.json` and can open a PR.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Pure Prasad Kitchen page |
| `styles.css` / `daily.js` | Design + daily loader |
| `content/tips.json` | Tip bank (120+ ideas) |
| `content/today.json` | Featured tip for a specific date |
| `.cursor/automations/pure-prasad-daily.md` | Automation prompt to paste into Cursor |

## Disclaimer

Educational kitchen wellness ideas inspired by Ayurvedic traditions. Not medical advice.
