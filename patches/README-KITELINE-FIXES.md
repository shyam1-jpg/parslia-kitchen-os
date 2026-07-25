# Kiteline dashboard + Clock In/Out fixes (apply in `shyam1-jpg/kitline1`)

This Cloud Agent environment can write to `parslia-kitchen-os` only. Kiteline lives in **`shyam1-jpg/kitline1`**.

## Apply

```bash
git clone https://github.com/shyam1-jpg/kitline1.git
cd kitline1
git checkout -b cursor/kiteline-app-fixes-18ca
git apply /path/to/kitline1-dashboard-fixes.patch
git add -A && git commit -m "Fix Kiteline dashboard gaps and Clock PIN matching"
git push -u origin cursor/kiteline-app-fixes-18ca
```

Then hard-refresh the app (**Ctrl+Shift+R**) so the service worker picks up the new build.

## Clock PIN (if you see “Wrong PIN”)

- Use the **PIN printed on the staff card** or the **demo chips** on the pad — not the Settings security PIN.
- Demo codes (by name): Sarah `1234`, James `2345`, Lena `3456`, Marco `4567`
- Also works for private starter-pack names like `Sarah Mitchell (sample)` → `1234`
- The PIN modal now shows **This person’s PIN is ####** so you cannot mistype the wrong code for that person.

## Clock In / Out

- Sidebar: **Live Ops → Clock In/Out**
- Home: PIN-pad kiosk widget
- Full page `#clock`: live clock, PIN pad, staff cards, attendance log
- Manage PINs on **Team** · pairs with **Rota**

## Other fixes in this patch

Live 30s polling, CSS status dots, per-kitchen workflows, overdue recalc,
task Open modal, pagination, notifications dropdown, Ctrl+K search,
Launch routes, mobile nav, temp live banner, clock session hydrate merge.
