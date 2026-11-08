#!/usr/bin/env python3
"""Sort company emails into Outlook-style folders.

Used by tests, the HTML preview, and the rules cheat-sheet.
The Windows double-click script (outlook/Setup-OutlookFolders.ps1)
follows the same CSV rules on the real Outlook inbox.
"""

from __future__ import annotations

import argparse
import csv
import html
import json
import re
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTLOOK_DIR = ROOT / "outlook"
COMPANIES_CSV = OUTLOOK_DIR / "companies.csv"
PERSONAL_TXT = OUTLOOK_DIR / "personal-domains.txt"
SAMPLE_INBOX = OUTLOOK_DIR / "sample-inbox.csv"
PARENT_FOLDER = "Companies"
MIN_EMAILS_FOR_AUTO_FOLDER = 2

PUBLIC_SUFFIXES = {
    "co.uk",
    "org.uk",
    "ac.uk",
    "gov.uk",
    "me.uk",
    "co.in",
    "com.au",
    "co.nz",
    "co.jp",
    "com.br",
    "co.za",
    "com.sg",
    "co.kr",
}

EMAIL_RE = re.compile(r"([A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,})", re.I)


@dataclass(frozen=True)
class Company:
    folder: str
    domains: tuple[str, ...]
    from_contains: tuple[str, ...]


@dataclass(frozen=True)
class Message:
    from_name: str
    from_email: str
    subject: str


@dataclass
class SortResult:
    folder: str | None  # None = stay in Inbox
    reason: str
    domain: str


@dataclass
class Preview:
    groups: dict[str, list[Message]] = field(default_factory=lambda: defaultdict(list))
    inbox: list[Message] = field(default_factory=list)
    reasons: list[tuple[Message, SortResult]] = field(default_factory=list)

    @property
    def folder_names(self) -> list[str]:
        names = sorted(self.groups.keys(), key=str.lower)
        return names


def outlook_dir() -> Path:
    return OUTLOOK_DIR


def load_personal_domains(path: Path | None = None) -> set[str]:
    path = path or PERSONAL_TXT
    domains: set[str] = set()
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.split("#", 1)[0].strip().lower()
        if line:
            domains.add(line)
    return domains


def load_companies(path: Path | None = None) -> list[Company]:
    path = path or COMPANIES_CSV
    companies: list[Company] = []
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            folder = (row.get("folder") or "").strip()
            if not folder:
                continue
            domains = tuple(
                d.strip().lower()
                for d in (row.get("domains") or "").split(";")
                if d.strip()
            )
            from_contains = tuple(
                n.strip()
                for n in (row.get("from_contains") or "").split(";")
                if n.strip()
            )
            companies.append(Company(folder=folder, domains=domains, from_contains=from_contains))
    return companies


def domain_to_folder(companies: list[Company]) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for company in companies:
        for domain in company.domains:
            mapping[domain] = company.folder
    return mapping


def extract_email(value: str) -> str:
    text = (value or "").strip()
    if not text:
        return ""
    match = EMAIL_RE.search(text)
    if match:
        return match.group(1).lower()
    if "@" in text:
        return text.lower().strip("<> ")
    return ""


def extract_domain(email_or_header: str) -> str:
    address = extract_email(email_or_header)
    if "@" not in address:
        return ""
    return address.rsplit("@", 1)[-1].lower().strip(".")


def registrable_domain(domain: str) -> str:
    d = (domain or "").lower().strip(".")
    if not d:
        return ""
    parts = d.split(".")
    if len(parts) < 2:
        return d
    last2 = ".".join(parts[-2:])
    if last2 in PUBLIC_SUFFIXES:
        if len(parts) >= 3:
            return ".".join(parts[-3:])
        return d
    return last2


def title_from_domain(domain: str) -> str:
    reg = registrable_domain(domain)
    if not reg:
        return "Unknown"
    label = reg.split(".")[0]
    if not label:
        return "Unknown"
    return label[:1].upper() + label[1:]


