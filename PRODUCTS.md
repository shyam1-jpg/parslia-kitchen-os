# Products map — keep these SEPARATE

This monorepo is only storage. **Do not mix brands in UI, nav, or marketing copy.**

| Product | What it is | Where it should live |
|---------|------------|----------------------|
| **Parslia Kitchen OS** | Professional kitchen software marketing / app | Repo root: `index.html`, `styles.css`, `script.js`, `assets/` — domain `parslia.app` |
| **Pure Prasad Kitchen** | Home Ayurvedic / chef brand | Own site `pureprasadkitchen.com` (folder `pure-prasad-kitchen/` if present) — **no Parslia nav** |
| **Menu Creator** | Printable menu / allergen boards (QR → Pure Prasad) | `menu-creator/` only — **never** link from Parslia nav/features |
| **Kiteline** | Separate kitchen ops product | Separate codebase — not Parslia site |
| **Libraix / LibriaX** | AI / astrology product | `libraix/` only |

## Rules for agents

1. Never add Pure Prasad, Menu Creator, Kiteline, or Libraix into the Parslia header/hero as if they are one product.
2. Never brand Menu Creator screens with Parslia logos or “Parslia Kitchen OS”.
3. Pure Prasad pages must not say “part of the Parslia kitchen family”.
4. If work is for Menu Creator, change files under `menu-creator/` / patches — not Parslia marketing copy.
5. Shared monorepo is OK for storage; **brands must stay visually and copy-wise separate**.
