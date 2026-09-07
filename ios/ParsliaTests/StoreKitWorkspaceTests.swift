import XCTest
import StoreKit
import StoreKitTest
@testable import Parslia

@MainActor
final class StoreKitWorkspaceTests: XCTestCase {
    func testWorkspacePurchaseBoosterAndRefund() async throws {
        let configuration = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "Parslia", withExtension: "storekit"))
        let session = try SKTestSession(contentsOf: configuration)
        session.resetToDefaultState()
        session.timeRate = .realTime
        session.disableDialogs = true
        session.clearTransactions()
        defer { session.clearTransactions() }

        let token = UUID()
        let store = SubscriptionStore()
        store.setAccountToken(token)
        await store.loadProducts()
        XCTAssertEqual(Set(store.products.map(\.id)), Set(SubscriptionPlan.allCases.map(\.rawValue)))
        let purchase = try await session.buyProduct(identifier: SubscriptionPlan.proMonthly.rawValue,
                                                     options: [.appAccountToken(token)])
        _ = try await session.buyProduct(identifier: SubscriptionPlan.aiImageBoosterMonthly.rawValue,
                                          options: [.appAccountToken(token)])
        await store.refreshEntitlements()
        XCTAssertEqual(store.tier, .professional)
        XCTAssertTrue(store.hasAIImageBooster)
        XCTAssertEqual(store.signedTransactions.count, 2)

        store.setAccountToken(UUID())
        await store.refreshEntitlements()
        XCTAssertEqual(store.tier, .free)
        XCTAssertFalse(store.hasAIImageBooster)
        XCTAssertTrue(store.signedTransactions.isEmpty)

        store.setAccountToken(token)
        try session.refundTransaction(identifier: UInt(purchase.id))
        // StoreKit publishes the refund asynchronously after accepting the request.
        let deadline = Date().addingTimeInterval(30)
        repeat {
            await store.refreshEntitlements()
            if store.tier == .free { break }
            try await Task.sleep(for: .milliseconds(250))
        } while Date() < deadline
        XCTAssertEqual(store.tier, .free)
        XCTAssertFalse(store.hasAIImageBooster)
    }
}