def ancestors(domain: str) -> list[str]:
    d = (domain or "").lower().strip(".")
    if not d:
        return []
    parts = d.split(".")
    out: list[str] = []
    for i in range(len(parts) - 1):
        out.append(".".join(parts[i:]))
    return out


def folder_from_known_domain(domain: str, mapping: dict[str, str]) -> str | None:
    for candidate in ancestors(domain):
        if candidate in mapping:
            return mapping[candidate]
    reg = registrable_domain(domain)
    return mapping.get(reg)


def folder_from_display_name(from_name: str, companies: list[Company]) -> str | None:
    name = from_name or ""
    if not name:
        return None
    lowered = name.lower()
    for company in companies:
        for needle in company.from_contains:
            if needle and needle.lower() in lowered:
                return company.folder
    return None


def classify_message(
    message: Message,
    companies: list[Company],
    personal: set[str],
    mapping: dict[str, str] | None = None,
) -> SortResult:
    mapping = mapping or domain_to_folder(companies)
    domain = extract_domain(message.from_email) or extract_domain(message.from_name)
    known = folder_from_known_domain(domain, mapping) if domain else None
    if known:
        return SortResult(folder=known, reason=f"known domain {domain}", domain=domain)

    named = folder_from_display_name(message.from_name, companies)
    if named:
        return SortResult(folder=named, reason=f"from name matches {named}", domain=domain)

    reg = registrable_domain(domain) if domain else ""
    if not domain or not reg:
        return SortResult(folder=None, reason="no sender domain", domain=domain)

    if reg in personal or domain in personal:
        return SortResult(folder=None, reason=f"personal domain {reg}", domain=domain)

    return SortResult(
        folder=f"AUTO:{reg}",
        reason=f"company domain {reg}",
        domain=domain,
    )


def sort_messages(
    messages: list[Message],
    companies: list[Company] | None = None,
    personal: set[str] | None = None,
    min_auto: int = MIN_EMAILS_FOR_AUTO_FOLDER,
) -> Preview:
    companies = companies if companies is not None else load_companies()
    personal = personal if personal is not None else load_personal_domains()
    mapping = domain_to_folder(companies)
    first_pass = [(msg, classify_message(msg, companies, personal, mapping)) for msg in messages]

    auto_counts: dict[str, int] = defaultdict(int)
    for _, result in first_pass:
        if result.folder and result.folder.startswith("AUTO:"):
            auto_counts[result.folder] += 1

    preview = Preview()
    for message, result in first_pass:
        folder = result.folder
        if folder and folder.startswith("AUTO:"):
            if auto_counts[folder] >= min_auto:
                folder = title_from_domain(folder.split(":", 1)[1])
                result = SortResult(folder=folder, reason=result.reason + " (auto folder)", domain=result.domain)
            else:
                folder = None
                result = SortResult(
                    folder=None,
                    reason=result.reason + " (only one email — left in Inbox)",
                    domain=result.domain,
                )
        preview.reasons.append((message, result))
        if folder:
            preview.groups[folder].append(message)
        else:
            preview.inbox.append(message)
    return preview


def load_messages_csv(path: Path | None = None) -> list[Message]:
    path = path or SAMPLE_INBOX
    messages: list[Message] = []
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            messages.append(
                Message(
                    from_name=(row.get("from_name") or "").strip(),
                    from_email=(row.get("from_email") or "").strip(),
                    subject=(row.get("subject") or "").strip(),
                )
            )
    return messages


def rules_cheat_sheet(companies: list[Company] | None = None) -> str:
    companies = companies if companies is not None else load_companies()
    lines = [
        "Outlook rules to add (if the double-click script cannot run)",
        "============================================================",
        "",
        "Open Outlook → Home → Rules → Manage Rules & Alerts → New Rule",
        "Or on the web: https://outlook.live.com/mail/ → Settings → Mail → Rules",
        "",
        f"Create a folder named {PARENT_FOLDER} under Inbox, then one folder per company.",
        "",
    ]
    for company in companies:
        needles = " OR ".join(company.domains)
        lines.append(f"Rule: File → {company.folder}")
        lines.append(f"  If sender address includes: {needles}")
        lines.append(f"  Move to folder: Inbox / {PARENT_FOLDER} / {company.folder}")
        lines.append("  Stop processing more rules: Yes")
        lines.append("")
    lines.append("Personal emails (Gmail, Hotmail friends, etc.) stay in Inbox.")
    return "\n".join(lines) + "\n"


