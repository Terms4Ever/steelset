import SwiftUI
import WidgetKit

// Widgety na plochu a zamčenou obrazovku (#16). Data jim zapisuje aplikace do App Group
// (`src/lib/useWidgetSync.ts`), widget je jen čte a dopočítá klouzavé okno k okamžiku vykreslení.

private let steelsetAppGroup = "group.cz.setly.app"
private let steelsetSnapshotKey = "widgetSnapshot"
private let steelsetMsWeek: Double = 7 * 24 * 3600 * 1000
private let steelsetMsDay: Double = 24 * 3600 * 1000
private let steelsetDim = Color(white: 0.62)

// MARK: - Snímek dat

/// Musí sedět 1:1 s typem `WidgetSnapshot` v `src/lib/widgetSnapshot.ts`. Přejmenované
/// nebo chybějící pole znamená, že se snímek nedekóduje a widget ukáže prázdný stav.
struct WidgetSnapshot: Codable {
  struct Recent: Codable {
    let at: Double
    let volume: Double
  }

  struct Active: Codable {
    let name: String
    let startedAt: Double
  }

  struct Next: Codable {
    let id: String
    let name: String
    let exercises: Int
    let lastAt: Double?
  }

  let v: Int
  let unit: String
  let recent: [Recent]
  let streakWeeks: [Int]
  let active: Active?
  let next: Next?
}

private func steelsetLoadSnapshot() -> WidgetSnapshot? {
  guard let raw = UserDefaults(suiteName: steelsetAppGroup)?.string(forKey: steelsetSnapshotKey),
        let data = raw.data(using: .utf8) else { return nil }
  return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
}

private func steelsetDate(_ ms: Double) -> Date {
  Date(timeIntervalSince1970: ms / 1000)
}

// MARK: - Výpočty (kopie `streakFromWeeks` a `weekFromRecent` z widgetSnapshot.ts)

/// Série v řadě. Stejný algoritmus jako `weekStreak` v aplikaci, test hlídá JS verzi.
private func steelsetStreak(_ weeks: [Int], now: Date) -> Int {
  if weeks.isEmpty { return 0 }
  let set = Set(weeks)
  let thisWeek = Int(floor(now.timeIntervalSince1970 * 1000 / steelsetMsWeek))
  var cursor = set.contains(thisWeek) ? thisWeek : thisWeek - 1
  var streak = 0
  while set.contains(cursor) {
    streak += 1
    cursor -= 1
  }
  return streak
}

/// Tréninky a objem za klouzavých sedm dní. Stejné okno jako obrazovka Pokrok.
private func steelsetWeek(_ recent: [WidgetSnapshot.Recent], now: Date) -> (count: Int, volume: Int) {
  let nowMs = now.timeIntervalSince1970 * 1000
  let from = nowMs - steelsetMsWeek
  let inWindow = recent.filter { $0.at >= from && $0.at <= nowMs }
  let volume = inWindow.reduce(0.0) { $0 + $1.volume }
  return (inWindow.count, Int(volume.rounded()))
}

/// Kdy se má widget překreslit sám: až nějaký trénink vypadne z týdenního okna,
/// na začátku dalšího týdne kvůli sérii, a nejpozději za šest hodin.
private func steelsetNextRefresh(_ snapshot: WidgetSnapshot?, now: Date) -> Date {
  let nowMs = now.timeIntervalSince1970 * 1000
  var candidates: [Double] = [nowMs + 6 * 3600 * 1000]
  if let snapshot = snapshot {
    for r in snapshot.recent where r.at + steelsetMsWeek > nowMs {
      candidates.append(r.at + steelsetMsWeek + 1000)
    }
    let thisWeek = floor(nowMs / steelsetMsWeek)
    candidates.append((thisWeek + 1) * steelsetMsWeek + 1000)
  }
  return steelsetDate(candidates.min() ?? nowMs + 3600 * 1000)
}

