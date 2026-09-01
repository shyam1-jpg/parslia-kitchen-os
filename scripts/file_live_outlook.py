#!/usr/bin/env python3
"""File live Hotmail / Outlook.com mail into company folders via Microsoft Graph.

Does not print or store passwords. You approve access with a one-time device code.
Auth tokens stay in /tmp, never in the git repo.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from outlook_folders import (  # noqa: E402
    OTHER_FOLDER,
    PARENT_FOLDER,
    Message,
    classify_message,
    domain_to_folder,
    load_companies,
    load_personal_domains,
    load_source_folder_ids,
    title_from_domain,
)

CLIENT_ID = "14d82eec-204b-4c2f-b7e8-296a70dab67e"
SCOPES = (
    "https://graph.microsoft.com/Mail.ReadWrite "
    "https://graph.microsoft.com/MailboxSettings.ReadWrite "
    "offline_access"
)
GRAPH = "https://graph.microsoft.com/v1.0"
AUTH_PATH = Path("/tmp/outlook-graph-auth.json")
RESULT_PATH = Path("/opt/cursor/artifacts/live-outlook-file-result.json")
MAX_ITEMS = 8000
MIN_AUTO = 2
MAX_RULES = 50
SKIP_FOLDERS = {
    "drafts",
    "sent items",
    "deleted items",
    "junk email",
    "outbox",
    "conversation history",
    "rss feeds",
    "sync issues",
    "notes",
    "junk",
    "sent",
    "deleted",
    "draft",
}


def _json_request(
    method: str,
    url: str,
    *,
    data: dict[str, Any] | None = None,
    form: dict[str, str] | None = None,
    token: str | None = None,
    timeout: int = 60,
) -> Any:
    headers = {"Accept": "application/json"}
    body: bytes | None = None
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if form is not None:
        body = urllib.parse.urlencode(form).encode()
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    elif data is not None:
        body = json.dumps(data).encode()
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            if not raw:
                return {}
            return json.loads(raw.decode())
    except urllib.error.HTTPError as exc:
        payload = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(payload)
        except json.JSONDecodeError:
            parsed = {"raw": payload}
        error = {**parsed, "_http_status": exc.code, "_url": url}
        raise RuntimeError(json.dumps(error)) from exc


def save_auth(payload: dict[str, Any]) -> None:
    AUTH_PATH.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def load_auth() -> dict[str, Any]:
    if not AUTH_PATH.exists():
        return {}
    return json.loads(AUTH_PATH.read_text(encoding="utf-8"))


def start_device_login() -> dict[str, Any]:
    last_error = None
    for tenant in ("consumers", "common"):
        try:
            device = _json_request(
                "POST",
                f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/devicecode",
                form={"client_id": CLIENT_ID, "scope": SCOPES},
            )
            record = {
                "status": "pending",
                "tenant": tenant,
                "client_id": CLIENT_ID,
                "device_code": device["device_code"],
                "user_code": device["user_code"],
                "verification_uri": device.get("verification_uri")
                or "https://microsoft.com/devicelogin",
                "message": device.get("message", ""),
                "interval": int(device.get("interval") or 5),
                "expires_at": time.time() + int(device.get("expires_in") or 900),
                "started_at": time.time(),
            }
            save_auth(record)
            return record
        except Exception as exc:  # noqa: BLE001
            last_error = exc
    raise RuntimeError(f"Could not start Hotmail sign-in: {last_error}")


def poll_device_login() -> dict[str, Any]:
    auth = load_auth()
    if auth.get("access_token"):
        auth["status"] = "ready"
        return auth
    if not auth.get("device_code"):
        raise RuntimeError("No sign-in in progress. Run start first.")
    if time.time() > float(auth.get("expires_at") or 0):
        auth["status"] = "expired"
        save_auth(auth)
        return auth
    tenant = auth.get("tenant") or "consumers"
    try:
        token = _json_request(
            "POST",
            f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
            form={
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
                "client_id": CLIENT_ID,
                "device_code": auth["device_code"],
            },
        )
    except RuntimeError as exc:
        payload = str(exc)
        if "authorization_pending" in payload:
            auth["status"] = "pending"
            return auth
        if "slow_down" in payload:
            auth["status"] = "pending"
            auth["interval"] = int(auth.get("interval") or 5) + 5
            save_auth(auth)
            return auth
        if "expired_token" in payload or "authorization_expired" in payload:
            auth["status"] = "expired"
            save_auth(auth)
            return auth
        if "authorization_declined" in payload:
            auth["status"] = "declined"
            save_auth(auth)
            return auth
        raise
    auth.update(
        {
            "status": "ready",
            "access_token": token["access_token"],
            "refresh_token": token.get("refresh_token"),
            "token_obtained_at": time.time(),
        }
    )
    save_auth(auth)
    return auth


def graph(token: str, method: str, path: str, data: dict[str, Any] | None = None) -> Any:
    url = path if path.startswith("http") else f"{GRAPH}{path}"
    return _json_request(method, url, data=data, token=token)


def graph_paged(token: str, path: str, limit: int | None = None) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    url = path if path.startswith("http") else f"{GRAPH}{path}"
    while url:
        page = graph(token, "GET", url)
        chunk = page.get("value") or []
        items.extend(chunk)
        if limit is not None and len(items) >= limit:
            return items[:limit]
        url = page.get("@odata.nextLink")
    return items


def enc(folder_id: str) -> str:
    return urllib.parse.quote(folder_id, safe="")


def get_or_create_child(token: str, parent_id: str, name: str) -> dict[str, Any]:
    children = graph_paged(token, f"/me/mailFolders/{enc(parent_id)}/childFolders?$top=100")
    for child in children:
        if child.get("displayName") == name:
            return child
    return graph(
        token,
        "POST",
        f"/me/mailFolders/{enc(parent_id)}/childFolders",
        {"displayName": name},
    )


def sender_of(msg: dict[str, Any]) -> tuple[str, str]:
    from_block = (msg.get("from") or msg.get("sender") or {}).get("emailAddress") or {}
    return str(from_block.get("name") or ""), str(from_block.get("address") or "")


def skip_folder_name(name: str) -> bool:
    lowered = (name or "").strip().lower()
    if not lowered:
        return True
    if lowered == PARENT_FOLDER.lower():
        return True
    return lowered in SKIP_FOLDERS


def collect_scan_folders(token: str) -> list[dict[str, Any]]:
    inbox = graph(token, "GET", "/me/mailFolders/inbox")
    folders = [inbox]
    seen = {inbox["id"]}
    for folder_id in load_source_folder_ids():
        try:
            extra = graph(token, "GET", f"/me/mailFolders/{enc(folder_id)}")
        except RuntimeError:
            continue
        if extra.get("id") and extra["id"] not in seen:
            folders.append(extra)
            seen.add(extra["id"])
    for folder in graph_paged(token, "/me/mailFolders?$top=100"):
        name = str(folder.get("displayName") or "")
        fid = folder.get("id")
        if not fid or fid in seen or skip_folder_name(name):
            continue
        folders.append(folder)
        seen.add(fid)
    return folders


def file_mailbox(token: str) -> dict[str, Any]:
    # Personal Hotmail tokens often 401 on /me but allow mail folder APIs.
    upn = "shyam_1@hotmail.co.uk"
    try:
        me = graph(token, "GET", "/me")
        upn = str(me.get("userPrincipalName") or me.get("mail") or upn)
    except RuntimeError:
        pass
    companies = load_companies()
    personal = load_personal_domains()
    mapping = domain_to_folder(companies)
    scan_folders = collect_scan_folders(token)

    classified: list[tuple[str, str]] = []
    auto_counts: dict[str, int] = defaultdict(int)
    inbox_stay = 0
    seen_ids: set[str] = set()
    scanned = 0

    for folder in scan_folders:
        if scanned >= MAX_ITEMS:
            break
        if skip_folder_name(str(folder.get("displayName") or "")):
            continue
        path = (
            f"/me/mailFolders/{enc(folder['id'])}/messages"
            f"?$select=id,from,sender,subject&$top=50"
        )
        messages = graph_paged(token, path, limit=max(0, MAX_ITEMS - scanned))
        scanned += len(messages)
        for msg in messages:
            mid = msg.get("id")
            if not mid or mid in seen_ids:
                continue
            seen_ids.add(mid)
            name, email = sender_of(msg)
            result = classify_message(
                Message(from_name=name, from_email=email, subject=str(msg.get("subject") or "")),
                companies,
                personal,
                mapping,
            )
            if not result.folder:
                inbox_stay += 1
                continue
            classified.append((mid, result.folder))
            if result.folder.startswith("AUTO:"):
                auto_counts[result.folder] += 1

    auto_resolved: dict[str, str] = {}
    for key, count in auto_counts.items():
        domain = key.split(":", 1)[1]
        auto_resolved[key] = title_from_domain(domain) if count >= MIN_AUTO else OTHER_FOLDER

    plan: dict[str, int] = defaultdict(int)
    destinations: list[tuple[str, str]] = []
    for mid, folder in classified:
        dest = auto_resolved.get(folder, folder)
        destinations.append((mid, dest))
        plan[dest] += 1

    inbox = graph(token, "GET", "/me/mailFolders/inbox")
    parent = get_or_create_child(token, inbox["id"], PARENT_FOLDER)
    folder_objects: dict[str, dict[str, Any]] = {}
    needed = set(plan) | {row.folder for row in companies}
    for name in sorted(needed, key=str.lower):
        folder_objects[name] = get_or_create_child(token, parent["id"], name)

    moved = 0
    failed = 0
    for mid, dest in destinations:
        target = folder_objects.get(dest)
        if not target:
            failed += 1
            continue
        try:
            graph(token, "POST", f"/me/messages/{enc(mid)}/move", {"destinationId": target["id"]})
            moved += 1
        except RuntimeError:
            failed += 1

    rule_created = 0
    rule_skipped = 0
    try:
        existing = graph_paged(token, "/me/mailFolders/inbox/messageRules")
        existing_names = {str(rule.get("displayName") or "") for rule in existing}
        made = 0
        for row in companies:
            if made >= MAX_RULES:
                break
            name = f"Companies: {row.folder}"
            if name in existing_names:
                rule_skipped += 1
                continue
            target = folder_objects.get(row.folder)
            if not target:
                continue
            needles = list(row.domains[:8])
            if not needles:
                continue
            try:
                graph(
                    token,
                    "POST",
                    "/me/mailFolders/inbox/messageRules",
                    {
                        "displayName": name,
                        "sequence": 1 + made,
                        "isEnabled": True,
                        "conditions": {"senderContains": needles},
                        "actions": {
                            "moveToFolder": target["id"],
                            "stopProcessingRules": True,
                        },
                    },
                )
                rule_created += 1
                made += 1
            except RuntimeError:
                rule_skipped += 1
    except RuntimeError:
        pass

    result = {
        "account": upn,
        "folders_ready": len(folder_objects),
        "emails_moved": moved,
        "move_failures": failed,
        "left_in_inbox_people": inbox_stay,
        "rules_added": rule_created,
        "rules_skipped": rule_skipped,
        "folder_counts": dict(sorted(plan.items(), key=lambda kv: kv[0].lower())),
        "parent_folder": f"Inbox / {PARENT_FOLDER}",
    }
    RESULT_PATH.parent.mkdir(parents=True, exist_ok=True)
    RESULT_PATH.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="File live Outlook company mail")
    parser.add_argument("command", choices=["start", "poll", "file", "status"])
    args = parser.parse_args(argv)

    if args.command == "start":
        record = start_device_login()
        print(
            json.dumps(
                {
                    "status": record["status"],
                    "user_code": record["user_code"],
                    "verification_uri": record["verification_uri"],
                    "expires_at": record["expires_at"],
                    "message": record["message"],
                },
                indent=2,
            )
        )
        return 0

    if args.command == "poll":
        record = poll_device_login()
        print(json.dumps({"status": record.get("status")}, indent=2))
        return 0 if record.get("status") in {"ready", "pending"} else 2

    if args.command == "status":
        record = load_auth()
        print(
            json.dumps(
                {
                    "status": record.get("status") or "missing",
                    "user_code": record.get("user_code"),
                    "verification_uri": record.get("verification_uri"),
                    "has_token": bool(record.get("access_token")),
                    "expires_at": record.get("expires_at"),
                },
                indent=2,
            )
        )
        return 0

    record = poll_device_login()
    if record.get("status") != "ready":
        print(json.dumps({"status": record.get("status"), "error": "not signed in"}, indent=2))
        return 3
    result = file_mailbox(record["access_token"])
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
