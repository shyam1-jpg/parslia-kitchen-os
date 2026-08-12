import Foundation

enum SubscriptionPlan: String, CaseIterable, Sendable {
    case starterMonthly = "app.parslia.kitchen.starter.monthly"
    case starterAnnual = "app.parslia.kitchen.starter.annual"
    case proMonthly = "app.parslia.kitchen.pro.monthly"
    case proAnnual = "app.parslia.kitchen.pro.annual"

    var tier: EntitlementTier {
        switch self {
        case .starterMonthly, .starterAnnual: .starter
        case .proMonthly, .proAnnual: .pro
        }
    }
}

enum EntitlementTier: Int, Comparable, Sendable {
    case free = 0, starter = 1, pro = 2
    static func < (lhs: Self, rhs: Self) -> Bool { lhs.rawValue < rhs.rawValue }
}

enum ParsliaFeature: String, CaseIterable, Sendable {
    case dashboard, recipes, menuPlanner, allergens, kitchenLogs
    case aiImage, aiVoice, stock, suppliers, rota, reports, labels

    func isAvailable(with tier: EntitlementTier) -> Bool {
        switch self {
        case .dashboard, .recipes, .menuPlanner, .allergens, .kitchenLogs:
            return tier >= .starter
        case .aiImage, .aiVoice, .stock, .suppliers, .rota, .reports, .labels:
            return tier >= .pro
        }
    }
}
