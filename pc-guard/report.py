"""
Build a self-contained local HTML dashboard (no web server / no firewall).
Writes data/live.html and refreshes it every few seconds.
"""

from __future__ import annotations

import html
from pathlib import Path
from typing import Any

from guard_core import DATA, SNAPSHOTS


LIVE_HTML = DATA / "live.html"


def _esc(value: Any) -> str:
    return html.escape("" if value is None else str(value))


def _shot_html(rel_path: str | None, label: str) -> str:
    if not rel_path:
        return ""
    # live.html lives in data/, snapshots are data/snapshots/...
    name = Path(rel_path).name
    src = f"snapshots/{html.escape(name)}"
    full = SNAPSHOTS / name
    if not full.exists():
        return ""
    return (
        f'<a class="shot" href="{src}" target="_blank" title="{_esc(label)}">'
        f'<img src="{src}" alt="{_esc(label)}" />'
        f"<span>{_esc(label)}</span></a>"
    )


def _rows_files(files: list[dict[str, Any]]) -> str:
    if not files:
        return (
            '<p class="empty">No file activity yet. Save a file on Desktop/Documents, '
            "or double-click TEST-NOW.bat</p>"
        )
    parts = []
    for f in files[:80]:
        shots = _shot_html(f.get("screenshot_path"), "Screen") + _shot_html(
            f.get("webcam_path"), "Face"
        )
        gallery = f'<div class="shots">{shots}</div>' if shots else '<p class="when">No screen shot</p>'
        parts.append(
            f"""
            <article class="row">
              <span class="badge">{_esc(f.get("action"))}</span>
              <div class="body">
                <p class="path">{_esc(f.get("path"))}</p>
                <p class="when">{_esc(f.get("created_at"))} · {_esc(f.get("username"))}</p>
                {gallery}
              </div>
            </article>
            """
        )
    return "\n".join(parts)


def _rows_generic(items: list[dict[str, Any]], kind: str) -> str:
    if not items:
        return f'<p class="empty">No {kind} yet.</p>'
    parts = []
    for item in items[:80]:
        if kind == "windows":
            title = item.get("title")
            badge = item.get("process_name") or "app"
            when = item.get("created_at")
        elif kind == "sessions":
            title = f"{item.get('username')} @ {item.get('hostname')}"
            badge = f"#{item.get('id')}"
            when = f"{item.get('started_at')} · {item.get('os_info') or ''}"
            snap = _shot_html(item.get("snapshot_path"), "Webcam")
            parts.append(
                f"""
                <article class="row">
                  <span class="badge">{_esc(badge)}</span>
                  <div class="body">
                    <p class="path">{_esc(title)}</p>
                    <p class="when">{_esc(when)}</p>
                    {snap}
                  </div>
                </article>
                """
            )
            continue
        else:
            title = item.get("message")
            badge = item.get("kind")
            when = item.get("created_at")
        parts.append(
            f"""
            <article class="row">
              <span class="badge">{_esc(badge)}</span>
              <div class="body">
                <p class="path">{_esc(title)}</p>
                <p class="when">{_esc(when)}</p>
              </div>
            </article>
            """
        )
    return "\n".join(parts)


