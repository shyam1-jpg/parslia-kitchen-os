import SwiftUI
import StoreKit
import WebKit

struct RootView: View {
    @EnvironmentObject private var store: SubscriptionStore
    @State private var showPlans = false

    var body: some View {
        NavigationStack {
            ParsliaWebView(
                url: URL(string: "https://parslia-kitchen-os-667132.onhercules.app/")!,
                entitlement: store.tier,
                hasAIImageBooster: store.hasAIImageBooster,
                onPurchaseRequested: { showPlans = true }
            )
                .navigationTitle("Parslia")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button(store.tier == .free ? "View plans" : "Manage plan") { showPlans = true }
                    }
                }
                .sheet(isPresented: $showPlans) { PaywallView() }
        }
    }
}

struct ParsliaWebView: UIViewRepresentable {
    private static let appHost = "parslia-kitchen-os-667132.onhercules.app"

    let url: URL
    let entitlement: EntitlementTier
    let hasAIImageBooster: Bool
    let onPurchaseRequested: () -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(
            entitlement: entitlement,
            hasAIImageBooster: hasAIImageBooster,
            onPurchaseRequested: onPurchaseRequested
        )
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        let purchaseBridge = WKUserScript(
            source: """
            if (window.location.hostname === "\(Self.appHost)") {
                window.ParsliaNativeStorefront = 'apple';
                window.parsliaNativePurchase = function() {
                    window.webkit.messageHandlers.parsliaPurchase.postMessage({});
                };

                // The iOS storefront must only show digital offers available through StoreKit.
                const blockedOffer = /(?:contact\\s+sales|enterprise\\s+plans?|business\\s+annual)/i;
                const removeWebOnlyOffers = function() {
                    document.querySelectorAll('a, button, [role="button"]').forEach(function(element) {
                        if (blockedOffer.test((element.textContent || '').trim())) {
                            element.hidden = true;
                            element.setAttribute('aria-hidden', 'true');
                        }
                    });
                };
                new MutationObserver(removeWebOnlyOffers).observe(document.documentElement, {
                    childList: true,
                    subtree: true
                });
                document.addEventListener('DOMContentLoaded', removeWebOnlyOffers);
            }
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        configuration.userContentController.addUserScript(purchaseBridge)
        configuration.userContentController.add(context.coordinator, name: "parsliaPurchase")
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.navigationDelegate = context.coordinator
        view.allowsBackForwardNavigationGestures = true
        view.load(URLRequest(url: url))
        return view
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        context.coordinator.update(
            entitlement: entitlement,
            hasAIImageBooster: hasAIImageBooster
        )
        context.coordinator.injectEntitlement(into: uiView)
    }

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "parsliaPurchase")
        uiView.navigationDelegate = nil
    }

    private static func entitlementJavaScript(
        entitlement: EntitlementTier,
        hasAIImageBooster: Bool
    ) -> String? {
        let plan = switch entitlement {
        case .free: "free"
        case .starter: "starter"
        case .professional: "professional"
        case .business: "business"
        }
        let features = ParsliaFeature.allCases.filter { $0.isAvailable(with: entitlement) }.map(\.rawValue)
        let addOns = hasAIImageBooster ? ["aiImageBooster"] : []
        let data = try? JSONSerialization.data(withJSONObject: ["plan": plan, "features": features, "addOns": addOns])
        guard let data, let json = String(data: data, encoding: .utf8) else { return nil }
        return "window.ParsliaNativeEntitlement=\(json);window.dispatchEvent(new CustomEvent('parslia-entitlement-changed',{detail:window.ParsliaNativeEntitlement}));"
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        private var entitlement: EntitlementTier
        private var hasAIImageBooster: Bool
        private let onPurchaseRequested: () -> Void

        init(
            entitlement: EntitlementTier,
            hasAIImageBooster: Bool,
            onPurchaseRequested: @escaping () -> Void
        ) {
            self.entitlement = entitlement
            self.hasAIImageBooster = hasAIImageBooster
            self.onPurchaseRequested = onPurchaseRequested
        }

        func update(entitlement: EntitlementTier, hasAIImageBooster: Bool) {
            self.entitlement = entitlement
            self.hasAIImageBooster = hasAIImageBooster
        }

        func injectEntitlement(into webView: WKWebView) {
            guard webView.url?.host == ParsliaWebView.appHost else { return }
            guard let script = ParsliaWebView.entitlementJavaScript(
                entitlement: entitlement,
                hasAIImageBooster: hasAIImageBooster
            ) else { return }
            webView.evaluateJavaScript(script)
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            injectEntitlement(into: webView)
        }

        func userContentController(
            _ userContentController: WKUserContentController,
            didReceive message: WKScriptMessage
        ) {
            guard message.name == "parsliaPurchase" else { return }
            onPurchaseRequested()
        }
    }
}

struct PaywallView: View {
    @EnvironmentObject private var store: SubscriptionStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                paywallContent
            }
            .navigationTitle("Subscriptions").navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            .alert("Parslia", isPresented: messageIsPresented) {
                Button("OK") { store.message = nil }
            } message: { Text(store.message ?? "") }
            .overlay { if store.isLoading { ProgressView().controlSize(.large) } }
        }
    }

    private var paywallContent: some View {
        VStack(spacing: 18) {
            paywallHeader
            corePlans
            addOns
            accountActions
            legalLinks
        }
        .padding(22)
    }

    private var paywallHeader: some View {
        Group {
            Text("Choose your Parslia plan")
                .font(.largeTitle.bold())
                .multilineTextAlignment(.center)
            Text("Eligible new customers receive a 14-day free trial. After the trial, your selected plan renews automatically at the price and duration shown unless cancelled at least 24 hours before renewal.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
    }

    @ViewBuilder private var corePlans: some View {
        ForEach(store.coreProducts) { product in
            PlanCard(product: product, introEligible: store.isIntroEligible(product)) {
                Task { await store.purchase(product) }
            }
        }
        if store.coreProducts.isEmpty && !store.isLoading {
            unavailableProductsMessage("Plans are currently unavailable from the App Store.")
        }
    }

    @ViewBuilder private var addOns: some View {
        Divider()
        Text("Add-ons")
            .font(.title2.bold())
            .frame(maxWidth: .infinity, alignment: .leading)
        Text("AI Image Booster adds 50 AI recipe images to an active paid plan each month.")
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
        if !store.addOnProducts.isEmpty {
            ForEach(store.addOnProducts) { product in
                PlanCard(product: product, introEligible: false, isEnabled: store.tier != .free) {
                    Task { await store.purchase(product) }
                }
            }
            if store.tier == .free {
                Text("Choose a Parslia plan before adding the booster.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        } else if !store.isLoading {
            unavailableProductsMessage("AI Image Booster is currently unavailable from the App Store.")
        }
    }

    private func unavailableProductsMessage(_ text: String) -> some View {
        VStack(spacing: 10) {
            Text(text)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button("Try Again") { Task { await store.loadProducts() } }
                .buttonStyle(.bordered)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }

    private var accountActions: some View {
        VStack(spacing: 14) {
            Button("Restore Purchases") { Task { await store.restore() } }
            Link("Manage Subscription", destination: URL(string: "https://apps.apple.com/account/subscriptions")!)
        }
    }

    private var legalLinks: some View {
        VStack(spacing: 12) {
            HStack {
                Link("Privacy Policy", destination: URL(string: "https://parslia.app/privacy.html")!)
                Text("•")
                Link("Terms of Use", destination: URL(string: "https://parslia.app/terms.html")!)
            }
            .font(.footnote)
            Text("Payment is charged to your Apple Account after the free trial. Cancellation takes effect at the end of the current billing period. Features remain available while Apple reports a verified active entitlement.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private var messageIsPresented: Binding<Bool> {
        Binding(
            get: { store.message != nil },
            set: { if !$0 { store.message = nil } }
        )
    }
}

private struct PlanCard: View {
    let product: Product
    let introEligible: Bool
    var isEnabled = true
    let buy: () -> Void
    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            Text(product.displayName).font(.title3.bold())
            Text(product.description).foregroundStyle(.secondary)
            Text(introEligible
                 ? "14 days free, then \(product.displayPrice) per \(periodText). Auto-renews until cancelled."
                 : "\(product.displayPrice) per \(periodText). Auto-renews until cancelled.")
                .font(.subheadline)
            Button(introEligible ? "Start 14-Day Free Trial" : "Subscribe", action: buy)
                .buttonStyle(.borderedProminent).frame(maxWidth: .infinity).disabled(!isEnabled)
        }.padding().frame(maxWidth: .infinity, alignment: .leading)
            .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }
    private var periodText: String {
        guard let p = product.subscription?.subscriptionPeriod else { return "billing period" }
        return p.unit == .year ? "year" : "month"
    }
}
