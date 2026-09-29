# Kiteline dashboard + Clock In/Out fixes (apply in `shyam1-jpg/kitline1`)

This Cloud Agent environment can write to `parslia-kitchen-os` only. Kiteline lives in **`shyam1-jpg/kitline1`**.

## Apply

```bash
git clone https://github.com/shyam1-jpg/kitline1.git
cd kitline1
git checkout -b cursor/kiteline-app-fixes-18ca
git apply /path/to/kitline1-dashboard-fixes.patch
git add -A && git commit -m "Fix Kiteline clock PIN + Admin one-tap clock"
git push -u origin cursor/kiteline-app-fixes-18ca
```

Then hard-refresh (**Ctrl+Shift+R**).

## If you are Admin and clock “does not work”

1. Login password (`demo1234`) is **not** the clock PIN.
2. Admin Sarah’s clock PIN is **`1234`**.
3. After this patch, as Admin/Manager you can:
   - Tap **Clock me in** at the top of Clock In/Out
   - Tap any staff card — **no PIN needed**
4. Shared kiosk pad still uses 4-digit PINs (chips show them).

## Demo clock PINs

Sarah `1234` · James `2345` · Lena `3456` · Marco `4567` · Owner `1001`
