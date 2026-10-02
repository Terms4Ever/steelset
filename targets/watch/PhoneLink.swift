import Foundation
import WatchConnectivity

/// Spojení s telefonem (#15). Telefon posílá kontext (běží trénink, odpočinek, další série),
/// hodinky posílají jen jednu věc: trénink byl ukončen na hodinkách.
final class PhoneLink: NSObject, WCSessionDelegate {
  static let shared = PhoneLink()

  func activate() {
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    session.delegate = self
    session.activate()
  }

  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    let context = session.receivedApplicationContext
    if !context.isEmpty { apply(context) }
  }

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    apply(applicationContext)
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    apply(message)
  }

  private func apply(_ state: [String: Any]) {
    DispatchQueue.main.async {
      WorkoutManager.shared.applyPhoneState(state)
    }
  }

  /// Trénink ukončený na hodinkách ukončí i telefon. Bez dosahu se zpráva doručí později.
  func sendEnded(workoutId: String) {
    guard WCSession.isSupported() else { return }
    let session = WCSession.default
    guard session.activationState == .activated else { return }
    let payload: [String: Any] = [
      "type": "ended",
      "workoutId": workoutId,
      "at": Date().timeIntervalSince1970 * 1000,
    ]
    if session.isReachable {
      session.sendMessage(payload, replyHandler: nil) { _ in
        session.transferUserInfo(payload)
      }
    } else {
      session.transferUserInfo(payload)
    }
  }
}
