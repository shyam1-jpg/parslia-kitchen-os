# Agent rules — keep every product SEPARATE

**Always.** Do not mix Parslia, Pure Prasad Kitchen, Menu Creator, Kiteline, or Libraix.

Full map: [`PRODUCTS.md`](./PRODUCTS.md)

## Hard rules

1. **One product per change.** If the user asks about Pure Prasad, only touch Pure Prasad files. Same for Menu Creator, Parslia, Kiteline, Libraix.
2. **No cross-brand nav or marketing.** Never add Menu Creator / Pure Prasad / Kiteline / Libraix links into the Parslia landing page (`index.html` at repo root).
3. **No borrowed logos or names.** Do not put Parslia logos, “Parslia Kitchen OS”, or Parslia emails on Menu Creator or Pure Prasad pages (and the reverse).
4. **Folders are walls.**
   - Parslia → repo root marketing files + `assets/`
   - Pure Prasad Kitchen → `pure-prasad-kitchen/` only
   - Menu Creator → `menu-creator/` (+ its `patches/` helpers) only
   - Libraix → `libraix/` only
   - Kiteline → outside this site; patches only when explicitly asked
5. **Shared monorepo ≠ shared brand.** Files may live in one GitHub repo for convenience. Brands must stay separate in UI, copy, domains, and PRs.
6. **PR titles must name one product.** Example: `Menu Creator: …` or `Pure Prasad Kitchen: …` or `Parslia: …` — not a mash-up.
7. **If unsure which product:** ask, or default to the folder that already owns that feature. Do not “helpfully” wire it into Parslia.

## Allowed shared tooling

- Root `PRODUCTS.md`, `AGENTS.md`, `.cursor/` rules, and generic CI that do not brand-mix UIs.
- Do not use shared tooling as an excuse to cross-link products in the customer-facing UI.
