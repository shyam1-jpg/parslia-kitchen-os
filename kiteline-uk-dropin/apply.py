#!/usr/bin/env python3
"""Copy Kitchen SOP onto a kitline1 checkout (same pattern as site/vedanta-rota).

Usage:
  python3 kiteline-uk-dropin/apply.py /path/to/kitline1

This repo (parslia-kitchen-os) cannot push to kitline1 or deploy kiteline.uk.
After apply, commit + push kitline1 so Render serves https://kiteline.uk/kitchen-sop/
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOP_SRC = HERE.parent / "kiteline-kitchen-sop"
KEEP = {
    "index.html",
    "app.js",
    "styles.css",
    "sw.js",
    "manifest.webmanifest",
    "offline.html",
    "standalone.html",
}

ROUTE_BLOCK = """    // Kiteline Kitchen SOP (PWA under site/kitchen-sop/)
    if (url.pathname === '/kitchen-sop') {
      res.writeHead(302, security.securityHeaders({ Location: '/kitchen-sop/', 'Cache-Control': 'no-store' }));
      return res.end();
    }
    if (url.pathname === '/kitchen-sop/') {
      return serveFile(res, path.join(ROOT, 'site', 'kitchen-sop', 'index.html'));
    }
    if (url.pathname === '/kitchen-sop/sw.js') {
      res.writeHead(200, security.securityHeaders({
        'Content-Type': 'text/javascript',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Service-Worker-Allowed': '/kitchen-sop/',
      }));
      try {
        return res.end(fs.readFileSync(path.join(ROOT, 'site', 'kitchen-sop', 'sw.js')));
      } catch {
        return send(res, 404, { error: 'Not found' }, null, req);
      }
    }

"""

NAV_DESKTOP = '        <a href="/kitchen-sop/" class="hover:text-brand-700">Kitchen SOP</a>\n'
NAV_MOBILE = '        <a href="/kitchen-sop/">Kitchen SOP</a>\n'
FOOTER = '        <a href="/kitchen-sop/" class="hover:text-white text-ink-500">Kitchen SOP</a>\n'
USE_CASE = (
    '      <a href="/kitchen-sop/" class="rounded-xl border border-ink-100 p-5 '
    'hover:border-brand-300 hover:bg-brand-50/30 transition">'
    "<strong>Kitchen SOP</strong>"
    '<p class="text-sm text-ink-500 mt-1">Commercial kitchen procedures and short training videos.</p></a>\n'
)
HUB_TILE = "      {l:'Kitchen SOP',href:'/kitchen-sop/',i:'cap',c:'#0f766e'},\n"
SOP_LINK = "{ label: 'Kitchen SOP', href: '/kitchen-sop/' }"
TRAINING_BANNER = """      <div class="card card-pad mb-5 border border-brand-100 bg-brand-50/40">
        <div class="font-bold text-ink-900">Kitchen SOP</div>
        <p class="text-sm text-ink-500 mt-1">Professional commercial kitchen procedures and short videos (CK-00–CK-12).</p>
        <a class="btn btn-primary btn-sm mt-3 inline-flex" href="/kitchen-sop/">Open Kitchen SOP</a>
      </div>
