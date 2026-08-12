# Parslia iOS App Store submission checklist

Updated 12 August 2026. App Store Connect app ID: `6797909735`. Bundle ID: `app.parslia.kitchen`.

Production Hercules application URL: `https://parslia-kitchen-os-667132.onhercules.app/`.

## Subscription setup

- Subscription group reference name: **Parslia Plans** — configured, Apple group ID `22305600`
- Group display name: **Parslia Plans**
- Rank 1: Pro products; rank 2: Starter products (upgrades become effective immediately; downgrades follow Apple’s service rules).
- `app.parslia.kitchen.starter.monthly` — Starter Monthly — £29/month — Apple ID `6800864623`
- `app.parslia.kitchen.starter.annual` — Starter Annual — £290/year — Apple ID `6800863077`
- `app.parslia.kitchen.pro.monthly` — Pro Monthly — £59/month — Apple ID `6800861515`
- `app.parslia.kitchen.pro.annual` — Pro Annual — £590/year — Apple ID `6800859004`
- **Free Trial / 2 Weeks** is configured on every product for eligible new subscribers (12 August 2026–11 August 2036). Apple determines eligibility once per subscription group.
- A 16-day Billing Grace Period is enabled for all renewals in Production and Sandbox.
- Product icons, localisations, review notes and the paywall review screenshot are uploaded for all four subscriptions.
- Subscription review notes: “StoreKit 2 paywall is opened from View plans in the navigation bar. Use the supplied review account, select any plan, and use Apple sandbox purchase controls. Restore Purchases and Manage Subscription are on the same screen.”

## URLs and agreements

- Privacy Policy URL: `https://parslia.app/privacy.html`
- Support URL: `https://parslia.app/support.html`
- Terms URL: `https://parslia.app/terms.html`
- Subscription terms: `https://parslia.app/subscription-terms.html`
- Licence: Apple Standard EULA: `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`
- All four public pages are published and verified. The account holder should still have the legal drafts reviewed for the final business entity wording.

## App Privacy — published 12 August 2026

- Contact Info — Email Address: collected, linked to identity; App Functionality and Account Management.
- User Content — Photos/Videos, Other User Content: collected only when the customer uploads it, linked to identity; App Functionality.
- Identifiers — User ID: collected, linked to identity; App Functionality and Account Management.
- Purchases — Purchase History: Apple subscription product/status and transaction identifiers; linked to identity if account linking is enabled; App Functionality.
- Usage Data — Product Interaction: collected, linked to identity; Analytics.
- Diagnostics — Crash Data and Performance Data: collected, linked to identity; App Functionality.
- User Content — Audio Data and Customer Support: collected when the customer uses those features, linked to identity; App Functionality.
- Do not declare payment-card data: Apple processes it and Parslia does not receive it.
- Data used for tracking: **No**, unless tracking or cross-company advertising is later added.

## Age Rating — completed

- Saved rating: **4+** globally (regional exceptions shown by Apple: Brazil All, Korea 00+).
- User-generated content: select **Yes** only if customers can publish/share content to other users; private workspace uploads alone should be described accurately in review notes.
- Medical/treatment information: **No**. Food/allergen tools must clearly require professional verification and must not claim medical diagnosis.
- Re-check the answers if the shipping build adds public sharing, unrestricted browsing, medical claims or other rated content.

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

## App Store Connect status — completed 12 August 2026

- App subtitle saved: **Kitchen OS for chefs**.
- Apple Standard EULA selected; primary category Business and secondary category Food & Drink.
- Privacy Policy URL and Support URL point to the live Parslia pages.
- Five iPhone 6.5-inch screenshots are uploaded. Apple accepts up to 10; more are optional.
- The Xcode target is explicitly iPhone-only (`TARGETED_DEVICE_FAMILY = 1`), so iPad screenshots are not required for this release.
- Release mode changed to **Manual release** so approval does not publish the app unexpectedly.
- App Privacy answers are fully configured and published; data is declared as linked where applicable and not used for tracking.
- Content Rights is intentionally left for the account holder’s truthful legal confirmation.
- No signed build is uploaded yet, so the app and first subscriptions cannot yet be added to the review submission.

## Feature entitlement decision

- Free/expired: account, legal, support and subscription screen only.
- Starter: dashboard, recipes, menu planner, allergens and kitchen logs.
- Pro: all Starter features plus AI Image, AI Voice Finder, stock, suppliers, rota, reports and labels.
- The native shell exposes this verified entitlement to the Hercules web app as `window.ParsliaNativeEntitlement` and emits `parslia-entitlement-changed`. The Hercules application must consume that event and enforce the same checks on every paid action; hiding navigation alone is not sufficient.

## Server hardening recommended before scale

The current implementation intentionally trusts only StoreKit 2 verified on-device transactions. For multi-device/web enforcement, add App Store Server API verification and App Store Server Notifications V2 using Apple’s signed-data verification library, persist original transaction ID, product, expiry, revocation and environment, and link purchases to authenticated accounts with an app-account token. Never accept a plan name or unsigned receipt from the client as authority.
