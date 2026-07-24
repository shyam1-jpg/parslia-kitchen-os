# Kiteline dashboard + Clock In/Out fixes (apply in `shyam1-jpg/kitline1`)

This Cloud Agent environment can write to `parslia-kitchen-os` only. Kiteline lives in **`shyam1-jpg/kitline1`**.

## Apply

```bash
git clone https://github.com/shyam1-jpg/kitline1.git
cd kitline1
git checkout -b cursor/kiteline-app-fixes-18ca
git apply /path/to/kitline1-dashboard-fixes.patch
git add -A && git commit -m "Fix Kiteline dashboard gaps and add Clock In/Out kiosk"
git push -u origin cursor/kiteline-app-fixes-18ca
```

## Clock In / Out

- Sidebar: **Live Ops → Clock In/Out**
- Home: PIN-pad kiosk widget (right column)
- Full page `#clock`: live clock, PIN pad, staff cards, today’s attendance log
- Enter 4-digit PIN → toggles clock in/out for that person (saved to kitchen)
- Demo PINs (examples): Sarah `1234`, James `2345`, Lena `3456`, Marco `4567`
- Manage PINs on **Team** page · pairs with **Rota**

## Other fixes in this patch

Live 30s polling, CSS status dots, per-kitchen workflows, overdue recalc,
task Open modal, pagination, notifications dropdown, Ctrl+K search,
Launch routes, mobile nav, temp live banner, clock session hydrate merge.
