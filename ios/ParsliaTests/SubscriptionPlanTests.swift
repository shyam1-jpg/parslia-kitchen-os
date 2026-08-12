import XCTest
@testable import Parslia

final class SubscriptionPlanTests: XCTestCase {
    func testProductIDsAreUnique() {
        XCTAssertEqual(Set(SubscriptionPlan.allCases.map(\.rawValue)).count, 4)
    }
    func testTierMapping() {
        XCTAssertEqual(SubscriptionPlan.starterAnnual.tier, .starter)
        XCTAssertEqual(SubscriptionPlan.proMonthly.tier, .pro)
        XCTAssertGreaterThan(EntitlementTier.pro, .starter)
    }
    func testFeatureGating() {
        XCTAssertFalse(ParsliaFeature.recipes.isAvailable(with: .free))
        XCTAssertTrue(ParsliaFeature.recipes.isAvailable(with: .starter))
        XCTAssertFalse(ParsliaFeature.aiImage.isAvailable(with: .starter))
        XCTAssertTrue(ParsliaFeature.aiImage.isAvailable(with: .pro))
    }
}
