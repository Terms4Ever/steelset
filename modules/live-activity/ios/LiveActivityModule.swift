import ActivityKit
import ExpoModulesCore

// Must match the struct in targets/widgets/index.swift 1:1 — ActivityKit pairs the app and the
// widget extension by the attributes type name and its Codable shape.
struct SteelsetWorkoutAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var doneSets: Int
    var totalSets: Int
    var restEndAt: Date?
  }

  var name: String
  var startedAt: Date
}

public class LiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SteelsetLiveActivity")

    Function("isSupported") { () -> Bool in
      if #available(iOS 16.2, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    Function("start") { (name: String, startedAtMs: Double, doneSets: Int, totalSets: Int) in
      if #available(iOS 16.2, *) {
        // never stack activities — end any leftover from a previous session first
        for activity in Activity<SteelsetWorkoutAttributes>.activities {
          Task { await activity.end(nil, dismissalPolicy: .immediate) }
        }
        let attributes = SteelsetWorkoutAttributes(
          name: name,
          startedAt: Date(timeIntervalSince1970: startedAtMs / 1000)
        )
        let state = SteelsetWorkoutAttributes.ContentState(doneSets: doneSets, totalSets: totalSets, restEndAt: nil)
        _ = try? Activity.request(
          attributes: attributes,
          content: .init(state: state, staleDate: nil)
        )
      }
    }

    Function("update") { (doneSets: Int, totalSets: Int, restEndAtMs: Double?) in
      if #available(iOS 16.2, *) {
        let state = SteelsetWorkoutAttributes.ContentState(
          doneSets: doneSets,
          totalSets: totalSets,
          restEndAt: restEndAtMs.map { Date(timeIntervalSince1970: $0 / 1000) }
        )
        for activity in Activity<SteelsetWorkoutAttributes>.activities {
          Task { await activity.update(.init(state: state, staleDate: nil)) }
        }
      }
    }

    Function("end") { () in
      if #available(iOS 16.2, *) {
        for activity in Activity<SteelsetWorkoutAttributes>.activities {
          Task { await activity.end(nil, dismissalPolicy: .immediate) }
        }
      }
    }
  }
}
