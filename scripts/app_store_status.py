"""Read-only App Store Connect status report for the Parslia iOS app."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

import jwt


APP_ID = os.environ.get("APP_STORE_APP_ID", "6797909735")
API_ROOT = "https://api.appstoreconnect.apple.com/v1"


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
            "exp": __import__("time").time_ns() // 1_000_000_000 + 15 * 60,
        },
        private_key,
        algorithm="ES256",
        headers={"kid": required_environment("APP_STORE_CONNECT_KEY_ID")},
    )


TOKEN = ""


def api_get(path: str, **parameters: object) -> dict:
    query = urllib.parse.urlencode(parameters, doseq=True)
    url = f"{API_ROOT}{path}" + (f"?{query}" if query else "")
    request = urllib.request.Request(
        url,
        headers={"Authorization": f"Bearer {TOKEN}", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        try:
            details = json.loads(body).get("errors", [])
        except json.JSONDecodeError:
            details = []
        summary = "; ".join(
            f"{item.get('status', error.code)} {item.get('title', 'API error')}: {item.get('detail', '')}"
            for item in details
        ) or f"HTTP {error.code}"
        raise RuntimeError(f"App Store Connect rejected GET {path}: {summary}") from error


def included_by_type(response: dict, resource_type: str) -> dict[str, dict]:
    return {
        item["id"]: item
        for item in response.get("included", [])
        if item.get("type") == resource_type and item.get("id")
    }


def related_id(resource: dict, name: str) -> str | None:
    data = resource.get("relationships", {}).get(name, {}).get("data")
    return data.get("id") if isinstance(data, dict) else None


def relationship_labels(resource: dict) -> list[str]:
    labels: list[str] = []
    for name, relationship in resource.get("relationships", {}).items():
        data = relationship.get("data")
        linked = data if isinstance(data, list) else [data]
        for item in linked:
            if isinstance(item, dict) and item.get("type") and item.get("id"):
                labels.append(f"{name}={item['type']}/{item['id']}")
    return sorted(labels)


def report_app() -> None:
    response = api_get(
        f"/apps/{APP_ID}",
        **{"fields[apps]": "name,bundleId,contentRightsDeclaration"},
    )
    app = response["data"]
    attributes = app.get("attributes", {})
    print("APP")
    print(f"  name: {attributes.get('name')}")
    print(f"  bundle_id: {attributes.get('bundleId')}")
    print(f"  content_rights: {attributes.get('contentRightsDeclaration') or 'NOT_SET'}")


def report_versions_and_builds() -> None:
    response = api_get(
        f"/apps/{APP_ID}/appStoreVersions",
        **{
            "filter[platform]": "IOS",
            "include": "build",
            "limit": 20,
            "fields[appStoreVersions]": "versionString,appStoreState,appVersionState,platform,releaseType,createdDate,build",
            "fields[builds]": "version,uploadedDate,processingState,expired,usesNonExemptEncryption",
        },
    )
    builds = included_by_type(response, "builds")
    print("APP STORE VERSIONS")
    for version in response.get("data", []):
        attributes = version.get("attributes", {})
        build = builds.get(related_id(version, "build") or "", {})
        build_attributes = build.get("attributes", {})
        print(
            "  "
            f"{attributes.get('versionString')} | "
            f"state={attributes.get('appStoreState') or attributes.get('appVersionState')} | "
            f"release={attributes.get('releaseType')} | "
            f"build={build_attributes.get('version', 'NONE')} | "
            f"build_processing={build_attributes.get('processingState', 'NONE')} | "
            f"uploaded={build_attributes.get('uploadedDate', 'NONE')}"
        )

    build_response = api_get(
        "/builds",
        **{
            "filter[app]": APP_ID,
            "sort": "-uploadedDate",
            "limit": 10,
            "fields[builds]": "version,uploadedDate,processingState,expired,usesNonExemptEncryption",
        },
    )
    print("LATEST UPLOADED BUILDS")
    for build in build_response.get("data", []):
        attributes = build.get("attributes", {})
        print(
            "  "
            f"{attributes.get('version')} | "
            f"processing={attributes.get('processingState')} | "
            f"expired={attributes.get('expired')} | "
            f"uploaded={attributes.get('uploadedDate')} | id={build.get('id')}"
        )


def report_review_submissions() -> None:
    response = api_get(
        f"/apps/{APP_ID}/reviewSubmissions",
        **{
            "filter[platform]": "IOS",
            "include": "items,appStoreVersionForReview",
            "limit": 20,
            "limit[items]": 50,
            "fields[reviewSubmissions]": "platform,submittedDate,state,items,appStoreVersionForReview",
            "fields[reviewSubmissionItems]": "state,appStoreVersion",
            "fields[appStoreVersions]": "versionString,appStoreState,appVersionState,platform",
        },
    )
    versions = included_by_type(response, "appStoreVersions")
    items = included_by_type(response, "reviewSubmissionItems")
    print("REVIEW SUBMISSIONS")
    for submission in response.get("data", []):
        attributes = submission.get("attributes", {})
        version = versions.get(related_id(submission, "appStoreVersionForReview") or "", {})
        version_attributes = version.get("attributes", {})
        item_links = submission.get("relationships", {}).get("items", {}).get("data", [])
        item_states = [
            items.get(link.get("id", ""), {}).get("attributes", {}).get("state", "UNKNOWN")
            for link in item_links
        ]
        print(
            "  "
            f"id={submission.get('id')} | state={attributes.get('state')} | "
            f"submitted={attributes.get('submittedDate') or 'NOT_SUBMITTED'} | "
            f"version={version_attributes.get('versionString', 'NONE')} | "
            f"version_state={version_attributes.get('appStoreState') or version_attributes.get('appVersionState') or 'NONE'} | "
            f"items={','.join(item_states) if item_states else 'NONE'}"
        )
        for link in item_links:
            item = items.get(link.get("id", ""), {})
            item_attributes = item.get("attributes", {})
            relationships = relationship_labels(item)
            print(
                "    "
                f"item={item.get('id')} | state={item_attributes.get('state', 'UNKNOWN')} | "
                f"relationships={';'.join(relationships) if relationships else 'NONE'}"
            )


def report_subscriptions() -> None:
    response = api_get(
        f"/apps/{APP_ID}/subscriptionGroups",
        **{
            "include": "subscriptions",
            "limit": 50,
            "limit[subscriptions]": 50,
            "fields[subscriptionGroups]": "referenceName,subscriptions",
            "fields[subscriptions]": "name,productId,state,subscriptionPeriod,groupLevel",
        },
    )
    subscriptions = included_by_type(response, "subscriptions")
    print("SUBSCRIPTION GROUPS")
    for group in response.get("data", []):
        name = group.get("attributes", {}).get("referenceName")
        print(f"  {name} | id={group.get('id')}")
        links = group.get("relationships", {}).get("subscriptions", {}).get("data", [])
        linked = [subscriptions.get(link.get("id", ""), {}) for link in links]
        for subscription in sorted(linked, key=lambda item: item.get("attributes", {}).get("groupLevel", 99)):
            attributes = subscription.get("attributes", {})
            print(
                "    "
                f"{attributes.get('productId')} | {attributes.get('name')} | "
                f"state={attributes.get('state')} | period={attributes.get('subscriptionPeriod')} | "
                f"level={attributes.get('groupLevel')} | id={subscription.get('id')}"
            )


def main() -> int:
    global TOKEN
    TOKEN = create_token()
    print("Parslia App Store Connect read-only status")
    print(f"app_id: {APP_ID}")
    for reporter in (report_app, report_versions_and_builds, report_review_submissions, report_subscriptions):
        try:
            reporter()
        except Exception as error:  # Keep the rest of the audit useful if one endpoint is unavailable.
            print(f"ERROR: {error}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
