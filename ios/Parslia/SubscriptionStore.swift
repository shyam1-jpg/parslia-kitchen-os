import Foundation
import StoreKit

@MainActor
final class SubscriptionStore: ObservableObject {
    @Published private(set) var products: [Product] = []
    @Published private(set) var introEligibleProductIDs: Set<String> = []
    @Published private(set) var tier: EntitlementTier = .free
    @Published private(set) var hasAIImageBooster = false
    @Published private(set) var isLoading = false
    @Published var message: String?
    private var updates: Task<Void, Never>?

    func start() async {
        guard updates == nil else { return }
        updates = observeTransactions()
        await loadProducts()
        await refreshEntitlements()
    }

    deinit { updates?.cancel() }

    func loadProducts() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let loaded = try await Product.products(for: SubscriptionPlan.allCases.map(\.rawValue))
            products = loaded.sorted { lhs, rhs in
                let li = SubscriptionPlan.allCases.firstIndex { $0.rawValue == lhs.id } ?? 99
                let ri = SubscriptionPlan.allCases.firstIndex { $0.rawValue == rhs.id } ?? 99
                return li < ri
            }
            var eligible = Set<String>()
            for product in loaded {
                if let subscription = product.subscription,
                   await subscription.isEligibleForIntroOffer {
                    eligible.insert(product.id)
                }
            }
            introEligibleProductIDs = eligible
        } catch {
            products = []
            introEligibleProductIDs = []
            message = "Subscriptions could not be loaded from the App Store. Check your connection and try again."
        }
    }

    func isIntroEligible(_ product: Product) -> Bool {
        introEligibleProductIDs.contains(product.id)
    }

    var coreProducts: [Product] {
        products.filter { SubscriptionPlan(rawValue: $0.id)?.isAddOn == false }
    }

    var addOnProducts: [Product] {
        products.filter { SubscriptionPlan(rawValue: $0.id)?.isAddOn == true }
    }

    func purchase(_ product: Product) async {
        isLoading = true
        defer { isLoading = false }
        do {
            switch try await product.purchase() {
            case .success(let result):
                let transaction = try verified(result)
                await transaction.finish()
                await refreshEntitlements()
                message = "Your subscription is active."
            case .pending: message = "Purchase pending approval."
            case .userCancelled: break
            @unknown default: break
            }
        } catch { message = "Apple could not complete the purchase. Please try again." }
    }

    func restore() async {
        do {
            try await AppStore.sync()
            await refreshEntitlements()
            message = tier == .free && !hasAIImageBooster ? "No active subscription was found." : "Purchases restored."
        } catch { message = "Purchases could not be restored."
        }
    }

    func refreshEntitlements() async {
        var best: EntitlementTier = .free
        var booster = false
        for await result in Transaction.currentEntitlements {
            guard let transaction = try? verified(result),
                  transaction.revocationDate == nil,
                  transaction.expirationDate.map({ $0 > Date() }) ?? true,
                  let plan = SubscriptionPlan(rawValue: transaction.productID) else { continue }
            if let planTier = plan.tier {
                best = max(best, planTier)
            } else if plan == .aiImageBoosterMonthly {
                booster = true
            }
        }
        tier = best
        hasAIImageBooster = booster
    }

    private func observeTransactions() -> Task<Void, Never> {
        Task { [weak self] in
            for await result in Transaction.updates {
                guard let self else { return }
                if let transaction = try? self.verified(result) { await transaction.finish() }
                await self.refreshEntitlements()
            }
        }
    }

    nonisolated private func verified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .verified(let value): return value
        case .unverified: throw StoreError.failedVerification
        }
    }
}

enum StoreError: Error { case failedVerification }
