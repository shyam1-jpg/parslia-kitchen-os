# Apply Compliance Phase 1 to kiteline.uk

```bash
# Preferred
node kiteline-saas/scripts/apply-compliance-phase1.js /path/to/kitline1

# Or
cd /path/to/kitline1
git apply /path/to/kiteline-saas/deploy/kitline1-compliance-phase1.patch
```

Then commit/push kitline1 and deploy Render.

In the app: **Compliance checks** → load Kiteline templates → run a fridge check with 8.2°C to see defect + CA.
