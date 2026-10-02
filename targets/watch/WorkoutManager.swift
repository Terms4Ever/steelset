import Combine
import Foundation
import HealthKit
import WatchKit

/// Fáze hodinkové aplikace. Obrazovky podle výběru zadavatele (#15, S38):
/// 1 trénink běží, 3 odpočinek, 4 ovládání, 5 bez tréninku, 6 souhrn.
enum SteelsetPhase {
  case idle
  case running
  case paused
  case summary
}

struct SteelsetSummary {
  let name: String
  /// Uložení do Health se povedlo; bez oprávnění k zápisu souhrn nesmí tvrdit opak.
  let saved: Bool
  let duration: TimeInterval
  let averageHeartRate: Double?
  let activeEnergy: Double?
}

/// Silový trénink na hodinkách: HKWorkoutSession s živým sběrem tepu a kalorií.
///
/// Spouští ho telefon přes `startWatchApp(toHandle:)`, ukončit ho jde z telefonu i z hodinek.
/// Po ukončení se trénink uloží do Apple Health jako Tradiční silový trénink, stejně jako to
/// dělá Cvičení od Applu. Telefon do Health dál nezapisuje (AGENTS, pravidlo 2).
final class WorkoutManager: NSObject, ObservableObject {
  static let shared = WorkoutManager()

  let healthStore = HKHealthStore()
  private var session: HKWorkoutSession?
  private var builder: HKLiveWorkoutBuilder?

  @Published var phase: SteelsetPhase = .idle
  @Published var heartRate: Double = 0
  @Published var averageHeartRate: Double = 0
  @Published var activeEnergy: Double = 0
  @Published var summary: SteelsetSummary?

  // stav z telefonu: název tréninku a odpočinek mezi sériemi
  @Published var workoutName: String = "Silový trénink"
  @Published var restEndAt: Date?
  @Published var restStartedAt: Date?
  @Published var restNext: String = ""
  private var phoneWorkoutId: String = ""
  private var sessionStartedAt: Date?

  private var restTimer: Timer?
  private var saveOnEnd = true
  private var notifyPhoneOnEnd = false
  private var isEnding = false

  // MARK: Oprávnění

