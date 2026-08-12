import SwiftUI

@main
struct ParsliaApp: App {
    @StateObject private var subscriptions = SubscriptionStore()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView().environmentObject(subscriptions)
                .task { await subscriptions.start() }
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active { Task { await subscriptions.refreshEntitlements() } }
                }
        }
    }
}