def render_live_html(payload: dict[str, Any], status: dict[str, Any]) -> str:
    ident = status.get("identity") or payload.get("identity") or {}
    who = f"{ident.get('username', '?')} on {ident.get('hostname', '?')}"
    watch_count = status.get("watch_count", 0)
    folders = status.get("watched_folders") or []
    folder_bits = "<br>".join(_esc(f) for f in folders[:8])
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="3" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PC Guard (no firewall needed)</title>
  <style>
    :root {{
      --bg:#0c1210; --ink:#e8f0ea; --muted:#9bb0a3; --accent:#3ecf8e; --line:rgba(232,240,234,.12);
      --warn:#f0b429; --danger:#ff7a7a;
    }}
    * {{ box-sizing:border-box; }}
    body {{
      margin:0; font-family:"Segoe UI", Tahoma, sans-serif; color:var(--ink);
      background: radial-gradient(900px 420px at 10% -10%, rgba(62,207,142,.18), transparent 60%),
                  linear-gradient(180deg,#101814,#0c1210 50%);
      min-height:100vh; padding:1.25rem;
    }}
    .wrap {{ max-width:960px; margin:0 auto; }}
    h1 {{ margin:.2rem 0 0; font-size:1.8rem; }}
    .eyebrow {{ color:var(--muted); text-transform:uppercase; letter-spacing:.05em; font-size:.75rem; margin:0; }}
    .chip {{
      display:inline-block; margin-top:.75rem; padding:.35rem .75rem; border-radius:999px;
      background:rgba(62,207,142,.14); color:var(--accent); border:1px solid rgba(62,207,142,.35); font-size:.85rem;
    }}
    .card {{
      margin:1rem 0; padding:1rem 1.1rem; border:1px solid var(--line); border-radius:1rem;
      background:rgba(21,32,27,.7);
    }}
    .who {{ font-size:1.45rem; font-weight:700; margin:.25rem 0; }}
    .meta,.hint {{ color:var(--muted); font-size:.9rem; }}
    h2 {{ margin:1.2rem 0 .35rem; font-size:1.1rem; }}
    .row {{
      display:grid; grid-template-columns:auto 1fr; gap:.7rem; padding:.8rem .9rem; margin:.45rem 0;
      border:1px solid var(--line); border-radius:.75rem; background:rgba(12,18,16,.55);
    }}
    .badge {{
      align-self:start; font-size:.7rem; text-transform:uppercase; letter-spacing:.04em;
      padding:.2rem .4rem; border-radius:.3rem; background:rgba(62,207,142,.14); color:var(--accent);
    }}
    .path {{ margin:0; word-break:break-word; }}
    .when {{ margin:.25rem 0 0; color:var(--muted); font-size:.8rem; }}
    .shots {{ display:flex; flex-wrap:wrap; gap:.6rem; margin-top:.5rem; }}
    .shot {{ display:flex; flex-direction:column; gap:.2rem; color:var(--muted); font-size:.75rem; text-decoration:none; }}
    .shot img {{ max-width:220px; max-height:140px; object-fit:cover; border-radius:.45rem; border:1px solid var(--line); }}
    .empty {{ color:var(--muted); }}
    code {{ background:rgba(255,255,255,.06); padding:.1rem .3rem; border-radius:.25rem; }}
  </style>
</head>
<body>
  <div class="wrap">
    <p class="eyebrow">Local file dashboard · no firewall / no port</p>
    <h1>PC Guard</h1>
    <div class="chip">Watching · live · auto-refresh every 3s</div>

    <section class="card">
      <p class="meta">Who is on this PC</p>
      <p class="who">{_esc(who)}</p>
      <p class="meta">{_esc(ident.get("os"))} · session #{_esc(status.get("session_id"))}</p>
      <p class="meta">Watching { _esc(watch_count) } folder(s)</p>
      <p class="meta">{folder_bits}</p>
      <p class="hint">Tip: double-click <code>TEST-NOW.bat</code> to create a test file event.</p>
    </section>

    <h2>Files touched</h2>
    {_rows_files(payload.get("files") or [])}

    <h2>Apps / windows</h2>
    {_rows_generic(payload.get("windows") or [], "windows")}

    <h2>Sessions</h2>
    {_rows_generic(payload.get("sessions") or [], "sessions")}

    <h2>Activity log</h2>
    {_rows_generic(payload.get("logs") or [], "logs")}

    <p class="hint">This page is a normal file on your PC (<code>data\\live.html</code>). Nothing is uploaded.</p>
  </div>
</body>
</html>
"""


def write_live_dashboard(payload: dict[str, Any], status: dict[str, Any]) -> Path:
    DATA.mkdir(parents=True, exist_ok=True)
    LIVE_HTML.write_text(render_live_html(payload, status), encoding="utf-8")
    return LIVE_HTML
