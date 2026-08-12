import XCTest
@testable import Parslia

final class SubscriptionPlanTests: XCTestCase {
    func testProductIDsAreUnique() {
        XCTAssertEqual(Set(SubscriptionPlan.allCases.map(\.rawValue)).count, 6)
    }
    func testTierMapping() {
        XCTAssertEqual(SubscriptionPlan.starterAnnual.tier, .starter)
        XCTAssertEqual(SubscriptionPlan.proMonthly.tier, .professional)
        XCTAssertEqual(SubscriptionPlan.businessMonthly.tier, .business)
        XCTAssertNil(SubscriptionPlan.aiImageBoosterMonthly.tier)
        XCTAssertGreaterThan(EntitlementTier.business, .professional)
    }
    func testFeatureGating() {
        XCTAssertFalse(ParsliaFeature.recipes.isAvailable(with: .free))
        XCTAssertTrue(ParsliaFeature.recipes.isAvailable(with: .starter))
        XCTAssertTrue(ParsliaFeature.aiImage.isAvailable(with: .starter))
        XCTAssertTrue(ParsliaFeature.stock.isAvailable(with: .starter))
        XCTAssertFalse(ParsliaFeature.reports.isAvailable(with: .starter))
        XCTAssertTrue(ParsliaFeature.reports.isAvailable(with: .professional))
        XCTAssertFalse(ParsliaFeature.multiLocation.isAvailable(with: .professional))
        XCTAssertTrue(ParsliaFeature.multiLocation.isAvailable(with: .business))
    }
}
