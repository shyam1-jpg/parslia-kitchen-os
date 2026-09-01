#!/usr/bin/env python3
"""File live Hotmail / Outlook.com mail into company folders via Microsoft Graph.

Does not print or store passwords. You approve access with a one-time device code.
Auth tokens stay in /tmp, never in the git repo.
"""

from __future__ import annotations

import argparse
import json
import re
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
    load_pin_ranks,
    load_source_folder_ids,
    pinned_folder_name,
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
MAX_ITEMS = 12000
MIN_AUTO = 1
MAX_RULES = 50
SKIP_FOLDERS = {
    "drafts",
    "sent items",
    "deleted items",
    "outbox",
    "conversation history",
    "rss feeds",
    "sync issues",
    "notes",
    "junk",
    "sent",
    "deleted",
    "draft",
    "infected items",
}
SCAN_WELLKNOWN = ("junkemail", "archive")


def log(message: str) -> None:
    print(message, flush=True)


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
    last_error: RuntimeError | None = None
    for attempt in range(6):
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
            last_error = RuntimeError(json.dumps(error))
            if exc.code in {429, 503, 504} and attempt < 5:
                time.sleep(min(30, 2 ** attempt))
                continue
            raise last_error from exc
    raise last_error or RuntimeError("request failed")


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


