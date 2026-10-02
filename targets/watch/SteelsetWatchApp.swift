import HealthKit
import SwiftUI
import WatchKit

/// Telefon spouští hodinky přes `startWatchApp(toHandle:)`. watchOS pak zavolá `handle(_:)`
/// s konfigurací tréninku, i když aplikace na hodinkách zrovna neběží (#15).
final class SteelsetWatchDelegate: NSObject, WKApplicationDelegate {
  func applicationDidFinishLaunching() {
    PhoneLink.shared.activate()
    // oprávnění k Health dřív, než telefon spustí první trénink, ať se dotaz neobjeví nad záznamem
    WorkoutManager.shared.requestAuthorization()
  }

  func handle(_ workoutConfiguration: HKWorkoutConfiguration) {
    WorkoutManager.shared.start(configuration: workoutConfiguration)
  }
}

@main
struct SteelsetWatchApp: App {
  @WKApplicationDelegateAdaptor(SteelsetWatchDelegate.self) var delegate
  @StateObject private var manager = WorkoutManager.shared

  var body: some Scene {
    WindowGroup {
      // NavigationStack ukáže nahoře název obrazovky, čas vpravo přidá watchOS sám
      NavigationStack {
        SteelsetRootView()
      }
      .environmentObject(manager)
    }
  }
}