def render_preview_html(preview: Preview) -> str:
    folder_rows = []
    for name in preview.folder_names:
        items = preview.groups[name]
        folder_rows.append(
            "<details open class='folder'>"
            f"<summary><span class='glyph'>📁</span> {html.escape(name)}"
            f"<span class='count'>{len(items)}</span></summary><ul>"
            + "".join(
                "<li><strong>{}</strong> &lt;{}&gt;<br><span class='subject'>{}</span></li>".format(
                    html.escape(msg.from_name or "Unknown"),
                    html.escape(msg.from_email),
                    html.escape(msg.subject),
                )
                for msg in items
            )
            + "</ul></details>"
        )

    inbox_items = "".join(
        "<li><strong>{}</strong> &lt;{}&gt;<br><span class='subject'>{}</span></li>".format(
            html.escape(msg.from_name or "Unknown"),
            html.escape(msg.from_email),
            html.escape(msg.subject),
        )
        for msg in preview.inbox
    ) or "<li class='empty'>Inbox is clear of company mail.</li>"

    filed = sum(len(v) for v in preview.groups.values())
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Outlook company folders — preview</title>
  <style>
    :root {{
      --bg: #0f2744;
      --pane: #16385c;
      --card: #ffffff;
      --ink: #1b1b1b;
      --muted: #5c6b7a;
      --accent: #0f6cbd;
      --line: #d8e1ea;
    }}
    * {{ box-sizing: border-box; }}
    html, body {{ height: 100%; }}
    body {{
      margin: 0;
      font-family: "Segoe UI", system-ui, sans-serif;
      background: linear-gradient(180deg, #0b1f36, #123258);
      color: var(--ink);
    }}
    .shell {{
      max-width: 1100px;
      height: calc(100vh - 32px);
      margin: 16px auto;
      background: var(--card);
      display: grid;
      grid-template-columns: 280px 1fr;
      grid-template-rows: 1fr;
      box-shadow: 0 16px 50px rgba(0,0,0,.28);
      border-radius: 12px;
      overflow: hidden;
    }}
    aside {{
      background: #f3f6f9;
      border-right: 1px solid var(--line);
      padding: 18px 12px 32px;
      overflow-y: auto;
      min-height: 0;
    }}
    main {{ overflow-y: auto; min-height: 0; padding: 22px 28px 40px; }}
    h1 {{ font-size: 16px; margin: 0 0 4px; color: #0f2744; }}
    .sub {{ color: var(--muted); font-size: 12px; margin-bottom: 16px; }}
    .tree {{ list-style: none; padding: 0; margin: 0; font-size: 14px; }}
    .tree li {{ padding: 6px 8px; border-radius: 6px; }}
    .tree .inbox {{ font-weight: 700; }}
    .tree .child {{ padding-left: 28px; color: #243547; }}
    .tree .n {{ float: right; color: var(--muted); }}
    .banner {{
      background: #e7f2fb;
      border: 1px solid #b9d6ee;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 18px;
      font-size: 14px;
    }}
    .folder {{
      border: 1px solid var(--line);
      border-radius: 8px;
      margin: 0 0 10px;
      padding: 0 10px;
    }}
    summary {{
      cursor: pointer;
      padding: 10px 4px;
      font-weight: 650;
      list-style: none;
    }}
    .count {{
      float: right;
      background: #e7f2fb;
      color: var(--accent);
      border-radius: 999px;
      padding: 1px 8px;
      font-size: 12px;
    }}
    ul {{ margin: 0 0 12px; padding: 0 0 8px 8px; }}
    li {{ padding: 8px 4px; border-top: 1px solid #eef2f6; font-size: 14px; }}
    .subject {{ color: var(--muted); font-size: 13px; }}
    .empty {{ color: var(--muted); border: 0; }}
    h2 {{ font-size: 15px; margin: 22px 0 8px; }}
  </style>
</head>
<body>
  <div class="shell">
    <aside>
      <h1>Outlook</h1>
      <div class="sub">Inbox · {PARENT_FOLDER} folders</div>
      <ul class="tree">
        <li class="inbox">📥 Inbox <span class="n">{len(preview.inbox)}</span></li>
        <li>📁 {html.escape(PARENT_FOLDER)}</li>
        {''.join(f'<li class="child">📁 {html.escape(name)} <span class="n">{len(preview.groups[name])}</span></li>' for name in preview.folder_names)}
      </ul>
    </aside>
    <main>
      <div class="banner">
        <strong>{filed}</strong> company emails drop into folders.
        <strong>{len(preview.inbox)}</strong> personal / one-off emails stay in Inbox.
        This is the sample mailbox — on your PC, double-click
        <code>SETUP-OUTLOOK-FOLDERS.bat</code> to do the same in desktop Outlook.
      </div>
      <h2>Company folders</h2>
      {''.join(folder_rows)}
      <h2>Left in Inbox</h2>
      <ul>{inbox_items}</ul>
    </main>
  </div>
</body>
</html>
"""


def write_generated_files(
    preview: Preview | None = None,
    companies: list[Company] | None = None,
) -> dict[str, Path]:
    companies = companies if companies is not None else load_companies()
    if preview is None:
        preview = sort_messages(load_messages_csv())
    rules_path = OUTLOOK_DIR / "RULES-TO-ADD.txt"
    preview_path = OUTLOOK_DIR / "preview.html"
    summary_path = OUTLOOK_DIR / "preview-summary.json"
    rules_path.write_text(rules_cheat_sheet(companies), encoding="utf-8")
    preview_path.write_text(render_preview_html(preview), encoding="utf-8")
    summary = {
        "parent_folder": PARENT_FOLDER,
        "folders": {name: len(preview.groups[name]) for name in preview.folder_names},
        "left_in_inbox": len(preview.inbox),
        "filed": sum(len(v) for v in preview.groups.values()),
        "inbox_subjects": [m.subject for m in preview.inbox],
    }
    summary_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    return {"rules": rules_path, "preview": preview_path, "summary": summary_path}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Preview Outlook company folders")
    parser.add_argument("command", nargs="?", default="preview", choices=["preview", "map", "export"])
    parser.add_argument("--email", default="", help="Address to map (with map)")
    parser.add_argument("--from-name", default="", help="Display name (with map)")
    parser.add_argument("--inbox", default=str(SAMPLE_INBOX), help="CSV inbox to preview")
    args = parser.parse_args(argv)

    companies = load_companies()
    personal = load_personal_domains()

    if args.command == "map":
        msg = Message(from_name=args.from_name, from_email=args.email, subject="")
        result = classify_message(msg, companies, personal)
        print(json.dumps({"folder": result.folder, "reason": result.reason, "domain": result.domain}))
        return 0

    messages = load_messages_csv(Path(args.inbox))
    preview = sort_messages(messages, companies, personal)
    if args.command == "export":
        paths = write_generated_files(preview, companies)
        print(json.dumps({k: str(v) for k, v in paths.items()}, indent=2))
        return 0

    print(f"Parent folder: Inbox / {PARENT_FOLDER}")
    print(f"Filed: {sum(len(v) for v in preview.groups.values())}")
    print(f"Left in Inbox: {len(preview.inbox)}")
    for name in preview.folder_names:
        print(f"  {name}: {len(preview.groups[name])}")
    if preview.inbox:
        print("Inbox:")
        for msg in preview.inbox:
            print(f"  - {msg.from_email} | {msg.subject}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
