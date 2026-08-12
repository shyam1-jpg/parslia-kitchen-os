# Parslia iOS App Store submission checklist

Prepared 11 August 2026. App Store Connect app ID: `6797909735`. Bundle ID: `app.parslia.kitchen`.

Production Hercules application URL: `https://parslia-kitchen-os-667132.onhercules.app/`.

## Subscription setup

- Subscription group reference name: **Parslia Plans**
- Group display name: **Parslia Plans**
- Rank 1: Pro products; rank 2: Starter products (upgrades become effective immediately; downgrades follow Apple’s service rules).
- `app.parslia.kitchen.starter.monthly` — Starter Monthly — £29/month
- `app.parslia.kitchen.starter.annual` — Starter Annual — £290/year
- `app.parslia.kitchen.pro.monthly` — Pro Monthly — £59/month
- `app.parslia.kitchen.pro.annual` — Pro Annual — £590/year
- Add a **Free Trial / 2 Weeks** introductory offer to every product. Apple determines eligibility once per subscription group.
- Review screenshot: capture the in-app paywall on an iPhone simulator with the product name, price and trial visible.
- Subscription review notes: “StoreKit 2 paywall is opened from View plans in the navigation bar. Use the supplied review account, select any plan, and use Apple sandbox purchase controls. Restore Purchases and Manage Subscription are on the same screen.”

## URLs and agreements

- Privacy Policy URL: `https://parslia.app/privacy.html`
- Support URL: `https://parslia.app/support.html`
- Terms URL: `https://parslia.app/terms.html`
- Subscription terms: `https://parslia.app/subscription-terms.html`
- Licence: Apple Standard EULA: `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`
- Account holder must review the drafts, insert the legal entity/company registration details, and publish them before submission.

## App Privacy draft answers (confirm against production telemetry)

- Contact Info — Email Address: collected, linked to identity; App Functionality and Account Management.
- User Content — Photos/Videos, Other User Content: collected only when the customer uploads it, linked to identity; App Functionality.
- Identifiers — User ID: collected, linked to identity; App Functionality and Account Management.
- Purchases — Purchase History: Apple subscription product/status and transaction identifiers; linked to identity if account linking is enabled; App Functionality.
- Usage Data — Product Interaction: declare only if production logging/analytics stores it; App Functionality/Analytics as applicable.
- Diagnostics — Crash Data and Performance Data: declare if Apple or another crash/diagnostics service is enabled.
- Do not declare payment-card data: Apple processes it and Parslia does not receive it.
- Data used for tracking: **No**, unless tracking or cross-company advertising is later added.

## Age Rating draft

- Recommended rating: **4+** if the shipping app contains no unrestricted web browser, gambling, sexual content, graphic violence, drug use, or user-to-user public sharing.
- User-generated content: select **Yes** only if customers can publish/share content to other users; private workspace uploads alone should be described accurately in review notes.
- Medical/treatment information: **No**. Food/allergen tools must clearly require professional verification and must not claim medical diagnosis.
- Final answers must be checked against the exact shipping build.

## Content Rights wording

Draft declaration: “Parslia displays content created and owned by Parslia, content used under appropriate licences or service-provider terms, and private content uploaded by customers. Our Terms require customers to have all rights and permissions necessary for their uploads and grant Parslia only the limited rights needed to provide the service. Parslia does not knowingly distribute unlicensed third-party content.”

**FINAL ACCOUNT-HOLDER ACTION:** select the Apple Content Rights answer only after confirming that every third-party recipe, photograph, video, data source, AI provider and integration in the submitted build is covered by a licence or applicable provider terms. Do not rely on the customer warranty for content supplied by Parslia itself.

## Build, media and review

- Generate `Parslia.xcodeproj` on a Mac with XcodeGen: `cd ios && xcodegen generate`.
- Set the Apple Developer Team and Automatic Signing; confirm the registered bundle ID.
- Add the approved 1024×1024 icon to `Assets.xcassets/AppIcon.appiconset` and verify it is opaque with no alpha.
- Run unit tests, StoreKit local tests, then sandbox on a physical device/TestFlight.
- Verify new purchase, trial, restore, cancellation, upgrade Starter→Pro, downgrade Pro→Starter, billing retry, expiry and repurchase.
- Upload an archive through Xcode, select the build in App Store Connect, export-compliance answer No (subject to final build review), and provide a working demo account.
- Screenshots: up to 10 per device class. Required current App Store Connect slots should include iPhone 6.7-inch and iPad 13-inch if iPad remains supported. Ensure screenshots show the actual shipping UI and no placeholder data.
- Submit subscriptions with the first app version. Confirm Paid Applications Agreement, banking and tax information are active.

## Feature entitlement decision

- Free/expired: account, legal, support and subscription screen only.
- Starter: dashboard, recipes, menu planner, allergens and kitchen logs.
- Pro: all Starter features plus AI Image, AI Voice Finder, stock, suppliers, rota, reports and labels.
- The native shell exposes this verified entitlement to the Hercules web app as `window.ParsliaNativeEntitlement` and emits `parslia-entitlement-changed`. The Hercules application must consume that event and enforce the same checks on every paid action; hiding navigation alone is not sufficient.

## Server hardening recommended before scale

The current implementation intentionally trusts only StoreKit 2 verified on-device transactions. For multi-device/web enforcement, add App Store Server API verification and App Store Server Notifications V2 using Apple’s signed-data verification library, persist original transaction ID, product, expiry, revocation and environment, and link purchases to authenticated accounts with an app-account token. Never accept a plan name or unsigned receipt from the client as authority.
