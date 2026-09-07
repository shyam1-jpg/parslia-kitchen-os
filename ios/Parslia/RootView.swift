import SwiftUI
import StoreKit
import WebKit
import AuthenticationServices

struct RootView: View {
    @EnvironmentObject private var store: SubscriptionStore
    @State private var showPlans = false

    var body: some View {
        NavigationStack {
            ParsliaWebView(
                url: URL(string: "https://parslia-kitchen-os-667132.onhercules.app/")!,
                entitlement: store.tier,
                hasAIImageBooster: store.hasAIImageBooster,
                signedTransactions: store.signedTransactions,
                onAccountTokenChanged: { store.accountToken = $0 },
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

    static func authenticationCallbackURL(_ callback: URL) -> URL? {
        guard callback.scheme == "parslia", callback.host == "auth",
              callback.path == "/callback", callback.user == nil,
              callback.password == nil, callback.port == nil,
              var destination = URLComponents(url: callback, resolvingAgainstBaseURL: false) else { return nil }
        destination.scheme = "https"
        destination.host = appHost
        destination.path = "/auth/callback"
        return destination.url
    }

    let url: URL
    let entitlement: EntitlementTier
    let hasAIImageBooster: Bool
    let signedTransactions: [String]
    let onAccountTokenChanged: (UUID?) -> Void
    let onPurchaseRequested: () -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(
            entitlement: entitlement,
            hasAIImageBooster: hasAIImageBooster,
            signedTransactions: signedTransactions,
            onAccountTokenChanged: onAccountTokenChanged,
            onPurchaseRequested: onPurchaseRequested
        )
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        let initialEntitlement = Self.entitlementJavaScript(
            entitlement: entitlement,
            hasAIImageBooster: hasAIImageBooster,
            signedTransactions: signedTransactions
        ) ?? ""
        let purchaseBridge = WKUserScript(
            source: """
            if (window.location.hostname === "\(Self.appHost)") {
                window.ParsliaNativeStorefront = 'apple';
                \(initialEntitlement)
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
                // At document start the root element may not exist yet.
                const observeOffers = function() {
                    removeWebOnlyOffers();
                    new MutationObserver(removeWebOnlyOffers).observe(document.documentElement, {
                        childList: true,
                        subtree: true
                    });
                };
                window.parsliaSetAccountToken = function(token) {
                    window.webkit.messageHandlers.parsliaPurchase.postMessage({accountToken: token});
                };
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', observeOffers, { once: true });
                } else {
                    observeOffers();
                }
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
            hasAIImageBooster: hasAIImageBooster,
            signedTransactions: signedTransactions
        )
        context.coordinator.injectEntitlement(into: uiView)
    }

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "parsliaPurchase")
        uiView.navigationDelegate = nil
    }

    private static func entitlementJavaScript(
        entitlement: EntitlementTier,
        hasAIImageBooster: Bool,
        signedTransactions: [String]
    ) -> String? {
        let plan = switch entitlement {
        case .free: "free"
        case .starter: "starter"
        case .professional: "professional"
        case .business: "business"
        }
        let features = ParsliaFeature.allCases.filter { $0.isAvailable(with: entitlement) }.map(\.rawValue)
        let addOns = hasAIImageBooster ? ["aiImageBooster"] : []
        let data = try? JSONSerialization.data(withJSONObject: ["plan": plan, "features": features, "addOns": addOns, "signedTransactions": signedTransactions])
        guard let data, let json = String(data: data, encoding: .utf8) else { return nil }
        return "window.ParsliaNativeEntitlement=\(json);window.dispatchEvent(new CustomEvent('parslia-entitlement-changed',{detail:window.ParsliaNativeEntitlement}));"
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler, ASWebAuthenticationPresentationContextProviding {
        private var authenticationSession: ASWebAuthenticationSession?
        private weak var authenticationWindow: UIWindow?
        private var entitlement: EntitlementTier
        private var hasAIImageBooster: Bool
        private var signedTransactions: [String]
        private let onAccountTokenChanged: (UUID?) -> Void
        private let onPurchaseRequested: () -> Void

        init(
            entitlement: EntitlementTier,
            hasAIImageBooster: Bool,
            signedTransactions: [String],
            onAccountTokenChanged: @escaping (UUID?) -> Void,
            onPurchaseRequested: @escaping () -> Void
        ) {
            self.entitlement = entitlement
            self.hasAIImageBooster = hasAIImageBooster
            self.signedTransactions = signedTransactions
            self.onAccountTokenChanged = onAccountTokenChanged
            self.onPurchaseRequested = onPurchaseRequested
        }

        func update(entitlement: EntitlementTier, hasAIImageBooster: Bool, signedTransactions: [String]) {
            self.entitlement = entitlement
            self.hasAIImageBooster = hasAIImageBooster
            self.signedTransactions = signedTransactions
        }

        func injectEntitlement(into webView: WKWebView) {
            guard webView.url?.host == ParsliaWebView.appHost else { return }
            guard let script = ParsliaWebView.entitlementJavaScript(
                entitlement: entitlement,
                hasAIImageBooster: hasAIImageBooster,
                signedTransactions: signedTransactions
            ) else { return }
            webView.evaluateJavaScript(script)
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            injectEntitlement(into: webView)
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard navigationAction.targetFrame?.isMainFrame == true,
                  let url = navigationAction.request.url,
                  url.scheme == "https",
                  url.host == "01krrzfrr3vvk2szh1vb8knxwh.hercules-auth.com",
                  URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.contains(
                    URLQueryItem(name: "redirect_uri", value: "parslia://auth/callback")
                  ) == true else {
                decisionHandler(.allow)
                return
            }
            decisionHandler(.cancel)
            guard authenticationSession == nil else { return }
            authenticationWindow = webView.window
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: "parslia") { [weak self, weak webView] callback, _ in
                DispatchQueue.main.async {
                    self?.authenticationSession = nil
                    guard let webView else { return }
                    guard let callback,
                          let callbackURL = ParsliaWebView.authenticationCallbackURL(callback) else {
                        // Reset the web OIDC redirect-in-progress state after cancellation.
                        webView.reload()
                        return
                    }
                    // The web OIDC client retains its PKCE verifier and validates state.
                    webView.load(URLRequest(url: callbackURL))
                }
            }
            session.presentationContextProvider = self
            authenticationSession = session
            if !session.start() {
                authenticationSession = nil
                webView.reload()
            }
        }

        func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
            authenticationWindow ?? ASPresentationAnchor()
        }

        func userContentController(
            _ userContentController: WKUserContentController,
            didReceive message: WKScriptMessage
        ) {
            guard message.name == "parsliaPurchase",
                  message.frameInfo.isMainFrame,
                  message.frameInfo.securityOrigin.protocol == "https",
                  message.frameInfo.securityOrigin.host == ParsliaWebView.appHost else { return }
            if let body = message.body as? [String: Any], body.keys.contains("accountToken") {
                onAccountTokenChanged((body["accountToken"] as? String).flatMap(UUID.init(uuidString:)))
                return
            }
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
            PlanCard(product: product, introEligible: store.isIntroEligible(product), isEnabled: store.accountToken != nil) {
                Task { await store.purchase(product) }
            }
        }
        if store.coreProducts.isEmpty && !store.isLoading {
            unavailableProductsMessage("Plans are currently unavailable from the App Store.")
        }
        if store.accountToken == nil {
            Text("Sign in as your workspace manager to subscribe.")
                .font(.subheadline).foregroundStyle(.secondary)
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
                PlanCard(product: product, introEligible: false, isEnabled: store.tier != .free && store.accountToken != nil) {
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
