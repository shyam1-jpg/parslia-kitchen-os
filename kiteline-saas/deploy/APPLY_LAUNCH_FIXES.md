# Apply Kiteline launch readiness fixes

Fixes from external site audit:

1. Remove global `noindex` (marketing pages indexable; `/app` stays noindex)
2. Add `/robots.txt` and `/sitemap.xml`
3. Add `Strict-Transport-Security` + `Content-Security-Policy`
4. Clean URLs: `/privacy`, `/terms`, `/pricing`, etc.
5. Fix broken characters on legal pages; temporary legal-operator wording (no Vedanta)
6. Pricing: early-access invoice wording, no VAT charged, Recipe AI pilot
7. Compress `kiteline-logo.png` (~1.4MB → ~150KB)

## Apply to kitline1

```bash
cd /path/to/kitline1
git apply /path/to/parslia-kitchen-os/kiteline-saas/deploy/kitline1-launch-fixes.patch
# or:
node /path/to/parslia-kitchen-os/kiteline-saas/scripts/apply-launch-fixes.js .

git add -A
git commit -m "Launch readiness fixes for kiteline.uk"
git push origin main
```

Then wait for Render (`kitline1` service) to redeploy.

## Verify

```bash
curl -sI https://kiteline.uk/ | grep -iE 'robots|strict-transport|content-security'
curl -sI https://kiteline.uk/privacy | head -5
curl -s https://kiteline.uk/robots.txt
curl -s https://kiteline.uk/api/health
```

Expected: no `noindex` on homepage; `/privacy` returns 200; health build contains `launch-fixes`.
