# Pure Prasad Kitchen — daily Ayurvedic tip automation

Use this at [cursor.com/automations](https://cursor.com/automations).

## Trigger

- **Type:** Scheduled
- **Cron:** `0 7 * * *` (07:00 UTC daily — change to your local morning)
- **Repository:** `shyam1-jpg/parslia-kitchen-os` (required so the agent can edit files / open a PR)

## Prompt (copy everything below)

```text
You maintain Pure Prasad Kitchen daily Ayurvedic content in this repo.

Goal: publish ONE new, practical Ayurvedic kitchen idea for today.

Rules:
1. Read `pure-prasad-kitchen/content/tips.json` and `pure-prasad-kitchen/content/today.json`.
2. Write a brand-new tip that is NOT a duplicate of today’s tip title and is clearly different from the last 14 tip titles in the bank.
3. Tip must be kitchen / food / digestion / daily rhythm focused, warm, practical, and safe. No medical claims, no disease treatment, no supplements dosing.
4. Update `pure-prasad-kitchen/content/today.json` with:
   - date: today's ISO date (YYYY-MM-DD)
   - source: "automation"
   - tip: { id: next integer after max id in tips.json, theme, title, idea, action, season, dosha_focus }
   - note: one short line about what you created
5. Append the same tip object into `pure-prasad-kitchen/content/tips.json` (increment count / updated fields).
6. Keep tone aligned with Pure Prasad Kitchen: calm, home-kitchen, prasad-minded, Indian / Ayurvedic inspired.
7. Open a PR titled: `Pure Prasad Kitchen: daily Ayurvedic idea YYYY-MM-DD`
8. Do not change unrelated Parslia / Libraix product code.

Quality bar: if you cannot create a meaningfully new tip, do nothing and explain why.
```

## Tools to enable

- Pull request creation: **on**
- Memories: **on** (so it remembers recent tip themes)

## After first activate

Confirm a run appears under Automations → history, and that `pure-prasad-kitchen/content/today.json` updates for that date.
