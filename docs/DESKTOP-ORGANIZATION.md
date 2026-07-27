# Desktop organization guide (Windows)

**For:** shyam prasad (`C:\Users\shyam prasad\Desktop\`)  
**Goal:** One clear folder per product. No mixed piles on the Desktop.

---

## Fastest fix (messy Desktop right now)

1. Copy **`TIDY-DESKTOP.bat`** from this repo onto your Desktop  
2. Double-click it  
3. Press any key — it creates 6 folders and moves the mess  

Short version: **`docs/START-HERE-TIDY-DESKTOP.md`**

---

## Your Desktop should look like this

```
Desktop/
├── 01-Parslia/                 ← Parslia Kitchen OS only
├── 02-Libraix/                 ← Libraix AI only
├── 03-Kiteline/                ← Kiteline only (separate product)
├── 04-Accounts-Passwords/      ← login notes, owner guides (private)
├── 05-Media/                   ← videos, logos, screenshots
├── 06-Archive/                 ← old / duplicate folders (do not delete yet)
└── (keep Desktop itself almost empty)
```

Do **not** keep project files loose on the Desktop. Put every file inside one of these folders.

---

## Step-by-step (do this once)

### 1) Create the six folders

Right-click Desktop → New → Folder, and create exactly:

- `01-Parslia`
- `02-Libraix`
- `03-Kiteline`
- `04-Accounts-Passwords`
- `05-Media`
- `06-Archive`

### 2) Move existing folders into the right place

| What you have now | Move it to |
|-------------------|------------|
| `Desktop\parslia-kitchen-os\` | `01-Parslia\parslia-kitchen-os\` (main GitHub copy — keep this) |
| `Desktop\parslia-site\` | `06-Archive\parslia-site\` (old Cursor copy — do not use) |
| `Desktop\parslia-brand\` | `05-Media\parslia-brand\` (logos only) |
| `Desktop\kitchen-os\` or Kiteline folders | `03-Kiteline\` |
| Any Libraix / libraix.ai notes | `02-Libraix\` |
| Owner passwords, login lists, this guide | `04-Accounts-Passwords\` |
| `Downloads\Parshilia.mp4` and screenshots | `05-Media\` |

### 3) Inside each product folder — use this pattern

```
01-Parslia/
├── parslia-kitchen-os/     ← the ONLY code folder you edit
├── notes/                  ← your own notes (.txt / .md)
└── links.txt               ← paste important URLs here

02-Libraix/
├── owner-guide.md          ← copy of docs/LIBRAIX_OWNER_DESKTOP_GUIDE.md
├── notes/
└── links.txt

03-Kiteline/
├── kiteline-repo/          ← Kiteline code only — never mix with Parslia
├── notes/
└── links.txt
```

### 4) What belongs where (quick rules)

| File type | Folder |
|-----------|--------|
| Parslia website / Kitchen OS code | `01-Parslia` |
| Libraix AI app / admin notes | `02-Libraix` |
| Kiteline / Academy / ChatGPT kit | `03-Kiteline` |
| Passwords, Render/Netlify/GitHub logins | `04-Accounts-Passwords` |
| Logos, videos, screenshots, brand PNGs | `05-Media` |
| Old duplicates you are unsure about | `06-Archive` (review later) |

### 5) Products must stay separate

| Product | Domain | Repo |
|---------|--------|------|
| **Parslia** | parslia.app | shyam1-jpg/parslia-kitchen-os |
| **Libraix** | libraix.ai | same repo, folder `libraix/` |
| **Kiteline** | separate | **never** mix into Parslia folders |

If a file could belong to two products, put it in `06-Archive` and ask before merging.

---

## Weekly tidy (5 minutes)

1. Empty Downloads into `05-Media` or the correct product folder  
2. Move any new Desktop files into `01`–`06`  
3. Do not create a seventh random project folder on Desktop  

---

## Important files already in this GitHub repo

After you pull the latest repo, use these paths:

| Need | Path in repo |
|------|----------------|
| Desktop guide (this file) | `docs/DESKTOP-ORGANIZATION.md` |
| Where everything is | `docs/WHERE-IS-EVERYTHING.md` |
| Libraix owner login checklist | `docs/LIBRAIX_OWNER_DESKTOP_GUIDE.md` |
| App Store / launch steps | `docs/CLOUD-LAUNCH-APP-STORE.md` |
| Full repo map | `docs/FILE-MAP.md` |
| Parslia landing page | `index.html` (repo root) |
| Logos | `assets/` |
| Recipes text | `recipes/vegetarian-recipes.txt` |
| Libraix app | `libraix/` |

**Save a copy of this file on Desktop:**  
`04-Accounts-Passwords\DESKTOP-ORGANIZATION.md`

---

## Done when

- [ ] Only the six numbered folders sit on Desktop  
- [ ] One Parslia code folder (`parslia-kitchen-os`) under `01-Parslia`  
- [ ] Old `parslia-site` is in Archive, not used  
- [ ] Kiteline is not inside Parslia  
- [ ] Passwords/guides are in `04-Accounts-Passwords` (not loose)  
- [ ] Media/videos are in `05-Media`