private func czPlural(_ n: Int, _ one: String, _ few: String, _ many: String) -> String {
  if n == 1 { return one }
  if n >= 2 && n <= 4 { return few }
  return many
}

/// Ukázková data pro galerii widgetů, dokud aplikace žádný snímek nezapsala.
private func steelsetSampleSnapshot(now: Date) -> WidgetSnapshot {
  let nowMs = now.timeIntervalSince1970 * 1000
  let thisWeek = Int(floor(nowMs / steelsetMsWeek))
  return WidgetSnapshot(
    v: 1,
    unit: "kg",
    recent: [
      WidgetSnapshot.Recent(at: nowMs - steelsetMsDay, volume: 7850),
      WidgetSnapshot.Recent(at: nowMs - 3 * steelsetMsDay, volume: 6420),
      WidgetSnapshot.Recent(at: nowMs - 5 * steelsetMsDay, volume: 8130),
    ],
    streakWeeks: [thisWeek, thisWeek - 1, thisWeek - 2, thisWeek - 3],
    active: nil,
    next: WidgetSnapshot.Next(id: "", name: "Nohy a břicho", exercises: 6, lastAt: nowMs - 4 * steelsetMsDay)
  )
}

// MARK: - Časová osa

struct SteelsetEntry: TimelineEntry {
  let date: Date
  let snapshot: WidgetSnapshot?
}

struct SteelsetProvider: TimelineProvider {
  func placeholder(in context: Context) -> SteelsetEntry {
    SteelsetEntry(date: Date(), snapshot: steelsetSampleSnapshot(now: Date()))
  }

  func getSnapshot(in context: Context, completion: @escaping (SteelsetEntry) -> Void) {
    let now = Date()
    let stored = steelsetLoadSnapshot()
    let snapshot = stored ?? (context.isPreview ? steelsetSampleSnapshot(now: now) : nil)
    completion(SteelsetEntry(date: now, snapshot: snapshot))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<SteelsetEntry>) -> Void) {
    let now = Date()
    let snapshot = steelsetLoadSnapshot()
    let entry = SteelsetEntry(date: now, snapshot: snapshot)
    completion(Timeline(entries: [entry], policy: .after(steelsetNextRefresh(snapshot, now: now))))
  }
}

// MARK: - Společné kusy

extension View {
  /// Od iOS 17 musí mít widget `containerBackground`, jinak systém místo obsahu ukáže výzvu
  /// k úpravě. Na iOS 16 se pozadí a okraj kreslí postaru.
  @ViewBuilder
  func steelsetWidgetBackground(_ color: Color, padded: Bool) -> some View {
    if #available(iOS 17.0, *) {
      containerBackground(for: .widget) { color }
    } else if padded {
      padding(14).background(color)
    } else {
      background(color)
    }
  }
}

private func steelsetPill(_ title: String) -> some View {
  Text(verbatim: title)
    .font(.system(size: 13, weight: .bold))
    .foregroundColor(steelsetBg)
    .padding(.horizontal, 12)
    .padding(.vertical, 6)
    .background(Capsule().fill(steelsetAccent))
}

private struct SteelsetCaption: View {
  let text: String
  var color: Color = steelsetDim

  var body: some View {
    Text(verbatim: text)
      .font(.system(size: 11, weight: .semibold))
      .foregroundColor(color)
  }
}

// MARK: - Widget „Tento týden"

private struct SteelsetWeekSmall: View {
  let snapshot: WidgetSnapshot
  let now: Date

