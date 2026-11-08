#!/usr/bin/env python3
"""Download vegan and vegetarian recipes from The Kitchn into a Desktop folder.

The Kitchn blocks datacenter IPs; pages are read through r.jina.ai.
"""

from __future__ import annotations

import html
import json
import re
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO_DESKTOP = ROOT / "Desktop" / "Kitchn-Vegan-Vegetarian-Recipes"
HOME_DESKTOP = Path.home() / "Desktop" / "Kitchn-Vegan-Vegetarian-Recipes"
CACHE = ROOT / "recipes" / "kitchn-vegan-vegetarian" / ".cache"
UA = "ParsliaKitchenOS/1.0 (personal recipe archive; +https://parslia.app)"
JINA = "https://r.jina.ai/"

SKIP_SLUG = re.compile(
    r"(?i)("
    r"^\d+-|"
    r"week-of-|a-week-of-|here.s-every|every-vegetarian|best-vegan|"
    r"easy-vegan-recipes|meatless-meals|shopping-list|meal-templates|"
    r"mistakes-to-avoid|must-make-vegan|plant-based-meal-prep|"
    r"high-protein-vegetarian-meals|collection/|authors/|membership|"
    r"newsletters|about/"
    r")"
)
RECIPE_URL = re.compile(r"https://www\.thekitchn\.com/[a-z0-9-]+-\d+")
MD_LINK = re.compile(r"\[([^\]]+)\]\((https://www\.thekitchn\.com/[^)\s]+)\)")
MEAT_RE = re.compile(
    r"(?i)\b("
    r"chicken|turkey|beef|pork|lamb|bacon|sausage|prosciutto|pancetta|"
    r"ham\b|steak|salmon|tuna|anchovy|shrimp|prawn|crab|lobster|"
    r"cod\b|halibut|sardine|clam|mussel|oyster|fish sauce|fish\b|"
    r"ground meat|pepperoni"
    r")\b"
)
EGG_ONLY_OK = True

LIST_SOURCES = {
    "vegan": ("https://www.thekitchn.com/collection/vegan", 23),
    "vegetarian": ("https://www.thekitchn.com/collection/vegetarian", 64),
}


def fetch(url: str, dest: Path, retries: int = 3) -> str:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 800:
        return dest.read_text(encoding="utf-8", errors="replace")
    last_err = None
    for attempt in range(retries):
        req = urllib.request.Request(
            JINA + url,
            headers={"User-Agent": UA, "Accept": "text/plain"},
        )
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                text = resp.read().decode("utf-8", "replace")
            if "verify you are a human" in text.lower() and len(text) < 2500:
                last_err = "bot wall"
                time.sleep(1.5 + attempt)
                continue
            dest.write_text(text, encoding="utf-8")
            return text
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            time.sleep(1.2 * (attempt + 1))
    raise RuntimeError(f"failed {url}: {last_err}")


def extract_urls(text: str) -> list[str]:
    found = []
    for title, url in MD_LINK.findall(text):
        url = url.split("#")[0].split("?")[0].rstrip("/")
        if not RECIPE_URL.fullmatch(url) and not re.search(r"thekitchn\.com/.+-\d+$", url):
            if not re.search(r"thekitchn\.com/(recipe-|how-to-)", url):
                continue
        slug = url.rsplit("/", 1)[-1]
        if SKIP_SLUG.search(slug):
            continue
        found.append(url)
    for url in RECIPE_URL.findall(text):
        url = url.rstrip("/")
        slug = url.rsplit("/", 1)[-1]
        if SKIP_SLUG.search(slug):
            continue
        found.append(url)
    # de-dupe preserve order
    out, seen = [], set()
    for u in found:
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def clean_line(s: str) -> str:
    s = html.unescape(s)
    s = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", s)
    s = re.sub(r"\s+", " ", s).strip(" \t-•*")
    return s


