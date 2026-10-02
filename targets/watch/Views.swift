import SwiftUI

// Obrazovky podle náhledu schváleného zadavatelem (#15, S38): 1 trénink běží, 3 odpočinek,
// 4 ovládání, 5 bez tréninku, 6 souhrn. Výrazy jsou rozepsané na malé kusy: dlouhý výraz
// ve SwiftUI kompilátor nemusí stihnout otypovat a z Windows se to pozná až v buildu.

private let steelsetGreen = Color(red: 0.0, green: 0.878, blue: 0.478)
private let steelsetHeart = Color(red: 1.0, green: 0.216, blue: 0.373)
private let steelsetEnergy = Color(red: 1.0, green: 0.624, blue: 0.039)

/// „42:15", u delšího tréninku „1:02:15".
func steelsetClock(_ interval: TimeInterval) -> String {
  let total = max(0, Int(interval.rounded(.down)))
  let hours = total / 3600
  let minutes = (total % 3600) / 60
  let seconds = total % 60
  if hours > 0 {
    return String(format: "%d:%02d:%02d", hours, minutes, seconds)
  }
  return String(format: "%d:%02d", minutes, seconds)
}

func steelsetNumber(_ value: Double) -> String {
  return value > 0 ? String(Int(value.rounded())) : "--"
}

struct SteelsetRootView: View {
  @EnvironmentObject var manager: WorkoutManager

  var body: some View {
    switch manager.phase {
    case .idle:
      SteelsetIdleView()
    case .summary:
      SteelsetSummaryView()
    case .running, .paused:
      SteelsetWorkoutPager()
    }
  }
}

/// Běžící trénink: vlevo ovládání, vpravo míry nebo odpočinek. Otevírá se na mírách.
struct SteelsetWorkoutPager: View {
  @State private var page = 1

  var body: some View {
    TabView(selection: $page) {
      SteelsetControlsView().tag(0)
      SteelsetMetricsPage().tag(1)
    }
    .tabViewStyle(.page)
  }
}

struct SteelsetMetricsPage: View {
  @EnvironmentObject var manager: WorkoutManager

  var body: some View {
    TimelineView(.periodic(from: Date(), by: 1.0)) { context in
      if let restEnd = manager.restEndAt, restEnd > context.date {
        SteelsetRestView(now: context.date, restEnd: restEnd)
      } else {
        SteelsetRunningView(now: context.date)
      }
    }
  }
}

// MARK: 1 - trénink běží

struct SteelsetRunningView: View {
  @EnvironmentObject var manager: WorkoutManager
  let now: Date

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(steelsetClock(manager.elapsedTime(at: now)))
        .font(.system(size: 40, weight: .bold, design: .rounded))
        .monospacedDigit()
        .foregroundColor(manager.phase == .paused ? .yellow : steelsetGreen)
      SteelsetMetricRow(symbol: "heart.fill", value: steelsetNumber(manager.heartRate), unit: "BPM", color: steelsetHeart)
      SteelsetMetricRow(symbol: nil, value: steelsetNumber(manager.activeEnergy), unit: "KCAL", color: steelsetEnergy)
      SteelsetMetricRow(symbol: nil, value: "Ø " + steelsetNumber(manager.averageHeartRate), unit: "BPM", color: .gray)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .navigationTitle(manager.phase == .paused ? "Pauza" : "Silový trénink")
  }
}

struct SteelsetMetricRow: View {
  let symbol: String?
  let value: String
  let unit: String
  let color: Color

  var body: some View {
    HStack(alignment: .firstTextBaseline, spacing: 4) {
      if let symbol = symbol {
        Image(systemName: symbol).foregroundColor(color)
      }
      Text(value)
        .font(.system(size: 26, weight: .semibold, design: .rounded))
        .monospacedDigit()
      Text(unit)
        .font(.system(size: 13, weight: .bold))
        .foregroundColor(color)
    }
  }
}

// MARK: 3 - odpočinek

struct SteelsetRestView: View {
  @EnvironmentObject var manager: WorkoutManager
  let now: Date
  let restEnd: Date

  private var remaining: TimeInterval {
    return max(0, restEnd.timeIntervalSince(now))
  }

  private var progress: Double {
    let start = manager.restStartedAt ?? now
    let total = restEnd.timeIntervalSince(start)
    if total <= 0 { return 0 }
    return min(1, max(0, remaining / total))
  }

