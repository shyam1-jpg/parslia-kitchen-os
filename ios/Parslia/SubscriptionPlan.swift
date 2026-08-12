import Foundation

enum SubscriptionPlan: String, CaseIterable, Sendable {
    case starterMonthly = "app.parslia.kitchen.starter.monthly"
    case starterAnnual = "app.parslia.kitchen.starter.annual"
    case proMonthly = "app.parslia.kitchen.pro.monthly"
    case proAnnual = "app.parslia.kitchen.pro.annual"
    case businessMonthly = "app.parslia.kitchen.business.monthly"
    case aiImageBoosterMonthly = "app.parslia.kitchen.ai.booster.monthly"

    var tier: EntitlementTier? {
        switch self {
        case .starterMonthly, .starterAnnual: .starter
        case .proMonthly, .proAnnual: .professional
        case .businessMonthly: .business
        case .aiImageBoosterMonthly: nil
        }
    }

    var isAddOn: Bool { self == .aiImageBoosterMonthly }
}

enum EntitlementTier: Int, Comparable, Sendable {
    case free = 0, starter = 1, professional = 2, business = 3
    static func < (lhs: Self, rhs: Self) -> Bool { lhs.rawValue < rhs.rawValue }
}

enum ParsliaFeature: String, CaseIterable, Sendable {
    case dashboard, recipes, menuPlanner, allergens, kitchenLogs
    case aiImage, stock, suppliers, rota, temperatureMonitoring, dataExport
    case aiVoice, recipeCosting, invoiceScanning, autoOrdering, pinTimeClock, reports, labels
    case multiLocation, centralManagement, locationComparison, advancedPermissions

    func isAvailable(with tier: EntitlementTier) -> Bool {
        switch self {
        case .dashboard, .recipes, .menuPlanner, .allergens, .kitchenLogs,
             .aiImage, .stock, .suppliers, .rota, .temperatureMonitoring, .dataExport:
            return tier >= .starter
        case .aiVoice, .recipeCosting, .invoiceScanning, .autoOrdering,
             .pinTimeClock, .reports, .labels:
            return tier >= .professional
        case .multiLocation, .centralManagement, .locationComparison, .advancedPermissions:
            return tier >= .business
        }
    }
}