  var body: some View {
    let week = steelsetWeek(snapshot.recent, now: now)
    let streak = steelsetStreak(snapshot.streakWeeks, now: now)
    VStack(alignment: .leading, spacing: 3) {
      SteelsetCaption(text: "TENTO TÝDEN")
      Spacer(minLength: 0)
      HStack(alignment: .firstTextBaseline, spacing: 5) {
        Text(verbatim: "\(week.count)")
          .font(.system(size: 36, weight: .bold).monospacedDigit())
          .foregroundColor(steelsetAccent)
        Text(verbatim: czPlural(week.count, "trénink", "tréninky", "tréninků"))
          .font(.system(size: 13, weight: .semibold))
          .foregroundColor(.white)
      }
      Text(verbatim: "\(week.volume.formatted(.number)) \(snapshot.unit)")
        .font(.system(size: 15, weight: .semibold).monospacedDigit())
        .foregroundColor(.white)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
      if streak > 0 {
        HStack(spacing: 4) {
          Image(systemName: "flame.fill")
            .font(.system(size: 11))
            .foregroundColor(steelsetAccent)
          Text(verbatim: "\(streak) týd. v řadě")
            .font(.system(size: 12, weight: .semibold))
            .foregroundColor(steelsetDim)
        }
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}

private struct SteelsetWeekCircular: View {
  let snapshot: WidgetSnapshot
  let now: Date

  var body: some View {
    let week = steelsetWeek(snapshot.recent, now: now)
    ZStack {
      AccessoryWidgetBackground()
      VStack(spacing: 0) {
        Text(verbatim: "\(week.count)")
          .font(.system(size: 22, weight: .bold).monospacedDigit())
        Text(verbatim: "týden")
          .font(.system(size: 10, weight: .semibold))
      }
    }
  }
}

private struct SteelsetWeekRectangular: View {
  let snapshot: WidgetSnapshot
  let now: Date

  var body: some View {
    let week = steelsetWeek(snapshot.recent, now: now)
    let streak = steelsetStreak(snapshot.streakWeeks, now: now)
    VStack(alignment: .leading, spacing: 1) {
      Text(verbatim: "Tento týden")
        .font(.headline)
      Text(verbatim: "\(week.count) \(czPlural(week.count, "trénink", "tréninky", "tréninků")) · \(week.volume.formatted(.number)) \(snapshot.unit)")
        .font(.caption)
        .lineLimit(1)
        .minimumScaleFactor(0.8)
      if streak > 0 {
        Text(verbatim: "\(streak) týd. v řadě")
          .font(.caption)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }
}

struct SteelsetWeekView: View {
  @Environment(\.widgetFamily) var family
  let entry: SteelsetEntry

  var body: some View {
    Group {
      if let snapshot = entry.snapshot, !(snapshot.recent.isEmpty && snapshot.streakWeeks.isEmpty) {
        switch family {
        case .accessoryCircular:
          SteelsetWeekCircular(snapshot: snapshot, now: entry.date)
        case .accessoryRectangular:
          SteelsetWeekRectangular(snapshot: snapshot, now: entry.date)
        default:
          SteelsetWeekSmall(snapshot: snapshot, now: entry.date)
        }
      } else {
        switch family {
        case .accessoryCircular:
          ZStack {
            AccessoryWidgetBackground()
            Image(systemName: "dumbbell.fill")
          }
        case .accessoryRectangular:
          VStack(alignment: .leading, spacing: 1) {
            Text(verbatim: "Steelset").font(.headline)
            Text(verbatim: "Zatím žádný trénink").font(.caption)
          }
          .frame(maxWidth: .infinity, alignment: .leading)
        default:
          VStack(alignment: .leading, spacing: 6) {
            SteelsetCaption(text: "TENTO TÝDEN")
            Spacer(minLength: 0)
            Text(verbatim: entry.snapshot == nil ? "Otevři Steelset, ať má widget co ukázat." : "Zatím žádný trénink. Ťukni a začni.")
              .font(.system(size: 14, weight: .semibold))
              .foregroundColor(.white)
              .lineLimit(4)
          }
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        }
      }
    }
    .widgetURL(URL(string: "steelset://"))
    .steelsetWidgetBackground(family == .systemSmall ? steelsetBg : Color.clear, padded: family == .systemSmall)
  }
}

struct SteelsetWeekWidget: Widget {
  let kind = "SteelsetWeek"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: SteelsetProvider()) { entry in
      SteelsetWeekView(entry: entry)
    }
    .configurationDisplayName("Tento týden")
    .description("Tréninky a objem za posledních sedm dní a série týdnů v řadě.")
    .supportedFamilies([.systemSmall, .accessoryCircular, .accessoryRectangular])
  }
}

// MARK: - Widget „Další trénink"

/// Kam vede ťuknutí. Běžící trénink se jen otevře, jinak se spustí plán, který je na řadě.
/// Bez snímku (aplikace ještě nic nezapsala) se otevře Dnešek, nic se nespouští naslepo.
private func steelsetNextURL(_ snapshot: WidgetSnapshot?) -> URL? {
  guard let snapshot = snapshot else { return URL(string: "steelset://") }
  if snapshot.active != nil { return URL(string: "steelset://workout") }
  var components = URLComponents()
  components.scheme = "steelset"
  components.host = "start"
  if let next = snapshot.next {
    components.queryItems = [URLQueryItem(name: "routine", value: next.id)]
  }
  return components.url ?? URL(string: "steelset://start")
}

private func steelsetNextDetail(_ next: WidgetSnapshot.Next) -> String {
  let count = "\(next.exercises) \(czPlural(next.exercises, "cvik", "cviky", "cviků"))"
  guard let lastAt = next.lastAt else { return "\(count) · zatím necvičený" }
  return "\(count) · naposledy \(steelsetDate(lastAt).formatted(.relative(presentation: .named, unitsStyle: .wide)))"
}

struct SteelsetNextView: View {
  @Environment(\.widgetFamily) var family
  let entry: SteelsetEntry

  var body: some View {
    let snapshot = entry.snapshot
    VStack(alignment: .leading, spacing: 4) {
      if let active = snapshot?.active {
        SteelsetCaption(text: "PROBÍHÁ", color: steelsetAccent)
        Text(verbatim: active.name)
          .font(.system(size: 17, weight: .bold))
          .foregroundColor(.white)
          .lineLimit(2)
        Spacer(minLength: 0)
        HStack(alignment: .center) {
          Text(steelsetDate(active.startedAt), style: .timer)
            .font(.system(size: 22, weight: .bold).monospacedDigit())
            .foregroundColor(steelsetAccent)
            .lineLimit(1)
          Spacer(minLength: 0)
          if family != .systemSmall {
            steelsetPill("Pokračovat")
          }
        }
      } else if let next = snapshot?.next {
        SteelsetCaption(text: "DALŠÍ TRÉNINK")
        Text(verbatim: next.name)
          .font(.system(size: 17, weight: .bold))
          .foregroundColor(.white)
          .lineLimit(2)
        Text(verbatim: steelsetNextDetail(next))
          .font(.system(size: 12, weight: .medium))
          .foregroundColor(steelsetDim)
          .lineLimit(2)
        Spacer(minLength: 0)
        if family != .systemSmall {
          HStack {
            Spacer(minLength: 0)
            steelsetPill("Začít")
          }
        }
      } else {
        SteelsetCaption(text: "VOLNÝ TRÉNINK")
        Spacer(minLength: 0)
        Text(verbatim: snapshot == nil ? "Otevři Steelset, ať má widget co ukázat." : "Nemáš žádný plán. Ťukni a začni volný trénink.")
          .font(.system(size: 14, weight: .semibold))
          .foregroundColor(.white)
          .lineLimit(4)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .widgetURL(steelsetNextURL(snapshot))
    .steelsetWidgetBackground(steelsetBg, padded: true)
  }
}

struct SteelsetNextWidget: Widget {
  let kind = "SteelsetNext"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: SteelsetProvider()) { entry in
      SteelsetNextView(entry: entry)
    }
    .configurationDisplayName("Další trénink")
    .description("Plán, který je na řadě, nebo právě běžící trénink. Ťuknutím ho spustíš.")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}
