# Push this folder as its own private GitHub repo

**To go live from the existing `parslia-kitchen-os` repo instead:** Render → **New → Blueprint** → repo `parslia-kitchen-os` → branch `cursor/vedanta-render-deploy-f604` → Blueprint path `vedanta-platform/render.monorepo.yaml` → Apply. First sign-in: `shyam_1@hotmail.co.uk` (no password).

---

Render’s Blueprint expects `render.yaml` at the **repository root**. This folder is that root.

```
cd vedanta-platform
git init
git add -A
git commit -m "Vedanta platform"
git branch -M main
git remote add origin https://github.com/<your-username>/vedanta-platform.git
git push -u origin main
```

Then on render.com: **New → Blueprint → vedanta-platform → Apply**.

Already have this code on the `parslia-kitchen-os` repo? Apply `vedanta-platform/render.monorepo.yaml` instead (same three services; paths are prefixed).