def parse_recipe(text: str, url: str, diet_tag: str) -> dict | None:
    title_m = re.search(r"^Title:\s*(.+)$", text, re.M)
    title = (title_m.group(1).strip() if title_m else "") or url.rsplit("/", 1)[-1]
    title = re.sub(r"\s+\| The Kitchn$", "", title)
    title = re.sub(r"^Recipe:\s*", "", title)

    # Prefer the structured Ingredients / numbered method block
    ings: list[str] = []
    steps: list[str] = []
    ing_block = re.search(
        r"### Ingredients\n(.*?)(?:\n(?:\d+\.\s|### Recipe Notes|### |## More|Filed in:))",
        text,
        re.S,
    )
    if ing_block:
        raw = ing_block.group(1)
        for line in raw.splitlines():
            line = clean_line(line)
            if line.startswith("*") or (line and not line.startswith("#")):
                line = line.lstrip("* ").strip()
            if line and not line.lower().startswith("credit:"):
                ings.append(line)

    # numbered steps after ingredients
    after = text
    if ing_block:
        after = text[ing_block.end() - 20 :]
    for m in re.finditer(r"^\d+\.\s+(.*)$", after, re.M):
        step = clean_line(m.group(1))
        if step and len(step) > 8:
            steps.append(step)
        if len(steps) >= 20:
            break

    if len(ings) < 3:
        # fallback: Key Ingredients bullets
        key = re.search(r"## Key Ingredients.*?\n(\*.*?)(?:\n## )", text, re.S)
        if key:
            for line in key.group(1).splitlines():
                line = clean_line(line)
                if line.startswith("**") or line:
                    ings.append(re.sub(r"^\*+\s*", "", line))
    if len(steps) < 2:
        how = re.search(r"## How to .*?\n((?:\d+\.\s+.*\n?)+)", text)
        if how:
            steps = [clean_line(x) for x in re.findall(r"\d+\.\s+(.*)", how.group(1))]

    ings = [i for i in ings if i and i.lower() not in {"ingredients", "cook mode+"}]
    # merge broken jina lines that are amount / name split
    merged: list[str] = []
    i = 0
    while i < len(ings):
        cur = ings[i]
        if re.fullmatch(r"[\d/.\s]+(?:cups?|tablespoons?|teaspoons?|pounds?|ounces?|tbsp|tsp)?", cur, re.I) and i + 1 < len(ings):
            merged.append(f"{cur} {ings[i + 1]}")
            i += 2
            continue
        merged.append(cur)
        i += 1
    ings = merged

    blob = title + "\n" + "\n".join(ings) + "\n" + "\n".join(steps)
    if MEAT_RE.search(blob):
        return None
    if len(ings) < 3 or len(steps) < 2:
        return None

    serves = None
    m = re.search(r"Serves\s+(\d+)", text)
    if m:
        serves = m.group(1)
    prep = None
    m = re.search(r"Prep\s+(\d+\s+minutes?)", text)
    if m:
        prep = m.group(1)

    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:80]
    return {
        "title": title,
        "slug": slug,
        "url": url,
        "diet": diet_tag,
        "serves": serves,
        "prep": prep,
        "ingredients": ings[:40],
        "method": steps[:20],
        "summary": clean_line(
            next(
                (
                    ln
                    for ln in text.splitlines()
                    if 80 < len(ln) < 240 and not ln.startswith("[") and "http" not in ln
                ),
                "",
            )
        ),
    }


def _list_job(diet: str, page: int, base: str) -> tuple[str, int, list[str]]:
    url = base if page == 1 else f"{base}?page={page}"
    dest = CACHE / "lists" / f"{diet}-{page}.md"
    text = fetch(url, dest)
    return diet, page, extract_urls(text)


