import SwiftUI
import StoreKit
import WebKit

struct RootView: View {
    @EnvironmentObject private var store: SubscriptionStore
    @State private var showPlans = false

    var body: some View {
        NavigationStack {
            ParsliaWebView(url: URL(string: "https://parslia-kitchen-os-667132.onhercules.app/")!, entitlement: store.tier)
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
    let url: URL
    let entitlement: EntitlementTier
    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.allowsBackForwardNavigationGestures = true
        view.load(URLRequest(url: url))
        return view
    }
    func updateUIView(_ uiView: WKWebView, context: Context) {
        let plan = switch entitlement { case .free: "free"; case .starter: "starter"; case .pro: "pro" }
        let features = ParsliaFeature.allCases.filter { $0.isAvailable(with: entitlement) }.map(\.rawValue)
        let data = try? JSONSerialization.data(withJSONObject: ["plan": plan, "features": features])
        guard let data, let json = String(data: data, encoding: .utf8) else { return }
        uiView.evaluateJavaScript("window.ParsliaNativeEntitlement=\(json);window.dispatchEvent(new CustomEvent('parslia-entitlement-changed',{detail:window.ParsliaNativeEntitlement}));")
    }
}

struct PaywallView: View {
    @EnvironmentObject private var store: SubscriptionStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    Text("Choose your Parslia plan").font(.largeTitle.bold()).multilineTextAlignment(.center)
                    Text("Eligible new customers receive a 14-day free trial. After the trial, your selected plan renews automatically at the price and duration shown unless cancelled at least 24 hours before renewal.")
                        .font(.subheadline).foregroundStyle(.secondary).multilineTextAlignment(.center)
                    ForEach(store.products) { product in
                        PlanCard(product: product, introEligible: store.isIntroEligible(product)) { Task { await store.purchase(product) } }
                    }
                    if store.products.isEmpty && !store.isLoading {
                        Text("Plans are temporarily unavailable.").foregroundStyle(.secondary)
                    }
                    Button("Restore Purchases") { Task { await store.restore() } }
                    ManageSubscriptionsButton { Text("Manage Subscription") }
                    HStack {
                        Link("Privacy Policy", destination: URL(string: "https://parslia.app/privacy.html")!)
                        Text("•")
                        Link("Terms of Use", destination: URL(string: "https://parslia.app/terms.html")!)
                    }.font(.footnote)
                    Text("Payment is charged to your Apple Account after the free trial. Cancellation takes effect at the end of the current billing period. Features remain available while Apple reports a verified active entitlement.")
                        .font(.caption).foregroundStyle(.secondary)
                }.padding(22)
            }
            .navigationTitle("Subscriptions").navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            .alert("Parslia", isPresented: Binding(get: { store.message != nil }, set: { if !$0 { store.message = nil } })) {
                Button("OK") { store.message = nil }
            } message: { Text(store.message ?? "") }
            .overlay { if store.isLoading { ProgressView().controlSize(.large) } }
        }
    }
}

private struct PlanCard: View {
    let product: Product
    let introEligible: Bool
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
                .buttonStyle(.borderedProminent).frame(maxWidth: .infinity)
        }.padding().frame(maxWidth: .infinity, alignment: .leading)
            .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }
    private var periodText: String {
        guard let p = product.subscription?.subscriptionPeriod else { return "billing period" }
        return p.unit == .year ? "year" : "month"
    }
}
