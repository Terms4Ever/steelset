import ActivityKit
import SwiftUI
import WidgetKit

// Must match the struct in modules/live-activity/ios/LiveActivityModule.swift 1:1.
struct SteelsetWorkoutAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var doneSets: Int
    var totalSets: Int
    var restEndAt: Date?
  }

  var name: String
  var startedAt: Date
}

let steelsetAccent = Color(red: 0.0, green: 0.878, blue: 0.478) // #00E07A
let steelsetBg = Color(red: 0.039, green: 0.043, blue: 0.051) // #0A0B0D

@main
struct SteelsetWidgets: WidgetBundle {
  var body: some Widget {
    SteelsetWorkoutLiveActivity()
  }
}

struct SteelsetWorkoutLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: SteelsetWorkoutAttributes.self) { context in
      // Lock screen / banner
      LockScreenView(context: context)
        .padding(16)
        .activityBackgroundTint(steelsetBg.opacity(0.9))
        .activitySystemActionForegroundColor(steelsetAccent)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          HStack(spacing: 6) {
            Image(systemName: "checkmark.circle.fill")
              .foregroundColor(steelsetAccent)
            Text(context.attributes.name)
              .font(.headline)
              .lineLimit(1)
          }
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(timerInterval: context.attributes.startedAt...context.attributes.startedAt.addingTimeInterval(8 * 3600), countsDown: false)
            .font(.headline)
            .monospacedDigit()
            .frame(maxWidth: 60)
            .foregroundColor(steelsetAccent)
        }
        DynamicIslandExpandedRegion(.bottom) {
          if let rest = context.state.restEndAt, rest > Date() {
            HStack(spacing: 8) {
              Image(systemName: "timer")
                .foregroundColor(steelsetAccent)
              Text("Odpočinek")
                .font(.subheadline)
              Spacer()
              Text(timerInterval: Date()...rest, countsDown: true)
                .font(.title3.bold())
                .monospacedDigit()
                .frame(maxWidth: 64)
                .foregroundColor(steelsetAccent)
            }
          } else {
            HStack {
              Text("\(context.state.doneSets)/\(context.state.totalSets) sérií")
                .font(.subheadline)
                .foregroundColor(.secondary)
              Spacer()
              Text("probíhá")
                .font(.subheadline)
                .foregroundColor(steelsetAccent)
            }
          }
        }
      } compactLeading: {
        Image(systemName: "checkmark.circle.fill")
          .foregroundColor(steelsetAccent)
      } compactTrailing: {
        if let rest = context.state.restEndAt, rest > Date() {
          Text(timerInterval: Date()...rest, countsDown: true)
            .monospacedDigit()
            .frame(maxWidth: 44)
            .foregroundColor(steelsetAccent)
        } else {
          Text("\(context.state.doneSets)/\(context.state.totalSets)")
            .monospacedDigit()
            .foregroundColor(steelsetAccent)
        }
      } minimal: {
        Image(systemName: "checkmark.circle.fill")
          .foregroundColor(steelsetAccent)
      }
    }
  }
}

struct LockScreenView: View {
  let context: ActivityViewContext<SteelsetWorkoutAttributes>

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack {
        HStack(spacing: 8) {
          Image(systemName: "checkmark.circle.fill")
            .foregroundColor(steelsetAccent)
          Text(context.attributes.name)
            .font(.headline)
            .foregroundColor(.white)
            .lineLimit(1)
        }
        Spacer()
        Text(timerInterval: context.attributes.startedAt...context.attributes.startedAt.addingTimeInterval(8 * 3600), countsDown: false)
          .font(.headline)
          .monospacedDigit()
          .frame(maxWidth: 64)
          .foregroundColor(steelsetAccent)
      }
      if let rest = context.state.restEndAt, rest > Date() {
        HStack(spacing: 8) {
          Image(systemName: "timer")
            .foregroundColor(steelsetAccent)
          Text("Odpočinek")
            .font(.subheadline)
            .foregroundColor(.white.opacity(0.7))
          Spacer()
          Text(timerInterval: Date()...rest, countsDown: true)
            .font(.title3.bold())
            .monospacedDigit()
            .frame(maxWidth: 72)
            .foregroundColor(steelsetAccent)
        }
      } else {
        HStack {
          Text("\(context.state.doneSets)/\(context.state.totalSets) sérií")
            .font(.subheadline)
            .foregroundColor(.white.opacity(0.7))
          Spacer()
          Text("probíhá")
            .font(.subheadline.bold())
            .foregroundColor(steelsetAccent)
        }
      }
    }
  }
}
