# Apply Kiteline public legal / wording corrections

Kiteline is an **independent software brand** and is **not** owned by, operated by, affiliated with, or a trading name of The Vedanta Way Limited.

## What this package changes

- Public marketing and legal HTML under `site/`
- Demo sample legal name scrub in `js/store.js`
- Does **not** redesign layout/colours
- Does **not** invent “Kiteline Limited” or a company number
- Footer on public pages:

> © 2026 Kiteline. All rights reserved. Kiteline is an independent software brand and is not operated by or affiliated with The Vedanta Way Limited.

## Apply on kitline1

```bash
cd /path/to/kitline1
git apply kiteline-saas/deploy/kitline1-public-legal-copy.patch
# or extract overlay:
# tar -xzf kiteline1-public-legal-copy.tar.gz -C .
```

Or run the fixer against a checkout:

```bash
python3 kiteline-saas/scripts/fix-public-legal-copy.py /path/to/kitline1
```

Then manually confirm pricing site allowances and privacy “Current service providers” sections if the script was run alone (the patch includes the full polished pages).

## After apply — verify

```bash
rg -n -i 'trading name of|Vedanta Way Ltd|Kiteline Limited|EHO-ready|All modules included|Plus VAT|Reset link on screen' site --glob '!vedanta-*/*'
# Footer disclaimer may still mention The Vedanta Way Limited (disaffiliation only).
```
