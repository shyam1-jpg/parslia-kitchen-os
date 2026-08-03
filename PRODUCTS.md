# PRODUCTS — always keep separate

> **Rule for humans and agents:** files, nav, logos, domains, and PR copy for each product must stay separate. Forever. No mixing.

| Product | What it is | Allowed paths | Domain / brand |
|---------|------------|---------------|----------------|
| **Parslia Kitchen OS** | Professional kitchen software | Root `index.html`, `styles.css`, `script.js`, `assets/`, Parslia docs | `parslia.app` |
| **Pure Prasad Kitchen** | Ayurvedic / chef brand, daily ideas — **onion & allium-free** (use hing) | `pure-prasad-kitchen/` (+ shared `vegetarian-recipes.txt` kept allium-free) | `pureprasadkitchen.com` |
| **Menu Creator** | Printable menus + allergen boards | `menu-creator/`, related `patches/*menu*` only | Standalone tool (QR may point to Pure Prasad) |
| **Kiteline** | Separate kitchen ops app | Patches only when explicitly requested; not Parslia site | Own app |
| **Libraix / LibriaX** | AI / astrology product | `libraix/` only | Own product |

## Never do this

- Put **Menu Creator** or **Pure Prasad** in the Parslia header, hero, modules, or footer
- Call Menu Creator “Parslia Menu Creator”
- Say Pure Prasad is “part of the Parslia family”
- Drop Libraix or Kiteline features onto the Parslia marketing page
- One PR that rebrands or cross-wires two products “for convenience”

## Always do this

- Change only the product folder the task is about
- Keep separate README / title / brand voice per product
- Name PRs after **one** product
- Read this file before adding any nav link between products

See also: [`AGENTS.md`](./AGENTS.md) and `.cursor/rules/keep-products-separate.mdc`.
