# Kiteline guides, richer prints, clock PIN fix

Apply in **`shyam1-jpg/kitline1`** (this Cloud Agent can only push Parslia patches).

## Apply

```bash
git clone https://github.com/shyam1-jpg/kitline1.git
cd kitline1
git checkout -b cursor/kiteline-guides-print-clock-18ca
# Prefer applying on top of security-hardening if that branch is already merged locally
git apply /path/to/kitline1-guides-print-clock.patch
git add -A && git commit -m "Add how-to guides, richer HACCP prints, fix clock PINs"
git push -u origin cursor/kiteline-guides-print-clock-18ca
```

Hard-refresh (**Ctrl+Shift+R**) after deploy. Build id: `2026-07-30-guides-print-clock`.

## What this adds

### In-app User Manual / how-to
- Left menu → **User Manual** lists step-by-step guides (searchable).
- Contextual **How to use this page** panels on Clock, Temps, Cleaning Status, HACCP Status, Equipment Maintenance, Probe Calibration, Compliance overview.
- Covers: clock PIN, fridge/freezer temps, probe calibration (“crop coloration”), equipment PPM, cleaning/HACCP print packs.

### Clock In/Out (Wrong PIN)
- **Clock In/Out** and **Rota & Shifts** are in the left Live Ops menu.
- Login password (e.g. `demo1234`) is **not** the clock PIN.
- Demo PINs restored every load (Sarah `1234`, James `2345`, Lena `3456`, Marco `4567`, Owner `1001`, Vedanta/Govindas codes as seeded).
- Shared PIN pad + tappable demo chips + PIN shown on staff cards.
- Clear “Wrong PIN — not your login password” message.
- Admin/Manager: **Clock me in** / staff cards skip PIN; staff still use the pad.

### Richer printable reports
- Cleaning Status / HACCP Status → **Print detailed report** (site address, counts, full task table, sign-off line).
- Compliance → **Print** includes module guide text + site meta.
- **View full record** → human field labels + **Print detailed record** with sign-off lines.

## Demo clock PINs

| Person | PIN |
|--------|-----|
| Sarah (Grove) | 1234 |
| James (Grove) | 2345 |
| Lena | 3456 |
| Marco | 4567 |
| Owner Shyam | 1001 |
| Priya (Vedanta) | 1111 |

## Local smoke test

```bash
node scripts/test-guides-clock-print.js
```
