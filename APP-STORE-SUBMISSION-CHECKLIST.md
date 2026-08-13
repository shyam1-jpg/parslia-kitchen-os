# Parslia iOS App Store submission checklist

Updated 13 August 2026. App Store Connect app ID: `6797909735`. Bundle ID: `app.parslia.kitchen`.

Production Hercules application URL: `https://parslia-kitchen-os-667132.onhercules.app/`.

## Subscription setup

- Subscription group reference name: **Parslia Plans** — configured, Apple group ID `22305600`
- Group display name: **Parslia Plans**
- Subscription order verified: rank 1 Business; rank 2 Professional; rank 3 Starter. Upgrades become effective immediately; downgrades follow Apple’s service rules.
- `app.parslia.kitchen.starter.monthly` — Starter Monthly — £39/month — Apple ID `6800864623`
- `app.parslia.kitchen.starter.annual` — Starter Annual — £390/year — Apple ID `6800863077`
- `app.parslia.kitchen.pro.monthly` — Professional Monthly — £79/month — Apple ID `6800861515`
- `app.parslia.kitchen.pro.annual` — Professional Annual — £790/year — Apple ID `6800859004`
- `app.parslia.kitchen.business.monthly` — Business Monthly — £149/month — Apple ID `6800918531`
- Add-on subscription group: **Parslia Add-ons** — configured, Apple group ID `22305966`, so the booster can coexist with one product from Parslia Plans.
- `app.parslia.kitchen.ai.booster.monthly` — AI Image Booster — £9.99/month — Apple ID `6800927927`; availability, price, localization, group display name and review assets verified. State: **Ready to Submit**.
- **Free Trial / 2 Weeks** applies to every core-plan product for new eligible subscribers (12 August 2026–11 August 2036). Apple determines eligibility once per core subscription group. The booster has no separate trial.
- A 16-day Billing Grace Period is enabled for all renewals in Production and Sandbox.
- All six products have complete localisations, review notes, promotional icons and review screenshots. Apple reports all six products as **Ready to Submit**. Starter Annual review wording is corrected to £390/year.
- Subscription review notes: “StoreKit 2 paywall is opened from View plans in the navigation bar. Use the supplied review account, select any plan, and use Apple sandbox purchase controls. Restore Purchases and Manage Subscription are on the same screen.”

## URLs and agreements

- Privacy Policy URL: `https://parslia.app/privacy.html`
- Support URL: `https://parslia.app/support.html`
- Terms URL: `https://parslia.app/terms.html`
- Subscription terms: `https://parslia.app/subscription-terms.html`
- Licence: Apple Standard EULA: `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`
- All four public pages are published and verified. The account holder should still have the legal drafts reviewed for the final business entity wording.
- Free Apps Agreement: **Active**, 3 August 2026–4 August 2027.
- Paid Apps Agreement: **New**. Apple requires the account holder to update the legal entity, sign the agreement, complete banking and submit the required tax forms before paid subscriptions can be sold.
- EU Digital Services Act trader status: **not completed**. The account holder must complete Apple’s compliance flow truthfully.

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

- No owned Mac is required: `.github/workflows/ios-cloud-build.yml` runs the build on GitHub's macOS runner. The eight required Apple signing and App Store Connect secrets are configured in GitHub. Never commit or paste the `.p8` private key into a support conversation.
- Generate `Parslia.xcodeproj` on a Mac with XcodeGen: `cd ios && xcodegen generate`.
- Set the Apple Developer Team and Automatic Signing; confirm the registered bundle ID.
- Add the approved 1024×1024 icon to `Assets.xcassets/AppIcon.appiconset` and verify it is opaque with no alpha.
- Run unit tests, StoreKit local tests, then sandbox on a physical device/TestFlight.
- Verify new purchase, trial, restore, cancellation, upgrades and downgrades across Starter/Professional/Business, independent booster renewal, billing retry, expiry and repurchase.
- Build 11 was generated from merged commit `305d9e3`, passed the Xcode 26.3 cloud test suite, was signed with the App Store profile, uploaded successfully, validated by Apple and attached to version 1.0. Apple build ID: `d3bc8ee4-fdbf-4456-a54c-1138d61ea747`.
- Five opaque 1242×2688 iPhone screenshots are uploaded and Apple reports each asset as **Complete**. The rejected transparent iPhone and iPad copies were removed. The iPhone-only target does not require iPad screenshots.
- Submit subscriptions with the first app version. Confirm Paid Applications Agreement, banking and tax information are active.

## App Store Connect status — verified 13 August 2026

- App subtitle saved: **Kitchen OS for chefs**.
- Apple Standard EULA selected; primary category Business and secondary category Food & Drink.
- Privacy Policy URL and Support URL point to the live Parslia pages.
- Five iPhone 6.5-inch screenshots are uploaded, opaque and accepted by Apple’s media processor. Apple accepts up to 10; more are optional.
- The Xcode target is explicitly iPhone-only (`TARGETED_DEVICE_FAMILY = 1`), so iPad screenshots are not required for this release.
- Release mode changed to **Manual release** so approval does not publish the app unexpectedly.
- App Privacy answers are fully configured and published; data is declared as linked where applicable and not used for tracking.
- Content Rights is intentionally left for the account holder’s truthful legal confirmation.
- Build 11 is uploaded, **Valid**, App Store eligible and attached to version 1.0. It contains the final native entitlement-navigation and purchase-paywall bridge fixes.
- Paid Apps Agreement, legal-entity update, banking, tax, DSA trader status and Content Rights are the remaining account-holder actions.

## Feature entitlement decision

- Free/expired: account, legal, support and subscription screen only.
- Starter: one location, up to 10 staff, 30 AI recipe images/month, recipes, menus, allergens, stock, suppliers, compliance logs, rota/time clock, temperature integration and logging, backup and export.
- Professional: all Starter features, up to 30 staff and 100 AI recipe images/month, plus advanced costing, invoice scanning, auto-ordering, PIN/time-clock controls, advanced compliance/labels, reports and priority support.
- Business: all Professional features, up to three locations, up to 100 staff and 250 AI recipe images/month, plus central multi-location control, comparisons, permissions and exportable group reports.
- AI Image Booster: adds 50 AI recipe images/month to an active core plan; it never grants core access on its own.
- The native shell exposes this verified entitlement to the Hercules web app as `window.ParsliaNativeEntitlement` and emits `parslia-entitlement-changed`. The published Hercules application consumes both values for route/feature gating. The iOS shell reapplies the entitlement after every completed page navigation and routes website purchase requests to the native StoreKit paywall.

## Server hardening recommended before scale

The current implementation intentionally trusts only StoreKit 2 verified on-device transactions. For multi-device/web enforcement, add App Store Server API verification and App Store Server Notifications V2 using Apple’s signed-data verification library, persist original transaction ID, product, expiry, revocation and environment, and link purchases to authenticated accounts with an app-account token. Never accept a plan name or unsigned receipt from the client as authority.
