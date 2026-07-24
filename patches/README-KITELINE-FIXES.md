# Kiteline dashboard fixes (apply in `shyam1-jpg/kitline1`)

This Cloud Agent environment can write to `parslia-kitchen-os` only. Kiteline lives in **`shyam1-jpg/kitline1`** and must stay separate.

## Apply

```bash
git clone https://github.com/shyam1-jpg/kitline1.git
cd kitline1
git checkout -b cursor/kiteline-app-fixes-18ca
git apply path/to/kitline1-dashboard-fixes.patch
git add -A && git commit -m "Fix Kiteline dashboard gaps: live polling, status dots, kitchen data"
git push -u origin cursor/kiteline-app-fixes-18ca
```

Or copy the five files from this patch over the matching paths in `kitline1`.

## What this fixes

1. Happening Now / live views refresh every **30s**
2. Broken `??` status markers → CSS coloured dots
3. Overdue badge recalculates on tick / complete / kitchen switch
4. Status legend dots restored
5. Clock-in sessions merge on server hydrate (survive refresh)
6. Temperature cards show live refresh + 5‑min ingest cadence
7. Kitchen switcher loads **per-site** workflows (Grove / Dockside / etc.)
8. Back to Home wired via `data-go="home"`
9. Real Prev/Next + page-number pagination
10. **Open** opens a task detail modal (assignee, steps, corrective actions)
11. SafeServe / MenuGuard / LabelSmart / WasteWise Launch routes
12. Ctrl/⌘K searches tasks, staff, kitchens, pages
13. Mobile sidebar / header overflow improvements
14. Notifications bell dropdown with open alerts
15. Settings copy cleaned (page already had PIN / billing / integrations)