  var body: some View {
    VStack(spacing: 4) {
      ZStack {
        Circle()
          .stroke(steelsetGreen.opacity(0.25), lineWidth: 9)
        Circle()
          .trim(from: 0, to: CGFloat(progress))
          .stroke(steelsetGreen, style: StrokeStyle(lineWidth: 9, lineCap: .round))
          .rotationEffect(.degrees(-90))
        Text(steelsetClock(remaining.rounded(.up)))
          .font(.system(size: 30, weight: .bold, design: .rounded))
          .monospacedDigit()
      }
      .frame(width: 110, height: 110)
      if !manager.restNext.isEmpty {
        Text("Další: " + manager.restNext)
          .font(.system(size: 13, weight: .semibold))
          .foregroundColor(.gray)
          .lineLimit(1)
      }
      HStack(spacing: 4) {
        Image(systemName: "heart.fill").foregroundColor(steelsetHeart)
        Text(steelsetNumber(manager.heartRate) + " BPM")
          .font(.system(size: 15, weight: .semibold))
          .monospacedDigit()
      }
    }
    .navigationTitle("Odpočinek")
  }
}

// MARK: 4 - ovládání

struct SteelsetControlsView: View {
  @EnvironmentObject var manager: WorkoutManager

  var body: some View {
    HStack(spacing: 12) {
      SteelsetControlButton(
        symbol: "xmark",
        title: "Ukončit",
        color: .red
      ) {
        manager.end(save: true, notifyPhone: true)
      }
      SteelsetControlButton(
        symbol: manager.phase == .paused ? "play.fill" : "pause.fill",
        title: manager.phase == .paused ? "Pokračovat" : "Pauza",
        color: .yellow
      ) {
        manager.togglePause()
      }
    }
    .navigationTitle(manager.workoutName)
  }
}

struct SteelsetControlButton: View {
  let symbol: String
  let title: String
  let color: Color
  let action: () -> Void

  var body: some View {
    VStack(spacing: 6) {
      Button(action: action) {
        Image(systemName: symbol)
          .font(.system(size: 24, weight: .bold))
          .foregroundColor(color)
          .frame(width: 60, height: 60)
          .background(Circle().fill(color.opacity(0.22)))
      }
      .buttonStyle(.plain)
      Text(title)
        .font(.system(size: 13, weight: .semibold))
    }
  }
}

// MARK: 5 - bez tréninku

struct SteelsetIdleView: View {
  @EnvironmentObject var manager: WorkoutManager

  var body: some View {
    VStack(spacing: 8) {
      Image("SteelsetLogo")
        .resizable()
        .frame(width: 54, height: 54)
        .clipShape(RoundedRectangle(cornerRadius: 13))
      Text("Steelset")
        .font(.system(size: 17, weight: .bold))
      Text("Trénink spusť v telefonu, hodinky se zapnou samy.")
        .font(.system(size: 13, weight: .semibold))
        .foregroundColor(.gray)
        .multilineTextAlignment(.center)
    }
    .onAppear { manager.requestAuthorization() }
  }
}

// MARK: 6 - souhrn

struct SteelsetSummaryView: View {
  @EnvironmentObject var manager: WorkoutManager

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 2) {
        if let summary = manager.summary {
          Text(summary.name)
            .font(.system(size: 15, weight: .bold))
          Text(steelsetClock(summary.duration))
            .font(.system(size: 26, weight: .semibold, design: .rounded))
            .monospacedDigit()
            .foregroundColor(steelsetGreen)
          SteelsetMetricRow(symbol: "heart.fill", value: steelsetNumber(summary.averageHeartRate ?? 0), unit: "Ø BPM", color: steelsetHeart)
          SteelsetMetricRow(symbol: nil, value: steelsetNumber(summary.activeEnergy ?? 0), unit: "KCAL", color: steelsetEnergy)
          Text(summary.saved ? "Uloženo do Zdraví" : "Do Zdraví se uložit nepodařilo")
            .font(.system(size: 13, weight: .semibold))
            .foregroundColor(summary.saved ? Color.gray : Color.red)
            .padding(.top, 4)
        }
        Button("Hotovo") { manager.dismissSummary() }
          .padding(.top, 8)
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .navigationTitle("Hotovo")
  }
}
