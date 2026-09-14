"""Prepare Parslia's first iOS app-and-subscriptions review package.

This intentionally separates preparation from final submission. The prepare operation
attaches a verified build, retires the unusable unresolved submission, creates fresh
subscription metadata snapshots, and groups all items in one new draft submission.
The submit operation only submits an already complete draft.
"""

from __future__ import annotations

import argparse
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request

import jwt


APP_ID = os.environ.get("APP_STORE_APP_ID", "6797909735")
APP_VERSION = os.environ.get("APP_STORE_VERSION", "1.0")
API_ROOT = "https://api.appstoreconnect.apple.com/v1"
EXPECTED_PRODUCTS = {
    "app.parslia.kitchen.starter.monthly",
    "app.parslia.kitchen.starter.annual",
    "app.parslia.kitchen.pro.monthly",
    "app.parslia.kitchen.pro.annual",
    "app.parslia.kitchen.business.monthly",
    "app.parslia.kitchen.ai.booster.monthly",
}


def required_environment(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def create_token() -> str:
    private_key = required_environment("APP_STORE_CONNECT_PRIVATE_KEY").replace("\\n", "\n")
    return jwt.encode(
        {
            "iss": required_environment("APP_STORE_CONNECT_ISSUER_ID"),
            "aud": "appstoreconnect-v1",
            "exp": int(time.time()) + 15 * 60,
        },
        private_key,
        algorithm="ES256",
        headers={"kid": required_environment("APP_STORE_CONNECT_KEY_ID")},
    )


TOKEN = ""


def api_request(method: str, path: str, payload: dict | None = None, **parameters: object) -> dict:
    query = urllib.parse.urlencode(parameters, doseq=True)
    url = f"{API_ROOT}{path}" + (f"?{query}" if query else "")
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(
        url,
        data=body,
        method=method,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            raw = response.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        raw = error.read().decode("utf-8", errors="replace")
        try:
            details = json.loads(raw).get("errors", [])
        except json.JSONDecodeError:
            details = []
        summary = "; ".join(
            f"{item.get('status', error.code)} {item.get('title', 'API error')}: {item.get('detail', '')}"
            for item in details
        ) or f"HTTP {error.code}: {raw[:500]}"
        raise RuntimeError(f"App Store Connect rejected {method} {path}: {summary}") from error


def api_get(path: str, **parameters: object) -> dict:
    return api_request("GET", path, **parameters)


def resource_id(response: dict, description: str) -> str:
    resources = response.get("data", [])
    if isinstance(resources, dict):
        return str(resources["id"])
    if len(resources) != 1:
        raise RuntimeError(f"Expected one {description}; Apple returned {len(resources)}")
    return str(resources[0]["id"])


def app_store_version_id() -> str:
    response = api_get(
        f"/apps/{APP_ID}/appStoreVersions",
        **{
            "filter[platform]": "IOS",
            "filter[versionString]": APP_VERSION,
            "limit": 10,
            "fields[appStoreVersions]": "versionString,appStoreState,platform",
        },
    )
    return resource_id(response, f"iOS App Store version {APP_VERSION}")


def verified_build_id(build_number: str) -> str:
    response = api_get(
        "/builds",
        **{
            "filter[app]": APP_ID,
            "filter[version]": build_number,
            "limit": 10,
            "fields[builds]": "version,processingState,expired,uploadedDate",
        },
    )
    candidates = [
        item
        for item in response.get("data", [])
        if item.get("attributes", {}).get("processingState") == "VALID"
        and not item.get("attributes", {}).get("expired", False)
    ]
    if len(candidates) != 1:
        states = [item.get("attributes", {}) for item in response.get("data", [])]
        raise RuntimeError(f"Build {build_number} is not uniquely VALID and unexpired: {states}")
    return str(candidates[0]["id"])


def attach_build(version_id: str, build_id: str) -> None:
    api_request(
        "PATCH",
        f"/appStoreVersions/{version_id}/relationships/build",
        {"data": {"type": "builds", "id": build_id}},
    )
    print(f"Attached build {build_id} to App Store version {version_id}")


def list_review_submissions() -> list[dict]:
    response = api_get(
        f"/apps/{APP_ID}/reviewSubmissions",
        **{
            "filter[platform]": "IOS",
            "limit": 20,
            "fields[reviewSubmissions]": "platform,submittedDate,state",
        },
    )
    return response.get("data", [])


def cancel_unresolved_submissions() -> None:
    unresolved = [
        item
        for item in list_review_submissions()
        if item.get("attributes", {}).get("state") == "UNRESOLVED_ISSUES"
    ]
    if len(unresolved) > 1:
        raise RuntimeError("More than one unresolved iOS review submission exists; refusing an ambiguous change")
    if not unresolved:
        print("No unresolved review submission needs cancellation")
        return

    submission_id = str(unresolved[0]["id"])
    api_request(
        "PATCH",
        f"/reviewSubmissions/{submission_id}",
        {
            "data": {
                "type": "reviewSubmissions",
                "id": submission_id,
                "attributes": {"canceled": True},
            }
        },
    )
    print(f"Canceled unusable unresolved review submission {submission_id}")

    for _ in range(36):
        response = api_get(
            f"/reviewSubmissions/{submission_id}",
            **{"fields[reviewSubmissions]": "state"},
        )
        state = response.get("data", {}).get("attributes", {}).get("state")
        if state == "COMPLETE":
            print("Previous review submission is complete")
            return
        if state not in {"CANCELING", "COMPLETING"}:
            raise RuntimeError(f"Unexpected state while canceling prior submission: {state}")
        time.sleep(5)
    raise RuntimeError("Apple did not finish canceling the prior submission within three minutes")


def existing_or_create_version(
    resource_type: str,
    relationship_name: str,
    relationship_type: str,
    related_id: str,
) -> str:
    parent_path = "subscriptionGroups" if relationship_type == "subscriptionGroups" else "subscriptions"
    existing = api_get(
        f"/{parent_path}/{related_id}/versions",
        **{"limit": 50},
    ).get("data", [])
    reusable = [
        item
        for item in existing
        if item.get("attributes", {}).get("state") in {"READY_FOR_REVIEW", "DEVELOPER_REJECTED"}
    ]
    if len(reusable) == 1:
        item = reusable[0]
        print(
            f"Reusing {resource_type} {item.get('id')} "
            f"in state {item.get('attributes', {}).get('state')}"
        )
        return str(item["id"])
    if reusable:
        raise RuntimeError(f"Multiple reusable {resource_type} resources exist for {related_id}")

    response = api_request(
        "POST",
        f"/{resource_type}",
        {
            "data": {
                "type": resource_type,
                "relationships": {
                    relationship_name: {
                        "data": {"type": relationship_type, "id": related_id}
                    }
                },
            }
        },
    )
    return resource_id(response, resource_type)


def current_catalog() -> tuple[list[str], list[str]]:
    groups_response = api_get(
        f"/apps/{APP_ID}/subscriptionGroups",
        **{
            "include": "subscriptions",
            "limit": 50,
            "limit[subscriptions]": 50,
            "fields[subscriptionGroups]": "referenceName,subscriptions",
            "fields[subscriptions]": "productId,state",
        },
    )
    subscriptions = {
        item.get("attributes", {}).get("productId"): item
        for item in groups_response.get("included", [])
        if item.get("type") == "subscriptions"
    }
    if set(subscriptions) != EXPECTED_PRODUCTS:
        raise RuntimeError(
            "Subscription catalog mismatch. "
            f"Expected {sorted(EXPECTED_PRODUCTS)}, found {sorted(subscriptions)}"
        )
    not_ready = {
        product_id: item.get("attributes", {}).get("state")
        for product_id, item in subscriptions.items()
        if item.get("attributes", {}).get("state") != "READY_TO_SUBMIT"
    }
    if not_ready:
        raise RuntimeError(f"Subscriptions are not ready to submit: {not_ready}")

    group_ids = [str(item["id"]) for item in groups_response.get("data", [])]
    subscription_ids = [str(subscriptions[product_id]["id"]) for product_id in sorted(subscriptions)]
    if len(group_ids) != 2:
        raise RuntimeError(f"Expected exactly two subscription groups; found {len(group_ids)}")
    return group_ids, subscription_ids


def create_review_submission() -> str:
    response = api_request(
        "POST",
        "/reviewSubmissions",
        {
            "data": {
                "type": "reviewSubmissions",
                "attributes": {"platform": "IOS"},
                "relationships": {"app": {"data": {"type": "apps", "id": APP_ID}}},
            }
        },
    )
    return resource_id(response, "review submission")


def add_review_item(submission_id: str, relationship_name: str, resource_type: str, item_id: str) -> None:
    api_request(
        "POST",
        "/reviewSubmissionItems",
        {
            "data": {
                "type": "reviewSubmissionItems",
                "relationships": {
                    "reviewSubmission": {
                        "data": {"type": "reviewSubmissions", "id": submission_id}
                    },
                    relationship_name: {"data": {"type": resource_type, "id": item_id}},
                },
            }
        },
    )
    print(f"Added {relationship_name} {item_id}")


def prepare(build_number: str) -> None:
    version_id = app_store_version_id()
    build_id = verified_build_id(build_number)
    attach_build(version_id, build_id)
    cancel_unresolved_submissions()

    active = [
        item
        for item in list_review_submissions()
        if item.get("attributes", {}).get("state") not in {"COMPLETE"}
    ]
    if active:
        states = [(item.get("id"), item.get("attributes", {}).get("state")) for item in active]
        raise RuntimeError(f"An active review submission already exists after cleanup: {states}")

    group_ids, subscription_ids = current_catalog()
    group_versions = [
        existing_or_create_version(
            "subscriptionGroupVersions", "subscriptionGroup", "subscriptionGroups", group_id
        )
        for group_id in group_ids
    ]
    subscription_versions = [
        existing_or_create_version(
            "subscriptionVersions", "subscription", "subscriptions", subscription_id
        )
        for subscription_id in subscription_ids
    ]
    submission_id = create_review_submission()
    add_review_item(submission_id, "appStoreVersion", "appStoreVersions", version_id)
    for item_id in group_versions:
        add_review_item(submission_id, "subscriptionGroupVersion", "subscriptionGroupVersions", item_id)
    for item_id in subscription_versions:
        add_review_item(submission_id, "subscriptionVersion", "subscriptionVersions", item_id)
    print(f"Prepared complete draft review submission {submission_id} with 9 items")


def submit() -> None:
    drafts = [
        item
        for item in list_review_submissions()
        if item.get("attributes", {}).get("state") == "READY_FOR_REVIEW"
    ]
    if len(drafts) != 1:
        raise RuntimeError(f"Expected exactly one READY_FOR_REVIEW submission; found {len(drafts)}")
    submission_id = str(drafts[0]["id"])
    items = api_get(
        f"/reviewSubmissions/{submission_id}/items",
        **{"limit": 50, "fields[reviewSubmissionItems]": "state"},
    ).get("data", [])
    states = [item.get("attributes", {}).get("state") for item in items]
    if len(items) != 9 or any(state != "READY_FOR_REVIEW" for state in states):
        raise RuntimeError(f"Review package is not complete: item_count={len(items)}, states={states}")
    api_request(
        "PATCH",
        f"/reviewSubmissions/{submission_id}",
        {
            "data": {
                "type": "reviewSubmissions",
                "id": submission_id,
                "attributes": {"submitted": True},
            }
        },
    )
    print(f"Submitted complete review package {submission_id} to Apple")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("operation", choices=("prepare", "submit"))
    parser.add_argument("--build-number")
    args = parser.parse_args()
    if args.operation == "prepare" and not args.build_number:
        parser.error("prepare requires --build-number")

    global TOKEN
    TOKEN = create_token()
    if args.operation == "prepare":
        prepare(args.build_number)
    else:
        submit()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
