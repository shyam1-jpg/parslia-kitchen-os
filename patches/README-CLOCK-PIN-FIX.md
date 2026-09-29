# Fix: Clock In/Out “Wrong PIN” (Sarah `1234`)

Apply this in the **`shyam1-jpg/kitline1`** repo (this Cloud Agent cannot push there).

## Why it fails

- Login password **`demo1234` is not a clock PIN**.
- Demo staff (Sarah Mitchell, etc.) often had **no `clockPin`** in seed data.
- Old localStorage then got auto-generated PINs like **`1111`**, so entering **`1234`** shows **Wrong PIN**.

## Apply

```bash
git clone https://github.com/shyam1-jpg/kitline1.git
cd kitline1
git checkout -b cursor/fix-clock-pins-a221
git apply /path/to/parslia-kitchen-os/patches/kitline1-clock-pin-fix.patch
git add -A
git commit -m "Fix Wrong PIN on Clock In/Out for demo staff"
git push -u origin cursor/fix-clock-pins-a221
```

On Windows (PowerShell), from a checkout of both repos:

```powershell
cd path\to\kitline1
git checkout -b cursor/fix-clock-pins-a221
git apply path\to\parslia-kitchen-os\patches\kitline1-clock-pin-fix.patch
git add -A
git commit -m "Fix Wrong PIN on Clock In/Out for demo staff"
git push -u origin cursor/fix-clock-pins-a221
```

Then on the kitchen PC: **Ctrl+Shift+R** (hard refresh).

## Demo clock PINs (after patch)

| Person | Clock PIN |
|--------|-----------|
| Sarah Mitchell | `1234` |
| James Okafor | `2345` |
| Lena Park | `3456` |
| Marco Rossi | `4567` |
| Owner (Shyam) | `1001` |

## Temporary workaround (before patch)

If the Wrong PIN toast still appears, the stale generated PIN for Sarah is usually **`1111`**. Or open **Team**, set Sarah’s kitchen PIN to `1234`, save, then try Clock In again.

After this patch, signed-in **Admin / Manager** can use **Clock me in / out** (no PIN) or tap staff cards without entering a PIN.