def collect_index() -> dict[str, set[str]]:
    CACHE.mkdir(parents=True, exist_ok=True)
    by_diet: dict[str, set[str]] = {"vegan": set(), "vegetarian": set()}
    jobs = []
    for diet, (base, last) in LIST_SOURCES.items():
        for page in range(1, last + 1):
            jobs.append((diet, page, base))
    print(f"listing {len(jobs)} collection pages", flush=True)
    with ThreadPoolExecutor(max_workers=6) as pool:
        futs = [pool.submit(_list_job, d, p, b) for d, p, b in jobs]
        for fut in as_completed(futs):
            try:
                diet, page, urls = fut.result()
            except Exception as exc:  # noqa: BLE001
                print("  list fail", exc, flush=True)
                continue
            print(f"  {diet} p{page} -> {len(urls)} urls", flush=True)
            if page <= 64 and len(urls) >= 8:
                by_diet[diet].update(urls)
    for diet, urls in by_diet.items():
        print(f"{diet} unique urls {len(urls)}", flush=True)
    return by_diet


def write_outputs(recipes: list[dict]) -> None:
    recipes.sort(key=lambda r: (r["diet"], r["title"].lower()))
    for dest_root in (REPO_DESKTOP, HOME_DESKTOP, ROOT / "recipes" / "kitchn-vegan-vegetarian"):
        dest_root.mkdir(parents=True, exist_ok=True)
        (dest_root / "vegan").mkdir(exist_ok=True)
        (dest_root / "vegetarian").mkdir(exist_ok=True)

        (dest_root / "kitchn-vegan-vegetarian.json").write_text(
            json.dumps({"count": len(recipes), "recipes": recipes}, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

        lines = [
            "THE KITCHN — VEGAN AND VEGETARIAN RECIPES",
            f"{len(recipes)} recipes downloaded for your Desktop folder.",
            "Source: https://www.thekitchn.com/recipes",
            "Vegetarian and vegan tagged collections. Meat and fish dishes removed.",
            "",
        ]
        for r in recipes:
            lines += [
                "─" * 50,
                f"{r['title']}  [{r['diet']}]",
                "─" * 50,
                "",
            ]
            if r.get("summary"):
                lines += [r["summary"], ""]
            meta = []
            if r.get("serves"):
                meta.append(f"Serves {r['serves']}")
            if r.get("prep"):
                meta.append(f"Prep {r['prep']}")
            if meta:
                lines += ["  ".join(meta), ""]
            lines.append("Ingredients")
            for item in r["ingredients"]:
                lines.append(f"• {item}")
            lines += ["", "Method"]
            for i, step in enumerate(r["method"], 1):
                lines.append(f"{i}. {step}")
            lines += ["", ""]
        txt = "\n".join(lines)
        (dest_root / "ALL-RECIPES.txt").write_text(txt, encoding="utf-8")

        cards = []
        for r in recipes:
            ings = "".join(f"<li>{html.escape(i)}</li>" for i in r["ingredients"])
            steps = "".join(f"<li>{html.escape(s)}</li>" for s in r["method"])
            cards.append(
                f'<article class="card" data-diet="{html.escape(r["diet"])}" data-title="{html.escape(r["title"].lower())}">'
                f"<h2>{html.escape(r['title'])}</h2>"
                f'<p class="meta">{html.escape(r["diet"])}</p>'
                f"<h3>Ingredients</h3><ul>{ings}</ul>"
                f"<h3>Method</h3><ol>{steps}</ol></article>"
            )
        html_doc = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kitchn vegan and vegetarian recipes</title>
<style>
body{{font-family:Georgia,serif;background:#F7F4EA;color:#10231D;margin:0}}
header{{background:#063F32;color:#fff;padding:24px}}
.wrap{{max-width:900px;margin:0 auto;padding:16px}}
input{{width:100%;padding:10px;margin:12px 0;font-size:1rem}}
.chip{{margin-right:8px;padding:6px 12px;border-radius:999px;border:1px solid #D8CDBA;background:#fff;cursor:pointer}}
.chip.active{{background:#063F32;color:#fff}}
.card{{background:#fff;border:1px solid #D8CDBA;border-radius:14px;padding:18px;margin:0 0 16px}}
.hidden{{display:none}}
</style></head><body>
<header><div class="wrap"><h1>Kitchn vegan and vegetarian recipes</h1>
<p>{len(recipes)} dishes saved on your Desktop.</p></div></header>
<div class="wrap">
<input id="q" placeholder="Search recipes">
<button class="chip active" data-d="all">All</button>
<button class="chip" data-d="vegan">Vegan</button>
<button class="chip" data-d="vegetarian">Vegetarian</button>
<p id="count"></p>
{''.join(cards)}
</div>
<script>
const cards=[...document.querySelectorAll('.card')];
let diet='all';
const q=document.getElementById('q');
function apply(){{
 const t=q.value.toLowerCase(); let n=0;
 cards.forEach(c=>{{
  const ok=(diet==='all'||c.dataset.diet===diet)&&(!t||c.dataset.title.includes(t)||c.textContent.toLowerCase().includes(t));
  c.classList.toggle('hidden',!ok); if(ok)n++;
 }});
 document.getElementById('count').textContent=n+' shown';
}}
q.oninput=apply;
document.querySelectorAll('.chip').forEach(b=>b.onclick=()=>{{
 document.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
 b.classList.add('active'); diet=b.dataset.d; apply();
}});
apply();
</script></body></html>
"""
        (dest_root / "index.html").write_text(html_doc, encoding="utf-8")

        for r in recipes:
            md = [
                f"# {r['title']}",
                "",
                f"**Diet:** {r['diet']}",
                "",
            ]
            if r.get("summary"):
                md += [r["summary"], ""]
            md += ["## Ingredients", ""]
            md += [f"- {i}" for i in r["ingredients"]]
            md += ["", "## Method", ""]
            md += [f"{n}. {s}" for n, s in enumerate(r["method"], 1)]
            md += [""]
            folder = dest_root / r["diet"]
            (folder / f"{r['slug']}.md").write_text("\n".join(md), encoding="utf-8")

        (dest_root / "README.txt").write_text(
            f"""Kitchn vegan and vegetarian recipes
=====================================

{len(recipes)} recipes from https://www.thekitchn.com/recipes
(vegan + vegetarian collections). Meat and fish dishes were skipped.

On this computer the folder is:
  {HOME_DESKTOP}

Copy this whole folder onto your Windows Desktop:
  C:\\Users\\shyam prasad\\Desktop\\Kitchn-Vegan-Vegetarian-Recipes

Open index.html in a browser, or ALL-RECIPES.txt in Notepad.
Individual recipes are in vegan\\ and vegetarian\\ as Markdown files.

This is a personal kitchen archive. Methods are transcribed for offline use.
""",
            encoding="utf-8",
        )


def main() -> int:
    by_diet = collect_index()
    # vegan tag wins if in both
    vegan = by_diet["vegan"]
    vegetarian_only = by_diet["vegetarian"] - vegan
    jobs = [("vegan", u) for u in sorted(vegan)] + [("vegetarian", u) for u in sorted(vegetarian_only)]
    print(f"fetch {len(jobs)} recipe pages", flush=True)

    recipes: list[dict] = []
    seen_titles: set[str] = set()

    def one(diet: str, url: str) -> dict | None:
        slug = url.rsplit("/", 1)[-1]
        dest = CACHE / "recipes" / f"{slug}.md"
        text = fetch(url, dest)
        return parse_recipe(text, url, diet)

    done = 0
    with ThreadPoolExecutor(max_workers=8) as pool:
        futs = {pool.submit(one, diet, url): url for diet, url in jobs}
        for fut in as_completed(futs):
            done += 1
            if done % 25 == 0 or done == len(jobs):
                print(f"  recipes {done}/{len(jobs)} kept {len(recipes)}", flush=True)
            try:
                rec = fut.result()
            except Exception as exc:  # noqa: BLE001
                print("   fail", futs[fut], exc, flush=True)
                continue
            if not rec:
                continue
            key = rec["title"].lower()
            if key in seen_titles:
                continue
            seen_titles.add(key)
            recipes.append(rec)

    write_outputs(recipes)
    print(f"Wrote {len(recipes)} recipes")
    print(f"Desktop: {HOME_DESKTOP}")
    print(f"Repo:    {REPO_DESKTOP}")
    return 0 if recipes else 1


if __name__ == "__main__":
    raise SystemExit(main())
