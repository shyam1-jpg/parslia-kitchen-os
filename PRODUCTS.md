# Products map — keep these SEPARATE

This repo historically got used as a catch-all. **Do not mix brands in UI, nav, or marketing copy.**

| Product | What it is | Where it should live |
|---------|------------|----------------------|
| **Parslia Kitchen OS** | Professional kitchen software marketing / app | Repo root: `index.html`, `styles.css`, `script.js`, `assets/` — domain `parslia.app` |
| **Pure Prasad Kitchen** | Home Ayurvedic daily ideas brand | `pure-prasad-kitchen/` only — **no Parslia nav/footer links** |
| **Menu Creator** | Printable menu / allergen boards (QR → Pure Prasad Kitchen) | `menu-creator/` only — **never** link from Parslia nav/features |
| **Kiteline** | Separate kitchen ops product | Separate codebase / desktop folder — not Parslia site |
| **Libraix / LibriaX** | AI / astrology product | `libraix/` only |

## Rules for agents

1. Never add Pure Prasad, Menu Creator, Kiteline, or Libraix into the Parslia header/hero as if they are one product.
2. Never brand Menu Creator screens with Parslia logos or “Parslia Kitchen OS”.
3. Pure Prasad pages must not say “part of the Parslia kitchen family”.
4. If work is for Menu Creator, put files under `menu-creator/` (or the dedicated Menu Creator repo) — not in Parslia marketing files.
5. Shared monorepo is OK for storage; **brands must stay visually and copy-wise separate**.