"""


def die(msg: str) -> None:
    print("ERROR:", msg, file=sys.stderr)
    sys.exit(1)


def insert_once(text: str, needle: str, insert: str, after: bool = True) -> str:
    if insert.strip() and insert.strip() in text:
        return text
    idx = text.find(needle)
    if idx < 0:
        die(f"Could not find marker:\n{needle[:120]}")
    if after:
        at = idx + len(needle)
        return text[:at] + insert + text[at:]
    return text[:idx] + insert + text[idx:]


def copy_sop(dest_root: Path) -> Path:
    dest = dest_root / "site" / "kitchen-sop"
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)
    for name in KEEP:
        shutil.copy2(SOP_SRC / name, dest / name)
    data_dir = dest / "data"
    data_dir.mkdir()
    shutil.copy2(SOP_SRC / "data" / "sops.js", data_dir / "sops.js")
    icons_src = SOP_SRC / "icons"
    icons_dest = dest / "icons"
    shutil.copytree(icons_src, icons_dest)
    (dest / "README.md").write_text(
        "Kiteline Kitchen SOP PWA. Served at https://kiteline.uk/kitchen-sop/\n"
        "Copied from parslia-kitchen-os/kiteline-kitchen-sop/ — relative URLs, PWA scope ./ \n",
        encoding="utf-8",
    )
    return dest


def patch_server(dest_root: Path) -> None:
    path = dest_root / "server" / "server.js"
    text = path.read_text(encoding="utf-8")
    old = (
        "filePath.includes('vedanta-rota') || filePath.includes('vedanta-ordering') "
        "|| filePath.includes('academy') || filePath.includes('menu-creator')"
    )
    new = old.replace(
        "filePath.includes('menu-creator')",
        "filePath.includes('menu-creator') || filePath.includes('kitchen-sop')",
    )
    if "kitchen-sop" not in text.split("serveFile", 1)[-1][:800] and old in text:
        text = text.replace(old, new, 1)
    elif "filePath.includes('kitchen-sop')" not in text:
        if old in text:
            text = text.replace(old, new, 1)
    marker = (
        "    // Vedanta Staff Rota (static site under site/vedanta-rota/)\n"
        "    if (url.pathname === '/vedanta-rota' || url.pathname === '/vedanta-rota/') {\n"
        "      return serveFile(res, path.join(ROOT, 'site', 'vedanta-rota', 'index.html'));\n"
        "    }\n"
    )
    if "url.pathname === '/kitchen-sop/'" not in text:
        text = insert_once(text, marker, "\n" + ROUTE_BLOCK)
    path.write_text(text, encoding="utf-8")


def patch_marketing(dest_root: Path) -> None:
    path = dest_root / "site" / "index.html"
    text = path.read_text(encoding="utf-8")
    desktop_needle = '        <a href="contact.html" class="hover:text-brand-700">Contact</a>\n'
    if 'href="/kitchen-sop/"' not in text.split("<nav", 1)[-1].split("</nav>", 1)[0]:
        text = insert_once(text, desktop_needle, NAV_DESKTOP)
    mobile_needle = "        <a href=\"contact.html\">Contact</a>\n"
    if text.count('href="/kitchen-sop/"') < 2:
        text = insert_once(text, mobile_needle, NAV_MOBILE)
    footer_needle = '        <a href="/academy/" class="hover:text-white text-ink-500">Kiteline Academy</a>\n'
    if "Kitchen SOP" not in text.split("<footer", 1)[-1]:
        text = insert_once(text, footer_needle, FOOTER)
    use_needle = (
        '      <a href="faq.html" class="rounded-xl border border-ink-100 p-5 '
        'hover:border-brand-300 hover:bg-brand-50/30 transition"><strong>FAQ</strong>'
        '<p class="text-sm text-ink-500 mt-1">Trials, pricing, hardware pilot, and support.</p></a>\n'
    )
    if 'href="/kitchen-sop/"' not in text.split("Use cases", 1)[-1][:2500]:
        text = insert_once(text, use_needle, USE_CASE, after=False)
    path.write_text(text, encoding="utf-8")


def patch_views(dest_root: Path) -> None:
    path = dest_root / "js" / "views.js"
    text = path.read_text(encoding="utf-8")
    needle = "      {l:'Training',route:'training',i:'cap',c:'#0d9488'},\n"
    if "Kitchen SOP" not in text.split("l:'Training'")[1][:400]:
        text = insert_once(text, needle, HUB_TILE)
    banner_needle = "      ${sectionHeader('Training & Certificates'"
    if "Open Kitchen SOP" not in text:
        # insert banner after the 3 KPI cards, before the table card
        table_needle = '      <div class="card overflow-hidden">\n        <table class="table"><thead><tr><th>Staff member</th>'
        if table_needle not in text:
            die("training table marker missing")
        text = insert_once(text, table_needle, TRAINING_BANNER, after=False)
    path.write_text(text, encoding="utf-8")


def patch_store(dest_root: Path) -> None:
    path = dest_root / "js" / "store.js"
    text = path.read_text(encoding="utf-8")
    old = "{ label: 'Vedanta Rota', href: '/vedanta-rota/' }, { label: 'Vedanta Ordering', href: '/vedanta-ordering/' }, { label: 'Menu Creator', href: '/menu-creator/' }"
    new = old.replace(
        "{ label: 'Menu Creator', href: '/menu-creator/' }",
        "{ label: 'Menu Creator', href: '/menu-creator/' }, " + SOP_LINK,
    )
    if SOP_LINK not in text and old in text:
        text = text.replace(old, new, 1)
    gov = "{ label: 'Menu Creator', href: '/menu-creator/' }"
    if text.count(SOP_LINK) < 2:
        # add to Govindas links as well
        gov_block = "      id: 'site_govindas',\n      assigneeMap:"
        if gov_block in text and SOP_LINK not in text.split("site_govindas", 1)[-1][:500]:
            text = text.replace(
                "      links: [{ label: 'Menu Creator', href: '/menu-creator/' }],\n",
                "      links: [{ label: 'Menu Creator', href: '/menu-creator/' }, "
                + SOP_LINK
                + "],\n",
                1,
            )
    path.write_text(text, encoding="utf-8")


def main() -> None:
    if len(sys.argv) != 2:
        die("Usage: python3 kiteline-uk-dropin/apply.py /path/to/kitline1")
    dest = Path(sys.argv[1]).resolve()
    if not (dest / "server" / "server.js").is_file() or not (dest / "site").is_dir():
        die(f"{dest} does not look like kitline1 (need server/server.js and site/)")
    if not (SOP_SRC / "index.html").is_file():
        die(f"SOP source missing: {SOP_SRC}")
    sop = copy_sop(dest)
    patch_server(dest)
    patch_marketing(dest)
    patch_views(dest)
    patch_store(dest)
    print("Applied Kitchen SOP to", dest)
    print("  PWA:", sop)
    print("  URL after Render deploy: https://kiteline.uk/kitchen-sop/")


if __name__ == "__main__":
    main()
