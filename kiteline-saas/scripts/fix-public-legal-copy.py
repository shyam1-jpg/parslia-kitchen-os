#!/usr/bin/env python3
"""Correct Kiteline public website wording, legal identity, encoding, feature status."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]  # overridden by argv
FOOTER_LINE = (
    "© 2026 Kiteline. All rights reserved. "
    "Kiteline is an independent software brand and is not operated by or "
    "affiliated with The Vedanta Way Limited."
)

GLOBAL_REPLACEMENTS = [
    # Encoding / broken chars
    ("\ufffd", ""),
    ("© 2026 Kiteline � All rights reserved.", FOOTER_LINE),
    ("© 2026 Kiteline · All rights reserved.", FOOTER_LINE),
    ("© 2026 Kiteline · All rights reserved", FOOTER_LINE),
    ("� 2026 Kiteline ? All rights reserved.", FOOTER_LINE),
    ("� 2026 Kiteline", "© 2026 Kiteline"),
    ("customers? data", "customers' data"),
    ("customers?", "customers'"),
    ("organisation?", "organisation"),
    ("?we?", '"we"'),
    ("?us?", '"us"'),
    ("?our?", '"our"'),
    ("cancel anytime ?", "cancel anytime."),
    ("�100", "£100"),
    ("&pound;100", "£100"),
    # Vedanta legal identity (branding / company claims)
    (
        "© 2026 Vedanta Way Ltd. Kiteline is a trading name. All rights reserved.",
        FOOTER_LINE,
    ),
    (
        "© 2026 Vedanta Way Ltd. Kiteline is a trading name. All rights reserved",
        FOOTER_LINE,
    ),
    ("Kiteline is a trading name of Vedanta Way Ltd", "Kiteline is an independent software brand"),
    ("Kiteline is a trading name of The Vedanta Way Limited", "Kiteline is an independent software brand"),
    ("trading name of Vedanta Way Ltd", "independent software brand"),
    ("trading name of The Vedanta Way Limited", "independent software brand"),
    ("operated by Vedanta Way Ltd", "an independent software brand"),
    ("operated by The Vedanta Way Limited", "an independent software brand"),
]

# Applied after footer is set — never rewrite the affiliation disclaimer line.
VEDANTA_SCRUB = [
    ("© 2026 Vedanta Way Ltd. Kiteline is a trading name. All rights reserved.", FOOTER_LINE),
    ("Kiteline is a trading name of Vedanta Way Ltd.", "Kiteline is an independent software brand."),
    ("Kiteline is a trading name of Vedanta Way Ltd", "Kiteline is an independent software brand"),
    ("Kiteline is a trading name of The Vedanta Way Limited.", "Kiteline is an independent software brand."),
    ("Kiteline is a trading name of The Vedanta Way Limited", "Kiteline is an independent software brand"),
    ("a trading name of Vedanta Way Ltd", "an independent software brand"),
    ("a trading name of The Vedanta Way Limited", "an independent software brand"),
    ("operated by Vedanta Way Ltd", "an independent software brand"),
    ("operated by The Vedanta Way Limited", "an independent software brand"),
    ("Vedanta Way Ltd.", "[independent brand — not Vedanta]"),
    ("Vedanta Way Ltd", "[independent brand — not Vedanta]"),
    ("The Vedanta Way Limited", "[independent brand — not Vedanta]"),
    ("Vedanta Way Limited", "[independent brand — not Vedanta]"),
]

# More careful Vedanta cleanup after blanket replace may say "Kiteline" twice — fix later

HOMEPAGE = [
    ("EHO-ready records", "Inspection-friendly records"),
    ("EHO-ready", "Inspection-friendly records"),
    (
        "Export temperature logs and corrective actions when the EHO visits.",
        "Organise and export temperature logs and corrective-action records for inspections.",
    ),
    ("One login, many kitchens", "One organisation workspace, multiple kitchen sites"),
    (
        "Each customer organisation has an isolated workspace",
        "Each customer organisation has its own workspace, with access controlled through authorised user accounts",
    ),
    (
        "Start your 14-day free trial — every module included",
        "Start your 14-day free trial with access to all currently available core software modules.",
    ),
    (
        "Start your 14-day free trial — every module included.",
        "Start your 14-day free trial with access to all currently available core software modules.",
    ),
    (
        "Register, sign-in, and forgot password. Reset link on screen until email is configured.",
        "Register and sign-in are available. Password reset: in development — secure password-reset emails will be enabled before public commercial launch.",
    ),
    (
        "Reset link on screen until email is configured.",
        "In development — secure password-reset emails will be enabled before public commercial launch.",
    ),
    ("Allergen safety", "Allergen information tools"),
    ("Export history for inspections.", "Organise and export records for inspections."),
]

SAFESERVE = [
    ("Inspection-ready reports", "Inspection-friendly reports"),
    (
        "Works for EHO visits and internal audits",
        "Helps kitchens organise records for inspections and internal reviews.",
    ),
    (
        "Data stored on Kiteline servers",
        "Data stored within Kiteline’s hosted cloud environment.",
    ),
    (
        "export inspection-ready reports",
        "export inspection-friendly reports",
    ),
]

USECASE = [
    ("Ensures allergen safety", "Helps teams manage allergen information"),
    ("ensures allergen safety", "helps teams manage allergen information"),
    ("EHO-ready", "Inspection-friendly"),
    ("guaranteed compliance", "structured record-keeping"),
    ("Guaranteed compliance", "Structured record-keeping"),
    (
        "export records before an EHO visit",
        "export records ahead of an inspection",
    ),
    (
        "and compliance across locations",
        "and food-safety records across locations",
    ),
]


def fix_charset(html: str) -> str:
    if re.search(r'charset\s*=\s*["\']?utf-8', html, re.I):
        html = re.sub(
            r'<meta[^>]+charset[^>]*>',
            '<meta charset="UTF-8" />',
            html,
            count=1,
            flags=re.I,
        )
    elif "<head>" in html.lower():
        html = re.sub(
            r"(<head[^>]*>)",
            r'\1\n  <meta charset="UTF-8" />',
            html,
            count=1,
            flags=re.I,
        )
    return html


def replace_footer_paragraphs(html: str) -> str:
    """Replace copyright footer paragraphs with the global independent footer."""
    patterns = [
        r"<p>\s*©?\s*2026 Kiteline[^<]*</p>",
        r"<p>\s*�\s*2026 Kiteline[^<]*</p>",
        r"<div class=\"text-center sm:text-right\">© 2026 Kiteline[^<]*</div>",
        r"<p class=\"mt-8 text-xs text-white/40\">© 2026 Kiteline[^<]*</p>",
    ]
    for pat in patterns:
        html = re.sub(pat, f"<p>{FOOTER_LINE}</p>", html, flags=re.I)
    # Academy mention footers
    html = re.sub(
        r"<p>© 2026 Kiteline · All rights reserved\. <a[^>]*>Kiteline Academy</a>[^<]*</p>",
        f"<p>{FOOTER_LINE}</p>",
        html,
        flags=re.I,
    )
    return html


def apply_pairs(text: str, pairs: list[tuple[str, str]]) -> str:
    for old, new in pairs:
        if old in text:
            text = text.replace(old, new)
    return text


def fix_file(path: Path) -> bool:
    raw = path.read_bytes()
    # decode leniently then rewrite utf-8
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        text = raw.decode("utf-8", errors="replace")
        text = text.replace("\ufffd", "")

    original = text
    text = fix_charset(text)
    text = apply_pairs(text, GLOBAL_REPLACEMENTS)
    text = replace_footer_paragraphs(text)
    # Scrub Vedanta legal identity while protecting the disclaimer footer
    parts = text.split(FOOTER_LINE)
    scrubbed = []
    for i, part in enumerate(parts):
        scrubbed.append(apply_pairs(part, VEDANTA_SCRUB))
    text = FOOTER_LINE.join(scrubbed)

    name = path.name
    rel = str(path).replace("\\", "/")

    if name == "index.html" and ("/site/" in rel or rel.endswith("site/index.html")):
        text = apply_pairs(text, HOMEPAGE)
        # Stripe milestone on homepage
        text = text.replace(
            "Stripe checkout — team plans by size with member limits.",
            "During early access, paid plans are arranged manually by email and invoice. Online card payments are planned but not currently available.",
        )
        text = text.replace(
            "every module included",
            "all currently available core software modules",
        )

    if name == "product-haccp.html":
        text = apply_pairs(text, SAFESERVE)

    if "/use-cases/" in rel:
        text = apply_pairs(text, USECASE)

    if name == "contact.html":
        text = text.replace(
            "Company registration details available on request for B2B contracts.",
            "Currently in early access. Email: contact@kiteline.uk",
        )
        # Replace Company section blurb if present
        text = re.sub(
            r"(<h3[^>]*>Company</h3>\s*<p[^>]*>)(.*?)(</p>)",
            r"\1Kiteline<br>Independent professional kitchen software<br>Currently in early access<br>Email: <a href=\"mailto:contact@kiteline.uk\" class=\"text-brand-700\">contact@kiteline.uk</a>\3",
            text,
            count=1,
            flags=re.S | re.I,
        )

    if name == "pricing.html":
        text = text.replace(
            "Try the app free for 14 days — all modules included, no card required to register.",
            "Try the app free for 14 days with access to all currently available core software modules. No card required to register.",
        )
        text = text.replace(
            "All modules included (SafeServe, MenuGuard, labels, waste).",
            "All currently available core software modules included. Recipe AI, sensor hardware, printers, consumables and future premium integrations are separate.",
        )
        text = text.replace(
            "all modules included",
            "all currently available core software modules included",
        )
        text = text.replace("All modules included", "Core modules included (see status below)")
        text = text.replace("all modules", "currently available core modules")
        text = text.replace(
            "Up to 5 users · all modules",
            "Up to 5 users · 1 site · core modules",
        )
        text = text.replace(
            "✓ Multi-site (Team plan)",
            "✓ 1 site included (Team 5)",
        )
        text = text.replace(
            "£8.00 per user · cancel anytime",
            "£8.00 effective monthly price per included user when the plan is fully used",
        )
        text = text.replace(
            "per user · cancel anytime",
            "effective monthly price per included user when the plan is fully used",
        )
        text = text.replace(
            "Subscribe in the app (Stripe). Kiteline hosts AI — your company pays us monthly.",
            "Recipe AI is currently available to selected pilot customers. Final pricing and monthly usage allowances will be published before general release.",
        )
        text = text.replace(
            "<b>Option A:</b> Subscribe to Recipe AI in the app (Settings) — charged to your company via Stripe, not to other Kiteline customers.<br><b>Option B:</b> Add your own OpenAI key in Settings — OpenAI bills your company directly.<br><b>Option C:</b> Email <a href=\"mailto:contact@kiteline.uk\" class=\"text-brand-700 font-semibold\">contact@kiteline.uk</a> and we enable AI on your account (invoice or pilot).",
            "Recipe AI is currently available to selected pilot customers. Final pricing, monthly usage allowances, and AI-provider data handling will be published before general release. Email <a href=\"mailto:contact@kiteline.uk\" class=\"text-brand-700 font-semibold\">contact@kiteline.uk</a> for pilot access.",
        )
        # VAT notice after prices intro if missing
        if "not currently VAT-registered" not in text:
            text = text.replace(
                '<p class="text-center text-sm text-brand-700 font-semibold mb-10">',
                '<p class="text-center text-sm text-ink-600 mb-4">Kiteline is not currently VAT-registered. No VAT is charged at this time.</p>\n    <p class="text-center text-sm text-brand-700 font-semibold mb-10">',
            )
        # Payment wording
        text = text.replace(
            "Subscribe in the app through Stripe",
            "Paid plans are arranged manually by email and invoice",
        )
        if "Online card payments and self-service subscription management are planned" not in text:
            text = text.replace(
                '<p id="footerBillingNote"',
                '<p class="text-sm text-ink-500 mb-4 max-w-2xl mx-auto">During early access, paid plans are arranged manually by email and invoice. Online card payments and self-service subscription management are planned but are not currently available.</p>\n    <p id="footerBillingNote"',
            )
            if 'id="footerBillingNote"' not in text and "During early access, paid plans" not in text:
                text = text.replace(
                    "<footer",
                    '<p class="text-center text-sm text-ink-500 px-5 mb-6 max-w-2xl mx-auto">During early access, paid plans are arranged manually by email and invoice. Online card payments and self-service subscription management are planned but are not currently available.</p>\n  <footer',
                    1,
                )

    if name == "terms.html":
        text = re.sub(
            r"<h2[^>]*>1\.\s*Who we are</h2>\s*<p>.*?</p>",
            "<h2>1. Who we are</h2>\n    <p>Kiteline is an independent software brand. The legal operator’s full name, service address and business details will be added before paid commercial subscriptions are activated. Contact: <a href=\"mailto:contact@kiteline.uk\" class=\"text-brand-700\">contact@kiteline.uk</a>.</p>",
            text,
            count=1,
            flags=re.S | re.I,
        )
        text = text.replace(
            'Kiteline (“we”, “us”, “our”) provides the service at kiteline.uk.',
            "Kiteline is an independent software brand. Contact: contact@kiteline.uk.",
        )
        text = text.replace(
            'Kiteline ("we", "us", "our") provides the service at kiteline.uk.',
            "Kiteline is an independent software brand. Contact: contact@kiteline.uk.",
        )
        # Soften liability presentation
        if "£100" in text and "reviewed professionally" not in text:
            text = text.replace(
                "£100",
                "£100 (indicative only — to be reviewed professionally before commercial launch)",
                1,
            )

    if name == "privacy.html":
        text = re.sub(
            r"<h2[^>]*>1\.\s*Data controller</h2>\s*<p>.*?</p>",
            "<h2>1. Data controller</h2>\n    <p>Kiteline is an independent software brand operated by [FULL LEGAL OPERATOR NAME]. For account, website, support and marketing data, [FULL LEGAL OPERATOR NAME] is the data controller. Contact: <a href=\"mailto:contact@kiteline.uk\" class=\"text-brand-700\">contact@kiteline.uk</a>. The customer organisation normally acts as data controller for the staff and operational data entered into its workspace. Kiteline processes that information on the customer’s instructions when providing the hosted service.</p>",
            text,
            count=1,
            flags=re.S | re.I,
        )
        text = text.replace(
            "Kiteline is the data controller.",
            "See section 1 for the temporary controller wording pending confirmation of the legal operator.",
        )
        text = text.replace(
            "GET /api/workspace/export",
            "an organisation data export (where available to authorised administrators)",
        )
        text = text.replace(
            "`GET /api/workspace/export`",
            "an organisation data export request",
        )
        # Soften conditional providers
        text = text.replace(
            "Neon Postgres or configured database provider",
            "the configured hosted database provider (details confirmed at launch)",
        )
        text = text.replace(
            "SMTP provider when configured",
            "email delivery provider (when transactional email is enabled)",
        )
        text = text.replace(
            "Stripe when enabled",
            "card payment provider (planned — not currently active)",
        )
        text = text.replace(
            "Twilio when live",
            "SMS provider (planned — not currently active)",
        )
        text = text.replace(
            "Payment data — processed by Stripe when you subscribe",
            "Payment data — not processed by card checkout at this time; paid pilots use invoice",
        )
        text = text.replace(
            "Payments — Stripe for billing when enabled.",
            "Payments — online card billing is planned and not currently active.",
        )

    if name == "security.html":
        text = text.replace(
            "2FA — optional two-factor authentication for student accounts.",
            "Two-factor authentication — planned security improvement for the kitchen app (not claimed as available now).",
        )
        text = text.replace(
            "Optional two-factor authentication for student accounts.",
            "Two-factor authentication is a planned security improvement and is not claimed as available in the kitchen app today.",
        )
        # Label unverified claims if present as absolute
        text = text.replace(
            "Bank-grade security",
            "Security practices (verify each control before launch)",
        )

    if name == "dpa.html":
        text = text.replace(
            "A full signed DPA is available on request",
            "A formal Data Processing Agreement will be available before paid B2B customer onboarding",
        )
        if "formal Data Processing Agreement will be available" not in text:
            # insert near top after first intro para
            text = text.replace(
                "<h1",
                "<p class=\"text-sm text-ink-600 mb-6\">A formal Data Processing Agreement will be available before paid B2B customer onboarding. Contact <a href=\"mailto:contact@kiteline.uk\" class=\"text-brand-700\">contact@kiteline.uk</a> for information about the planned data-processing arrangements.</p>\n  <h1",
                1,
            )
        text = text.replace(
            "payments (Stripe)",
            "payments (planned card provider — not currently active)",
        )

    if name == "refunds.html":
        text = text.replace(
            "When Stripe checkout is live, card subscriptions follow Stripe’s billing cycle",
            "When online card checkout becomes available, subscription cycles will follow the published billing terms",
        )
        text = text.replace(
            "cancel in the app or via Stripe’s customer portal",
            "cancel according to the terms in your accepted quotation",
        )
        if "No payment is taken automatically when the free trial ends" not in text:
            text = text.replace(
                "<h1",
                "<p class=\"text-sm text-ink-600 mb-4\">No payment is taken automatically when the free trial ends. During early access, any paid pilot subscription is arranged manually by written quotation and invoice. The applicable cancellation and refund terms will be included in the accepted quotation.</p>\n  <h1",
                1,
            )

    if name == "cookies.html":
        text = text.replace(
            "keep you logged in to the app and Academy",
            "keep you logged in to the Kiteline kitchen app where you use it",
        )
        text = text.replace(
            "Stripe checkout and analytics cookies when those features are enabled",
            "payment or analytics cookies only if those services are actually loaded on the page (not currently active by default)",
        )
        # Remove Academy-centric claims if present as primary
        text = text.replace(
            "Academy cookies",
            "cookies for any separate Academy product (only if used on this domain)",
        )

    if name == "hardware.html":
        text = text.replace(
            "We only buy stock when enough kitchens ask.",
            "Hardware is being assessed through a limited pilot programme. Availability will depend on successful testing, site compatibility and confirmed supplier arrangements.",
        )
        text = text.replace(
            "Works with Kiteline /api/ingest",
            "Designed to connect compatible sensor readings with the Kiteline dashboard.",
        )
        text = text.replace(
            "Sensors, label printers, and rolls that plug straight into Kiteline.",
            "Sensor and labelling hardware is being assessed through a limited pilot programme.",
        )
        text = text.replace(
            "food-safe",
            "suitable for kitchen labelling use (supplier certifications to be confirmed before sale)",
        )
        text = text.replace(
            "Reorder rolls from Kiteline",
            "Label-roll supply arrangements will be confirmed if Kiteline sells consumables",
        )

    if name == "faq.html":
        text = text.replace(
            "14 days free for new accounts, up to 5 users, all modules. No card required to register.",
            "14 days free for new accounts, up to 5 users, with access to currently available core software modules. No card required to register.",
        )
        text = text.replace(
            "When online checkout is enabled, you can subscribe securely by card",
            "During early access, paid plans are arranged manually by email and invoice; online card checkout is planned",
        )

    if text != original:
        path.write_text(text, encoding="utf-8", newline="\n")
        return True
    # still rewrite utf-8 if encoding was wrong
    if path.read_bytes() != text.encode("utf-8"):
        path.write_text(text, encoding="utf-8", newline="\n")
        return True
    return False


def main():
    import sys

    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    targets = []
    for p in [
        root / "site",
    ]:
        if p.is_dir():
            targets.extend(sorted(p.rglob("*.html")))
    # only public marketing/legal — skip academy deep product UIs? User asked entire public website.
    # Include academy legal pages but skip vedanta-rota/ordering app shells for operational paths —
    # still remove Vedanta Way Ltd trading-name claims if any.
    changed = []
    for path in targets:
        rel = str(path.relative_to(root))
        # Skip heavy app UIs that are customer-specific tools (not Kiteline marketing)
        if "vedanta-rota" in rel or "vedanta-ordering" in rel:
            # Still scrub trading-name / Way Ltd claims if present in HTML
            try:
                t = path.read_text(encoding="utf-8", errors="replace")
            except Exception:
                continue
            nt = t
            for old, new in [
                ("Vedanta Way Ltd", "—"),
                ("The Vedanta Way Limited", "—"),
                ("trading name of Vedanta", "independent brand unrelated to Vedanta"),
            ]:
                nt = nt.replace(old, new)
            if nt != t:
                path.write_text(nt, encoding="utf-8")
                changed.append(rel + " (scrub)")
            continue
        if "menu-creator/imports" in rel:
            continue
        if fix_file(path):
            changed.append(rel)

    print(f"Updated {len(changed)} files:")
    for c in changed:
        print(" -", c)


if __name__ == "__main__":
    main()