  func requestAuthorization() {
    guard HKHealthStore.isHealthDataAvailable() else { return }
    let share: Set<HKSampleType> = [HKObjectType.workoutType()]
    var read: Set<HKObjectType> = [HKObjectType.workoutType()]
    if let hr = HKObjectType.quantityType(forIdentifier: .heartRate) { read.insert(hr) }
    if let kcal = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) { read.insert(kcal) }
    healthStore.requestAuthorization(toShare: share, read: read) { _, _ in }
  }

  // MARK: Start a konec

  /// Telefon spustil hodinky. Druhé spuštění téhož tréninku (telefon se restartoval) nic nezaloží.
  func start(configuration: HKWorkoutConfiguration) {
    if session != nil { return }
    // oprávnění se ptá už při spuštění aplikace; tady jen pro jistotu, kdyby ho uživatel odmítl
    requestAuthorization()
    do {
      let newSession = try HKWorkoutSession(healthStore: healthStore, configuration: configuration)
      let newBuilder = newSession.associatedWorkoutBuilder()
      newBuilder.dataSource = HKLiveWorkoutDataSource(healthStore: healthStore, workoutConfiguration: configuration)
      newSession.delegate = self
      newBuilder.delegate = self
      session = newSession
      builder = newBuilder
      saveOnEnd = true
      notifyPhoneOnEnd = false
      isEnding = false

      let startDate = Date()
      sessionStartedAt = startDate
      newSession.startActivity(with: startDate)
      newBuilder.beginCollection(withStart: startDate) { _, _ in }
      DispatchQueue.main.async {
        self.heartRate = 0
        self.averageHeartRate = 0
        self.activeEnergy = 0
        self.summary = nil
        self.phase = .running
      }
    } catch {
      session = nil
      builder = nil
    }
  }

  /// Ukončení. `save: false` trénink zahodí (v telefonu ho zahodili), `notifyPhone` ukončí i telefon.
  func end(save: Bool, notifyPhone: Bool) {
    // telefon posílá konec dvakrát (kontext i zprávu), počítá se první
    guard let session = session, !isEnding else { return }
    isEnding = true
    saveOnEnd = save
    notifyPhoneOnEnd = notifyPhone
    session.end()
  }

  func togglePause() {
    guard let session = session else { return }
    if phase == .paused {
      session.resume()
    } else {
      session.pause()
    }
  }

  func elapsedTime(at date: Date) -> TimeInterval {
    return builder?.elapsedTime(at: date) ?? 0
  }

  func dismissSummary() {
    summary = nil
    phase = .idle
  }

  // MARK: Stav z telefonu

  /// Kontext z telefonu: `active`, `workoutId`, `name`, `restEndAt` (ms, 0 = bez odpočinku), `next`,
  /// `discard` a `at` (ms, kdy ho telefon poslal).
  ///
  /// Po spuštění může dorazit starý kontext s koncem minulého tréninku. Konec proto platí jen,
  /// když ho telefon poslal až po startu záznamu na hodinkách.
  func applyPhoneState(_ state: [String: Any]) {
    let id = (state["workoutId"] as? String) ?? ""
    let active = (state["active"] as? Bool) ?? true

    if !active {
      // konec patří tomuhle tréninku, když nese jeho id, nebo ho telefon poslal až po startu
      // (s rezervou deseti sekund na rozdíl hodin mezi telefonem a hodinkami)
      let sentAt = (state["at"] as? Double) ?? 0
      let startedAt = (sessionStartedAt?.timeIntervalSince1970 ?? .greatestFiniteMagnitude) * 1000
      let sameWorkout = !id.isEmpty && id == phoneWorkoutId
      if session != nil && (sameWorkout || sentAt >= startedAt - 10_000) {
        let discard = (state["discard"] as? Bool) ?? false
        end(save: !discard, notifyPhone: false)
      }
      return
    }

    if !id.isEmpty { phoneWorkoutId = id }
    if let name = state["name"] as? String, !name.isEmpty { workoutName = name }
    restNext = (state["next"] as? String) ?? ""

    let restMs = (state["restEndAt"] as? Double) ?? 0
    if restMs > 0 {
      let end = Date(timeIntervalSince1970: restMs / 1000)
      // začátek odpočinku si hodinky pamatují samy, +15 s v telefonu posune jen konec
      if restStartedAt == nil { restStartedAt = Date() }
      restEndAt = end
      scheduleRestHaptic(at: end)
    } else {
      clearRest()
    }
  }

  private func scheduleRestHaptic(at date: Date) {
    restTimer?.invalidate()
    let delay = date.timeIntervalSinceNow
    guard delay > 0 else {
      clearRest()
      return
    }
    restTimer = Timer.scheduledTimer(withTimeInterval: delay, repeats: false) { [weak self] _ in
      // bez běžícího tréninku hodinky nebzučí (pozdní kontext po konci na hodinkách)
      if self?.session != nil { WKInterfaceDevice.current().play(.notification) }
      self?.clearRest()
    }
  }

  private func clearRest() {
    restTimer?.invalidate()
    restTimer = nil
    restEndAt = nil
    restStartedAt = nil
  }

  // MARK: Uložení po konci

  private func finish(at endDate: Date) {
    guard let builder = builder else { return }
    let save = saveOnEnd
    let notify = notifyPhoneOnEnd
    let name = workoutName
    let workoutId = phoneWorkoutId
    builder.endCollection(withEnd: endDate) { _, _ in
      if !save {
        builder.discardWorkout()
        DispatchQueue.main.async { self.reset(to: .idle) }
        return
      }
      builder.finishWorkout { workout, error in
        let duration = builder.elapsedTime(at: endDate)
        let saved = workout != nil && error == nil
        DispatchQueue.main.async {
          self.summary = SteelsetSummary(
            name: name,
            saved: saved,
            duration: duration,
            averageHeartRate: self.averageHeartRate > 0 ? self.averageHeartRate : nil,
            activeEnergy: self.activeEnergy > 0 ? self.activeEnergy : nil
          )
          self.reset(to: .summary)
          if notify { PhoneLink.shared.sendEnded(workoutId: workoutId) }
        }
      }
    }
  }

  private func reset(to newPhase: SteelsetPhase) {
    session = nil
    builder = nil
    sessionStartedAt = nil
    phoneWorkoutId = ""
    isEnding = false
    clearRest()
    phase = newPhase
  }
}

// MARK: - HKWorkoutSessionDelegate

extension WorkoutManager: HKWorkoutSessionDelegate {
  func workoutSession(
    _ workoutSession: HKWorkoutSession,
    didChangeTo toState: HKWorkoutSessionState,
    from fromState: HKWorkoutSessionState,
    date: Date
  ) {
    DispatchQueue.main.async {
      switch toState {
      case .running:
        self.phase = .running
      case .paused:
        self.phase = .paused
      case .ended:
        self.finish(at: date)
      default:
        break
      }
    }
  }

  func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
    DispatchQueue.main.async { self.reset(to: .idle) }
  }
}

// MARK: - HKLiveWorkoutBuilderDelegate

extension WorkoutManager: HKLiveWorkoutBuilderDelegate {
  func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

  func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>) {
    let bpm = HKUnit.count().unitDivided(by: HKUnit.minute())
    var latest: Double?
    var average: Double?
    var energy: Double?
    if let hrType = HKObjectType.quantityType(forIdentifier: .heartRate), collectedTypes.contains(hrType) {
      let stats = workoutBuilder.statistics(for: hrType)
      latest = stats?.mostRecentQuantity()?.doubleValue(for: bpm)
      average = stats?.averageQuantity()?.doubleValue(for: bpm)
    }
    if let kcalType = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned), collectedTypes.contains(kcalType) {
      energy = workoutBuilder.statistics(for: kcalType)?.sumQuantity()?.doubleValue(for: HKUnit.kilocalorie())
    }
    let newLatest = latest
    let newAverage = average
    let newEnergy = energy
    DispatchQueue.main.async {
      if let value = newLatest { self.heartRate = value }
      if let value = newAverage { self.averageHeartRate = value }
      if let value = newEnergy { self.activeEnergy = value }
    }
  }
}
