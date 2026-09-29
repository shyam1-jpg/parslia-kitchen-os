# Kiteline SaaS — Phases A–D + E (complete)

Professional multi-company / multi-location foundation for **kiteline.uk**.  
Keeps the current teal/ink UI, sidebar, and layout.

## Status

| Phase | Contents | Verified locally |
|-------|----------|------------------|
| **A** | Postgres schema + RLS | 33 tables, isolation PASS |
| **B** | Tenancy API + scoped state | 7/7 unit tests |
| **C** | Switcher, Team, Clock, Reports | Integrated smoke PASS |
| **D** | Stock + Orders | 5/5 unit tests |
| **E** | Security hardening + deploy checklist | Hardened server: demo false, Vedanta 401 |

**Live kiteline.uk is not updated until you apply + deploy** (no push access to `kitline1` from this agent).

## Apply everything

```bash
node scripts/apply-all-to-kitline1.js /path/to/kitline1
```

Or: `deploy/kitline1-saas-all.patch`  
Details: `deploy/APPLY_TO_KITLINE1.md` · `docs/ALL_PHASES.md`

## Verify

```bash
./scripts/verify-all.sh
# or individually:
./scripts/verify-schema.sh
node tests/saas-unit-test.js
node tests/inventory-unit-test.js
```

## Layout

```
kiteline-saas/
  schema/           Phase A SQL + RLS
  runtime/          Phase B/C/D server + JS
  deploy/           Patches, hardening, checklists
  docs/             Roles, workflow, phase notes
  scripts/          apply-all, apply-bc, verify
  tests/            schema isolation + unit tests
```