def refresh_access_token(auth: dict[str, Any]) -> dict[str, Any]:
    refresh = auth.get("refresh_token")
    if not refresh:
        raise RuntimeError("No refresh token. Run start again.")
    tenant = auth.get("tenant") or "consumers"
    token = _json_request(
        "POST",
        f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
        form={
            "grant_type": "refresh_token",
            "client_id": CLIENT_ID,
            "refresh_token": refresh,
            "scope": SCOPES,
        },
    )
    auth.update(
        {
            "status": "ready",
            "access_token": token["access_token"],
            "refresh_token": token.get("refresh_token") or refresh,
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
    if re.match(r"^\d{2} ", name or ""):
        return True
    return lowered in SKIP_FOLDERS


def collect_scan_folders(token: str) -> list[dict[str, Any]]:
    inbox = graph(token, "GET", "/me/mailFolders/inbox")
    folders = [inbox]
    seen = {inbox["id"]}
    log(f"Inbox has {inbox.get('totalItemCount', '?')} items")
    for folder_id in load_source_folder_ids():
        try:
            extra = graph(token, "GET", f"/me/mailFolders/{enc(folder_id)}")
        except RuntimeError as exc:
            log(f"Linked folder not readable: {exc}")
            continue
        if extra.get("id") and extra["id"] not in seen:
            folders.append(extra)
            seen.add(extra["id"])
            log(
                f"Also scanning {extra.get('displayName')} "
                f"({extra.get('totalItemCount', '?')} items)"
            )
    for wellknown in SCAN_WELLKNOWN:
        try:
            extra = graph(token, "GET", f"/me/mailFolders/{wellknown}")
        except RuntimeError:
            continue
        if extra.get("id") and extra["id"] not in seen:
            folders.append(extra)
            seen.add(extra["id"])
            log(
                f"Also scanning {extra.get('displayName')} "
                f"({extra.get('totalItemCount', '?')} items)"
            )
    roots = graph_paged(token, "/me/mailFolders?$top=50")
    for extra in roots:
        name = str(extra.get("displayName") or "")
        fid = extra.get("id")
        if not fid or fid in seen or skip_folder_name(name):
            continue
        if int(extra.get("totalItemCount") or 0) < 1:
            continue
        folders.append(extra)
        seen.add(fid)
        log(f"Also scanning {name} ({extra.get('totalItemCount', '?')} items)")
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
        log(f"Reading mail in {folder.get('displayName')}...")
        path = (
            f"/me/mailFolders/{enc(folder['id'])}/messages"
            f"?$select=id,from,sender,subject&$top=100"
        )
        messages = graph_paged(token, path, limit=max(0, MAX_ITEMS - scanned))
        scanned += len(messages)
        log(f"  read {len(messages)} messages (total {scanned})")
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
        dest = pinned_folder_name(dest)
        destinations.append((mid, dest))
        plan[dest] += 1

    log(
        f"Will file {len(destinations)} company emails into {len(plan)} folders; "
        f"{inbox_stay} personal emails stay in Inbox"
    )
    ranks = load_pin_ranks()
    pinned_names = {pinned_folder_name(name, ranks) for name in ranks}
    inbox = graph(token, "GET", "/me/mailFolders/inbox")
    parent = get_or_create_child(token, inbox["id"], PARENT_FOLDER)
    inbox_children = {
        str(child.get("displayName")): child
        for child in graph_paged(
            token, f"/me/mailFolders/{enc(inbox['id'])}/childFolders?$top=100"
        )
    }
    company_children = {
        str(child.get("displayName")): child
        for child in graph_paged(
            token, f"/me/mailFolders/{enc(parent['id'])}/childFolders?$top=100"
        )
    }

    def lookup_existing(name: str) -> dict[str, Any] | None:
        bare = name.split(" ", 1)[-1] if name[:3].isdigit() and name[2:3] == " " else name
        for pool in (inbox_children, company_children):
            if name in pool:
                return pool[name]
            if bare in pool:
                return pool[bare]
        return None

    folder_objects: dict[str, dict[str, Any]] = {}
    for name in sorted(plan, key=str.lower):
        found = lookup_existing(name)
        if found:
            folder_objects[name] = found
            continue
        parent_id = inbox["id"] if name in pinned_names else parent["id"]
        created = graph(
            token,
            "POST",
            f"/me/mailFolders/{enc(parent_id)}/childFolders",
            {"displayName": name},
        )
        folder_objects[name] = created
        if name in pinned_names:
            inbox_children[name] = created
        else:
            company_children[name] = created
        log(f"Created folder {name}")

    moved = 0
    failed = 0
    batch_size = 20
    for start in range(0, len(destinations), batch_size):
        chunk = destinations[start : start + batch_size]
        requests = []
        for index, (mid, dest) in enumerate(chunk):
            target = folder_objects.get(dest)
            if not target:
                failed += 1
                continue
            requests.append(
                {
                    "id": str(index + 1),
                    "method": "POST",
                    "url": f"/me/messages/{enc(mid)}/move",
                    "headers": {"Content-Type": "application/json"},
                    "body": {"destinationId": target["id"]},
                }
            )
        if not requests:
            continue
        try:
            batch = graph(token, "POST", "/$batch", {"requests": requests})
            for item in batch.get("responses") or []:
                status = int(item.get("status") or 0)
                if 200 <= status < 300:
                    moved += 1
                else:
                    failed += 1
        except RuntimeError:
            for mid, dest in chunk:
                target = folder_objects.get(dest)
                if not target:
                    failed += 1
                    continue
                try:
                    graph(
                        token,
                        "POST",
                        f"/me/messages/{enc(mid)}/move",
                        {"destinationId": target["id"]},
                    )
                    moved += 1
                except RuntimeError:
                    failed += 1
        log(f"Moved {moved}/{len(destinations)} emails...")

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


def pin_important_folders(token: str) -> dict[str, Any]:
    ranks = load_pin_ranks()
    inbox = graph(token, "GET", "/me/mailFolders/inbox")
    companies = get_or_create_child(token, inbox["id"], PARENT_FOLDER)
    inbox_children = graph_paged(
        token, f"/me/mailFolders/{enc(inbox['id'])}/childFolders?$top=100"
    )
    company_children = graph_paged(
        token, f"/me/mailFolders/{enc(companies['id'])}/childFolders?$top=100"
    )
    all_children = inbox_children + company_children

    def find_folder(folder: str) -> dict[str, Any] | None:
        wanted = {folder, pinned_folder_name(folder, ranks)}
        wanted.update(f"{n:02d} {folder}" for n in range(1, 40))
        for child in all_children:
            name = str(child.get("displayName") or "")
            if name in wanted:
                return child
        return None

    renamed: list[str] = []
    moved_up: list[str] = []
    missing: list[str] = []
    # Phase 1: unique temp names so 03 GitHub / 03 GoDaddy cannot clash.
    temps: dict[str, dict[str, Any]] = {}
    for folder, rank in sorted(ranks.items(), key=lambda item: item[1]):
        current = find_folder(folder)
        if not current:
            missing.append(folder)
            continue
        temp_name = f"__pin_{rank:02d}_{folder}"
        if current.get("displayName") != temp_name:
            current = graph(
                token,
                "PATCH",
                f"/me/mailFolders/{enc(current['id'])}",
                {"displayName": temp_name},
            ) or current
        temps[folder] = current
        log(f"Holding {folder} as {temp_name}")

    # Phase 2: final names + move to Inbox so they sit at the top of the left list.
    for folder, rank in sorted(ranks.items(), key=lambda item: item[1]):
        current = temps.get(folder)
        if not current:
            continue
        display = pinned_folder_name(folder, ranks)
        if current.get("displayName") != display:
            current = graph(
                token,
                "PATCH",
                f"/me/mailFolders/{enc(current['id'])}",
                {"displayName": display},
            ) or current
            renamed.append(f"{folder} -> {display}")
            log(f"Pinned {display}")
        parent_ref = (current.get("parentFolderId") or "")
        if parent_ref != inbox["id"]:
            graph(
                token,
                "POST",
                f"/me/mailFolders/{enc(current['id'])}/move",
                {"destinationId": inbox["id"]},
            )
            moved_up.append(display)
            log(f"Moved {display} up under Inbox")
    result = {
        "renamed": renamed,
        "moved_up": moved_up,
        "missing": missing,
        "top_order": [
            pinned_folder_name(name, ranks)
            for name, _ in sorted(ranks.items(), key=lambda item: item[1])
        ],
    }
    Path("/opt/cursor/artifacts/pin-to-top-result.json").write_text(
        json.dumps(result, indent=2) + "\n", encoding="utf-8"
    )
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="File live Outlook company mail")
    parser.add_argument("command", choices=["start", "poll", "file", "status", "pin"])
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
    if record.get("status") != "ready" or not record.get("access_token"):
        print(json.dumps({"status": record.get("status"), "error": "not signed in"}, indent=2))
        return 3
    try:
        graph(record["access_token"], "GET", "/me/mailFolders/inbox")
    except RuntimeError as exc:
        if "InvalidAuthenticationToken" in str(exc) or "401" in str(exc):
            log("Refreshing Hotmail access...")
            record = refresh_access_token(record)
        else:
            raise
    if args.command == "pin":
        result = pin_important_folders(record["access_token"])
        print(json.dumps(result, indent=2))
        return 0
    result = file_mailbox(record["access_token"])
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
