# Parslia iOS / StoreKit 2

This target is the native iPhone/iPad shell for Parslia Kitchen OS. It uses StoreKit 2 verified transactions as the on-device source of subscription truth.

## Generate and open on a Mac

1. Install Xcode 16 or later and XcodeGen.
2. Run `cd ios && xcodegen generate`.
3. Open `Parslia.xcodeproj`.
4. Select the Parslia target, choose the correct Apple Developer Team, and keep Automatic Signing enabled.
5. Confirm bundle ID `app.parslia.kitchen` and the `Parslia.storekit` scheme configuration.
6. Production Hercules URL: `https://parslia-kitchen-os-667132.onhercules.app/`.

## Local StoreKit tests

- Product loading: all four products appear with StoreKit-formatted prices.
- Trial: each product shows the two-week free introductory offer.
- Purchase: verified Starter and Pro transactions select their respective tier.
- Upgrade: Starter to Pro unlocks Pro immediately.
- Downgrade: Pro remains active until Apple changes the verified entitlement.
- Cancel/expire/revoke: paid access is removed after the verified entitlement ends.
- Billing retry/grace period: confirm access follows StoreKit's current entitlement sequence.
- Restore: erase local transaction state as appropriate, then Restore Purchases.
- Repurchase: after simulated expiry, renew and confirm access returns without an app restart.
- Transaction update: trigger a renewal/refund in StoreKit Transaction Manager while the app is open.

Run unit tests with `xcodebuild test -project Parslia.xcodeproj -scheme Parslia -destination 'platform=iOS Simulator,name=iPhone 16 Pro'` (adjust simulator name to an installed device).

## Security boundary

- Only `.verified` StoreKit transactions grant access.
- Revoked and expired transactions are ignored.
- The app refreshes on launch and listens continuously to `Transaction.updates`.
- The web application receives the tier for UI integration, but sensitive server operations must never trust the JavaScript value. The server should verify the original transaction with the App Store Server API/Notifications V2 before granting server-side access.
