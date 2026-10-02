import ExpoModulesCore
import HealthKit
import WatchConnectivity

/// Spojení telefonu s hodinkovou aplikací Steelset (#15).
///
/// Telefon hodinky spustí (`startWatchApp`), posílá jim kontext tréninku (odpočinek, další série,
/// konec) a od hodinek přijme jedinou zprávu: trénink byl ukončen na hodinkách.
final class SteelsetWatchLink: NSObject, WCSessionDelegate {
  static let shared = SteelsetWatchLink()

  /// Ukončení z hodinek, které přišlo dřív, než si ho JS vyzvedl (aplikace se teprve spouštěla).
  var pendingEnded: String?
  var onEnded: ((String) -> Void)?

  func activate() {
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    if session.delegate == nil { session.delegate = self }
    if session.activationState != .activated { session.activate() }
  }

  var canReachApp: Bool {
    guard WCSession.isSupported() else { return false }
    let session = WCSession.default
    return session.activationState == .activated && session.isPaired && session.isWatchAppInstalled
  }

  func push(_ state: [String: Any]) {
    guard canReachApp else { return }
    let session = WCSession.default
    try? session.updateApplicationContext(state)
    if session.isReachable {
      session.sendMessage(state, replyHandler: nil, errorHandler: nil)
    }
  }

  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}

  func sessionDidBecomeInactive(_ session: WCSession) {}

  func sessionDidDeactivate(_ session: WCSession) {
    // přepnutí na jiné hodinky: spojení se musí znovu aktivovat
    session.activate()
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    handle(message)
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
    handle(userInfo)
  }

  private func handle(_ payload: [String: Any]) {
    guard (payload["type"] as? String) == "ended" else { return }
    let workoutId = (payload["workoutId"] as? String) ?? ""
    DispatchQueue.main.async {
      if let onEnded = self.onEnded {
        onEnded(workoutId)
      } else {
        self.pendingEnded = workoutId
      }
    }
  }
}

public class WatchBridgeModule: Module {
  private let healthStore = HKHealthStore()

  public func definition() -> ModuleDefinition {
    Name("SteelsetWatchBridge")

    Events("onWatchEnded")

    OnCreate {
      SteelsetWatchLink.shared.activate()
    }

    OnStartObserving {
      SteelsetWatchLink.shared.onEnded = { [weak self] workoutId in
        self?.sendEvent("onWatchEnded", ["workoutId": workoutId])
      }
    }

    OnStopObserving {
      SteelsetWatchLink.shared.onEnded = nil
    }

    Function("isWatchAppInstalled") { () -> Bool in
      SteelsetWatchLink.shared.activate()
      return SteelsetWatchLink.shared.canReachApp
    }

    /// Probudí hodinkovou aplikaci a předá jí silový trénink. Bez spárovaných hodinek vrátí false.
    AsyncFunction("startWorkout") { (promise: Promise) in
      SteelsetWatchLink.shared.activate()
      guard HKHealthStore.isHealthDataAvailable(), SteelsetWatchLink.shared.canReachApp else {
        promise.resolve(false)
        return
      }
      let configuration = HKWorkoutConfiguration()
      configuration.activityType = .traditionalStrengthTraining
      configuration.locationType = .indoor
      self.healthStore.startWatchApp(with: configuration) { success, _ in
        promise.resolve(success)
      }
    }

    Function("pushState") { (state: [String: Any]) in
      SteelsetWatchLink.shared.activate()
      SteelsetWatchLink.shared.push(state)
    }

    Function("takePendingEnded") { () -> String? in
      let workoutId = SteelsetWatchLink.shared.pendingEnded
      SteelsetWatchLink.shared.pendingEnded = nil
      return workoutId
    }
  }
}
