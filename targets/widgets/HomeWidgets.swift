import SwiftUI
import WidgetKit

// Widgety na plochu a zamčenou obrazovku (#16), výběr schválil zadavatel (S31 v deníku):
// Tento týden, Týdenní cíl, Poslední trénink, Kalendář měsíce, Tělesná váha, Plány tento týden
// a Série po partiích. Data jim zapisuje aplikace do App Group (`src/lib/useWidgetSync.ts`),
// widget je jen čte a okna (sedm dní, kalendářní týden, měsíc) dopočítá k okamžiku vykreslení.

private let steelsetAppGroup = "group.cz.setly.app"
private let steelsetSnapshotKey = "widgetSnapshot"
private let steelsetMsWeek: Double = 7 * 24 * 3600 * 1000
private let steelsetMsDay: Double = 24 * 3600 * 1000
private let steelsetDim = Color(white: 0.62)
private let steelsetTrack = Color(red: 0.118, green: 0.129, blue: 0.153) // #1E2127
// MARK: - Jazyk (#20)

/// Jen pole `lang` ze snímku; celý snímek se kvůli jazyku nedekóduje do struktury.
private struct SteelsetLangHead: Decodable {
  let lang: String?
}

/// Widgety mluví stejným jazykem jako aplikace: snímek nese `lang` podle volby v Profilu.
/// Bez snímku (čerstvá instalace, galerie widgetů) rozhoduje jazyk telefonu, čeština a slovenština
/// dostanou češtinu. Sdílí to i Live Activity v `index.swift`.
func steelsetIsEnglish() -> Bool {
  if let raw = UserDefaults(suiteName: steelsetAppGroup)?.string(forKey: steelsetSnapshotKey),
     let data = raw.data(using: .utf8),
     let head = try? JSONDecoder().decode(SteelsetLangHead.self, from: data),
     let lang = head.lang {
    return lang == "en"
  }
  let first = Locale.preferredLanguages.first ?? "cs"
  return !(first.hasPrefix("cs") || first.hasPrefix("sk"))
}

/// Text v jazyce aplikace.
func steelsetL(_ cs: String, _ en: String) -> String {
  steelsetIsEnglish() ? en : cs
}

private var steelsetLocale: Locale {
  steelsetIsEnglish() ? Locale(identifier: "en_US") : Locale(identifier: "cs_CZ")
}

/// Partie se ve snímku drží česky (klíče uložených dat), anglicky se jen zobrazí.
private let steelsetMusclesEn: [String: String] = [
  "Hrudník": "Chest", "Záda": "Back", "Nohy": "Legs", "Ramena": "Shoulders", "Biceps": "Biceps",
  "Triceps": "Triceps", "Břicho": "Abs", "Hýždě": "Glutes", "Lýtka": "Calves", "Předloktí": "Forearms",
  "Trapézy": "Traps", "Horní záda": "Upper back", "Spodní záda": "Lower back", "Kvadricepsy": "Quads",
  "Hamstringy": "Hamstrings", "Šikmé břišní": "Obliques",
]

private func steelsetMuscle(_ name: String) -> String {
  steelsetIsEnglish() ? (steelsetMusclesEn[name] ?? name) : name
}

private func steelsetWorkoutsWord(_ n: Int) -> String {
  steelsetIsEnglish() ? (n == 1 ? "workout" : "workouts") : czPlural(n, "trénink", "tréninky", "tréninků")
}

private func steelsetExercisesWord(_ n: Int) -> String {
  steelsetIsEnglish() ? (n == 1 ? "exercise" : "exercises") : czPlural(n, "cvik", "cviky", "cviků")
}

private func steelsetStreakText(_ n: Int) -> String {
  steelsetL("\(n) týd. v řadě", "\(n)-week streak")
}

private var steelsetOpenHint: String {
  steelsetL("Otevři Steelset, ať má widget co ukázat.", "Open Steelset so the widget has something to show.")
}

private var steelsetNoWorkoutHint: String {
  steelsetL("Zatím žádný trénink. Ťukni a začni.", "No workout yet. Tap to start.")
}

// MARK: - Snímek dat

/// Musí sedět 1:1 s typem `WidgetSnapshot` v `src/lib/widgetSnapshot.ts` (hlídá to test).
/// Přejmenované nebo chybějící pole znamená, že se snímek nedekóduje a widget ukáže prázdný stav.
struct WidgetSnapshot: Codable {
  struct Recent: Codable {
    let at: Double
    let volume: Double
    let sets: [String: Double]
  }

  struct Last: Codable {
    let id: String
    let name: String
    let at: Double
    let volume: Double
    let minutes: Int
    let avgHr: Int?
  }

  struct RoutineRow: Codable {
    let id: String
    let name: String
    let exercises: Int
    let lastAt: Double?
  }

  struct WeightPoint: Codable {
    let at: Double
    let value: Double
  }

  let v: Int
  let unit: String
  let recent: [Recent]
  let streakWeeks: [Int]
  let goal: Int
  let last: Last?
  let routines: [RoutineRow]
  let next: String?
  let weight: [WeightPoint]
  /// Jazyk aplikace, `cs` nebo `en` (#20). Volitelný kvůli snímkům ze starších verzí.
  let lang: String?
}

private func steelsetLoadSnapshot() -> WidgetSnapshot? {
  guard let raw = UserDefaults(suiteName: steelsetAppGroup)?.string(forKey: steelsetSnapshotKey),
        let data = raw.data(using: .utf8) else { return nil }
  return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
}

private func steelsetDate(_ ms: Double) -> Date {
  Date(timeIntervalSince1970: ms / 1000)
}

private func steelsetMs(_ date: Date) -> Double {
  date.timeIntervalSince1970 * 1000
}

/// Český kalendář, týden od pondělí. Stejně počítá `weekStartMonday` v aplikaci.
private var steelsetCalendar: Calendar {
  var cal = Calendar(identifier: .gregorian)
  cal.locale = steelsetLocale
  cal.timeZone = TimeZone.current
  cal.firstWeekday = 2
  return cal
}

// MARK: - Výpočty (kopie referenčních funkcí z widgetSnapshot.ts, test hlídá JS verzi)

/// Série v řadě. Stejný algoritmus jako `weekStreak` v aplikaci.
private func steelsetStreak(_ weeks: [Int], now: Date) -> Int {
  if weeks.isEmpty { return 0 }
  let set = Set(weeks)
  let thisWeek = Int(floor(steelsetMs(now) / steelsetMsWeek))
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
  let nowMs = steelsetMs(now)
  let inWindow = recent.filter { $0.at >= nowMs - steelsetMsWeek && $0.at <= nowMs }
  let volume = inWindow.reduce(0.0) { $0 + $1.volume }
  return (inWindow.count, Int(volume.rounded()))
}

/// Pondělí 00:00 místního času.
private func steelsetWeekStart(_ now: Date) -> Date {
  steelsetCalendar.dateInterval(of: .weekOfYear, for: now)?.start ?? now
}

/// Tréninky v tomhle kalendářním týdnu, pro týdenní cíl.
private func steelsetGoalDone(_ recent: [WidgetSnapshot.Recent], now: Date) -> Int {
  let from = steelsetMs(steelsetWeekStart(now))
  let nowMs = steelsetMs(now)
  return recent.filter { $0.at >= from && $0.at <= nowMs }.count
}

/// Dny aktuálního měsíce s tréninkem a počet tréninků v něm.
private func steelsetMonth(_ recent: [WidgetSnapshot.Recent], now: Date) -> (days: Set<Int>, count: Int) {
  let cal = steelsetCalendar
  let nowMs = steelsetMs(now)
  var days = Set<Int>()
  var count = 0
  for r in recent where r.at <= nowMs {
    let date = steelsetDate(r.at)
    if cal.isDate(date, equalTo: now, toGranularity: .month) {
      days.insert(cal.component(.day, from: date))
      count += 1
    }
  }
  return (days, count)
}

private struct SteelsetMuscleRow {
  let name: String
  let sets: Double
}

/// Pět partií s nejvíc sériemi za klouzavých sedm dní. Stejné počítání jako svalová mapa.
/// Rozepsané do jednoduchých kroků: řetězec map/filter/sorted nad n-ticí kompilátor
/// v buildu 28 nezvládl otypovat v rozumném čase a build spadl.
private func steelsetTopMuscles(_ recent: [WidgetSnapshot.Recent], now: Date) -> [SteelsetMuscleRow] {
  let nowMs = steelsetMs(now)
  let from = nowMs - steelsetMsWeek
  var sum: [String: Double] = [:]
  for r in recent where r.at >= from && r.at <= nowMs {
    for (muscle, n) in r.sets {
      sum[muscle, default: 0] += n
    }
  }
  var rows: [SteelsetMuscleRow] = []
  for (muscle, total) in sum {
    let rounded: Double = (total * 10).rounded() / 10
    if rounded > 0 {
      rows.append(SteelsetMuscleRow(name: muscle, sets: rounded))
    }
  }
  rows.sort { (a: SteelsetMuscleRow, b: SteelsetMuscleRow) -> Bool in
    if a.sets != b.sets {
      return a.sets > b.sets
    }
    return a.name.localizedStandardCompare(b.name) == .orderedAscending
  }
  return Array(rows.prefix(5))
}

/// Barva podle týdenních sérií, stejné hranice i barvy jako svalová mapa.
private func steelsetZoneColor(_ sets: Double) -> Color {
  if sets < 5 { return Color(red: 0.498, green: 0.639, blue: 0.839) } // málo, #7FA3D6
  if sets < 20 { return steelsetAccent } // optimum
  if sets <= 25 { return Color(red: 1.0, green: 0.690, blue: 0.125) } // hodně, #FFB020
  return Color(red: 1.0, green: 0.322, blue: 0.278) // přetížení, #FF5247
}

/// Kdy se má widget překreslit sám: o půlnoci (kalendář, měsíc), v pondělí (cíl, plány), na konci
/// týdne pro sérii, až trénink vypadne z týdenního okna, a nejpozději za šest hodin.
private func steelsetNextRefresh(_ snapshot: WidgetSnapshot?, now: Date) -> Date {
  let nowMs = steelsetMs(now)
  let cal = steelsetCalendar
  var candidates: [Double] = [nowMs + 6 * 3600 * 1000]
  if let tomorrow = cal.date(byAdding: .day, value: 1, to: cal.startOfDay(for: now)) {
    candidates.append(steelsetMs(tomorrow) + 1000)
  }
  if let monday = cal.date(byAdding: .day, value: 7, to: steelsetWeekStart(now)) {
    candidates.append(steelsetMs(monday) + 1000)
  }
  if let snapshot = snapshot {
    for r in snapshot.recent where r.at + steelsetMsWeek > nowMs {
      candidates.append(r.at + steelsetMsWeek + 1000)
    }
    let thisWeek = floor(nowMs / steelsetMsWeek)
    candidates.append((thisWeek + 1) * steelsetMsWeek + 1000)
  }
  return steelsetDate(candidates.min() ?? nowMs + 3600 * 1000)
}

private var steelsetWeekdayLetters: [String] {
  steelsetIsEnglish() ? ["M", "T", "W", "T", "F", "S", "S"] : ["P", "Ú", "S", "Č", "P", "S", "N"]
}

private func czPlural(_ n: Int, _ one: String, _ few: String, _ many: String) -> String {
  if n == 1 { return one }
  if n >= 2 && n <= 4 { return few }
  return many
}

private func fmtInt(_ n: Int) -> String {
  n.formatted(.number.locale(steelsetLocale))
}

private func fmt1(_ x: Double) -> String {
  x.formatted(.number.precision(.fractionLength(1)).locale(steelsetLocale))
}

private func fmtSigned1(_ x: Double) -> String {
  x.formatted(.number.precision(.fractionLength(1)).sign(strategy: .always()).locale(steelsetLocale))
}

private func fmtSets(_ x: Double) -> String {
  x.formatted(.number.precision(.fractionLength(0...1)).locale(steelsetLocale))
}

private func steelsetRelative(_ date: Date) -> String {
  Date.RelativeFormatStyle(presentation: .named, unitsStyle: .wide, locale: steelsetLocale).format(date)
}

/// Ukázková data pro galerii widgetů, dokud aplikace žádný snímek nezapsala.
private func steelsetSampleSnapshot(now: Date) -> WidgetSnapshot {
  let nowMs = steelsetMs(now)
  let thisWeek = Int(floor(nowMs / steelsetMsWeek))
  let sets: [String: Double] = ["Hrudník": 5, "Triceps": 2.5, "Ramena": 2.5]
  return WidgetSnapshot(
    v: 2,
    unit: "kg",
    recent: [
      WidgetSnapshot.Recent(at: nowMs - steelsetMsDay, volume: 7850, sets: sets),
      WidgetSnapshot.Recent(at: nowMs - 3 * steelsetMsDay, volume: 6420, sets: ["Záda": 6, "Biceps": 3]),
      WidgetSnapshot.Recent(at: nowMs - 5 * steelsetMsDay, volume: 8130, sets: ["Kvadricepsy": 6, "Hýždě": 3]),
    ],
    streakWeeks: [thisWeek, thisWeek - 1, thisWeek - 2, thisWeek - 3],
    goal: 4,
    last: WidgetSnapshot.Last(id: "", name: steelsetL("Hrudník", "Chest"), at: nowMs - steelsetMsDay, volume: 7850, minutes: 52, avgHr: 128),
    routines: [
      WidgetSnapshot.RoutineRow(id: "a", name: steelsetL("Hrudník", "Chest"), exercises: 5, lastAt: nowMs - steelsetMsDay),
      WidgetSnapshot.RoutineRow(id: "b", name: steelsetL("Záda", "Back"), exercises: 6, lastAt: nowMs - 3 * steelsetMsDay),
      WidgetSnapshot.RoutineRow(id: "c", name: steelsetL("Nohy a břicho", "Legs and abs"), exercises: 6, lastAt: nil),
    ],
    next: "c",
    weight: [
      WidgetSnapshot.WeightPoint(at: nowMs - 25 * steelsetMsDay, value: 83.2),
      WidgetSnapshot.WeightPoint(at: nowMs - 12 * steelsetMsDay, value: 82.9),
      WidgetSnapshot.WeightPoint(at: nowMs - 2 * steelsetMsDay, value: 82.4),
    ],
    lang: steelsetIsEnglish() ? "en" : "cs"
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

private struct SteelsetCaption: View {
  let text: String
  var color: Color = steelsetDim

  var body: some View {
    Text(verbatim: text)
      .font(.system(size: 11, weight: .semibold))
      .foregroundColor(color)
      .lineLimit(1)
  }
}

/// Prázdný stav malých a středních widgetů: nadpis nahoře, vysvětlení dole.
private struct SteelsetEmpty: View {
  let caption: String
  let hint: String

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      SteelsetCaption(text: caption)
      Spacer(minLength: 0)
      Text(verbatim: hint)
        .font(.system(size: 14, weight: .semibold))
        .foregroundColor(.white)
        .lineLimit(4)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}

private struct SteelsetStreakLine: View {
  let streak: Int
  var extra: String? = nil

  var body: some View {
    HStack(spacing: 4) {
      Image(systemName: "flame.fill")
        .font(.system(size: 11))
        .foregroundColor(steelsetAccent)
      Text(verbatim: extra.map { "\(steelsetStreakText(streak)) · \($0)" } ?? steelsetStreakText(streak))
        .font(.system(size: 12, weight: .semibold))
        .foregroundColor(steelsetDim)
        .lineLimit(1)
        .minimumScaleFactor(0.8)
    }
  }
}

private struct SteelsetRing: View {
  let fraction: Double
  let lineWidth: CGFloat
  let track: Color
  let color: Color

  var body: some View {
    ZStack {
      Circle().stroke(track, lineWidth: lineWidth)
      Circle()
        .trim(from: 0, to: CGFloat(min(max(fraction, 0), 1)))
        .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
        .rotationEffect(.degrees(-90))
    }
  }
}

private struct SteelsetSparkline: View {
  let values: [Double]

  var body: some View {
    GeometryReader { geo in
      Path { path in
        guard values.count > 1, let lo = values.min(), let hi = values.max() else { return }
        let span = hi - lo == 0 ? 1 : hi - lo
        for (i, v) in values.enumerated() {
          let x = geo.size.width * CGFloat(i) / CGFloat(values.count - 1)
          let y = geo.size.height - 3 - (geo.size.height - 6) * CGFloat((v - lo) / span)
          if i == 0 {
            path.move(to: CGPoint(x: x, y: y))
          } else {
            path.addLine(to: CGPoint(x: x, y: y))
          }
        }
      }
      .stroke(steelsetAccent, style: StrokeStyle(lineWidth: 2.5, lineCap: .round, lineJoin: .round))
    }
    .frame(height: 34)
  }
}

// MARK: - 1 · Tento týden (malý, kroužek a obdélník na zamčenou obrazovku)

private struct SteelsetWeekSmall: View {
  let snapshot: WidgetSnapshot
  let now: Date

  var body: some View {
    let week = steelsetWeek(snapshot.recent, now: now)
    let streak = steelsetStreak(snapshot.streakWeeks, now: now)
    VStack(alignment: .leading, spacing: 3) {
      SteelsetCaption(text: steelsetL("TENTO TÝDEN", "THIS WEEK"))
      Spacer(minLength: 0)
      HStack(alignment: .firstTextBaseline, spacing: 5) {
        Text(verbatim: "\(week.count)")
          .font(.system(size: 36, weight: .bold).monospacedDigit())
          .foregroundColor(steelsetAccent)
        Text(verbatim: steelsetWorkoutsWord(week.count))
          .font(.system(size: 13, weight: .semibold))
          .foregroundColor(.white)
      }
      Text(verbatim: "\(fmtInt(week.volume)) \(snapshot.unit)")
        .font(.system(size: 15, weight: .semibold).monospacedDigit())
        .foregroundColor(.white)
        .lineLimit(1)
        .minimumScaleFactor(0.7)
      if streak > 0 {
        SteelsetStreakLine(streak: streak)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }
}

struct SteelsetWeekView: View {
  @Environment(\.widgetFamily) var family
  let entry: SteelsetEntry

  var body: some View {
    Group {
      if let snapshot = entry.snapshot, !(snapshot.recent.isEmpty && snapshot.streakWeeks.isEmpty) {
        let week = steelsetWeek(snapshot.recent, now: entry.date)
        let streak = steelsetStreak(snapshot.streakWeeks, now: entry.date)
        switch family {
        case .accessoryCircular:
          ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 0) {
              Text(verbatim: "\(week.count)").font(.system(size: 22, weight: .bold).monospacedDigit())
              Text(verbatim: steelsetL("týden", "week")).font(.system(size: 10, weight: .semibold))
            }
          }
        case .accessoryRectangular:
          VStack(alignment: .leading, spacing: 1) {
            Text(verbatim: steelsetL("Tento týden", "This week")).font(.headline)
            Text(verbatim: "\(week.count) \(steelsetWorkoutsWord(week.count)) · \(fmtInt(week.volume)) \(snapshot.unit)")
              .font(.caption)
              .lineLimit(1)
              .minimumScaleFactor(0.8)
            if streak > 0 {
              Text(verbatim: steelsetStreakText(streak)).font(.caption)
            }
          }
          .frame(maxWidth: .infinity, alignment: .leading)
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
            Text(verbatim: steelsetL("Zatím žádný trénink", "No workout yet")).font(.caption)
          }
          .frame(maxWidth: .infinity, alignment: .leading)
        default:
          SteelsetEmpty(caption: steelsetL("TENTO TÝDEN", "THIS WEEK"), hint: entry.snapshot == nil ? steelsetOpenHint : steelsetNoWorkoutHint)
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
    .configurationDisplayName(steelsetL("Tento týden", "This week"))
    .description(steelsetL("Tréninky a objem za posledních sedm dní a série týdnů v řadě.", "Workouts and volume over the last seven days, plus your weekly streak."))
    .supportedFamilies([.systemSmall, .accessoryCircular, .accessoryRectangular])
  }
}

// MARK: - 6 a 18 · Týdenní cíl (malý a kroužek na zamčenou obrazovku)

struct SteelsetGoalView: View {
  @Environment(\.widgetFamily) var family
  let entry: SteelsetEntry

  var body: some View {
    let goal = entry.snapshot?.goal ?? 0
    let done = entry.snapshot.map { steelsetGoalDone($0.recent, now: entry.date) } ?? 0
    let fraction = goal > 0 ? Double(done) / Double(goal) : 0
    Group {
      switch family {
      case .accessoryCircular:
        ZStack {
          AccessoryWidgetBackground()
          if goal > 0 {
            SteelsetRing(fraction: fraction, lineWidth: 5, track: Color.white.opacity(0.25), color: .white)
              .padding(4)
            VStack(spacing: 0) {
              Text(verbatim: "\(done)/\(goal)").font(.system(size: 17, weight: .bold).monospacedDigit())
              Text(verbatim: steelsetL("cíl", "goal")).font(.system(size: 9, weight: .semibold))
            }
          } else {
            VStack(spacing: 0) {
              Image(systemName: "flag")
              Text(verbatim: steelsetL("cíl", "goal")).font(.system(size: 9, weight: .semibold))
            }
          }
        }
      default:
        if goal > 0 {
          VStack(spacing: 0) {
            SteelsetCaption(text: steelsetL("TÝDENNÍ CÍL", "WEEKLY GOAL"))
              .frame(maxWidth: .infinity, alignment: .leading)
            Spacer(minLength: 4)
            ZStack {
              SteelsetRing(fraction: fraction, lineWidth: 10, track: steelsetTrack, color: steelsetAccent)
                .frame(width: 84, height: 84)
              VStack(spacing: 0) {
                Text(verbatim: "\(done)/\(goal)")
                  .font(.system(size: 22, weight: .bold).monospacedDigit())
                  .foregroundColor(.white)
                Text(verbatim: steelsetWorkoutsWord(goal))
                  .font(.system(size: 10, weight: .semibold))
                  .foregroundColor(steelsetDim)
              }
            }
            Spacer(minLength: 0)
          }
          .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
          SteelsetEmpty(caption: steelsetL("TÝDENNÍ CÍL", "WEEKLY GOAL"), hint: entry.snapshot == nil ? steelsetOpenHint : steelsetL("Nastav si cíl v Profilu, kolik tréninků týdně chceš.", "Set a goal in Profile for how many workouts a week you want."))
        }
      }
    }
    .widgetURL(URL(string: goal > 0 || entry.snapshot == nil ? "steelset://" : "steelset://profil"))
    .steelsetWidgetBackground(family == .systemSmall ? steelsetBg : Color.clear, padded: family == .systemSmall)
  }
}

struct SteelsetGoalWidget: Widget {
  let kind = "SteelsetGoal"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: SteelsetProvider()) { entry in
      SteelsetGoalView(entry: entry)
    }
    .configurationDisplayName(steelsetL("Týdenní cíl", "Weekly goal"))
    .description(steelsetL("Kolik tréninků máš tento týden za sebou z cíle, který si nastavíš v Profilu.", "How many workouts you have done this week out of the goal you set in Profile."))
    .supportedFamilies([.systemSmall, .accessoryCircular])
  }
}

// MARK: - 5 · Poslední trénink s tepem (střední)

private struct SteelsetStat: View {
  let value: String
  let label: String
  var heart: Bool = false

  var body: some View {
    VStack(alignment: .leading, spacing: 1) {
      HStack(spacing: 4) {
        if heart {
          Image(systemName: "heart.fill")
            .font(.system(size: 13))
            .foregroundColor(steelsetAccent)
        }
        Text(verbatim: value)
          .font(.system(size: 18, weight: .bold).monospacedDigit())
          .foregroundColor(.white)
          .lineLimit(1)
          .minimumScaleFactor(0.7)
      }
      Text(verbatim: label)
        .font(.system(size: 11, weight: .medium))
        .foregroundColor(steelsetDim)
    }
  }
}

struct SteelsetLastView: View {
  let entry: SteelsetEntry

  var body: some View {
    let last = entry.snapshot?.last
    Group {
      if let last = last, let snapshot = entry.snapshot {
        VStack(alignment: .leading, spacing: 4) {
          SteelsetCaption(text: "\(steelsetL("POSLEDNÍ TRÉNINK", "LAST WORKOUT")) · \(steelsetRelative(steelsetDate(last.at)).uppercased())")
          Text(verbatim: last.name)
            .font(.system(size: 17, weight: .bold))
            .foregroundColor(.white)
            .lineLimit(1)
          Spacer(minLength: 0)
          HStack(alignment: .bottom, spacing: 26) {
            SteelsetStat(value: "\(fmtInt(Int(last.volume.rounded()))) \(snapshot.unit)", label: steelsetL("objem", "volume"))
            SteelsetStat(value: "\(last.minutes) min", label: steelsetL("délka", "duration"))
            if let hr = last.avgHr {
              SteelsetStat(value: "\(hr)", label: steelsetL("prům. tep", "avg HR"), heart: true)
            }
          }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      } else {
        SteelsetEmpty(caption: steelsetL("POSLEDNÍ TRÉNINK", "LAST WORKOUT"), hint: entry.snapshot == nil ? steelsetOpenHint : steelsetNoWorkoutHint)
      }
    }
    .widgetURL(URL(string: last.map { "steelset://history/\($0.id)" } ?? "steelset://"))
    .steelsetWidgetBackground(steelsetBg, padded: true)
  }
}

struct SteelsetLastWidget: Widget {
  let kind = "SteelsetLast"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: SteelsetProvider()) { entry in
      SteelsetLastView(entry: entry)
    }
    .configurationDisplayName(steelsetL("Poslední trénink", "Last workout"))
    .description(steelsetL("Objem, délka a průměrný tep posledního tréninku.", "Volume, duration and average heart rate of your last workout."))
    .supportedFamilies([.systemMedium])
  }
}

// MARK: - 8 · Kalendář měsíce (střední)

struct SteelsetCalendarView: View {
  let entry: SteelsetEntry

  var body: some View {
    let cal = steelsetCalendar
    let now = entry.date
    let recent = entry.snapshot?.recent ?? []
    let month = steelsetMonth(recent, now: now)
    let streak = steelsetStreak(entry.snapshot?.streakWeeks ?? [], now: now)
    let today = cal.component(.day, from: now)
    let daysInMonth = cal.range(of: .day, in: .month, for: now)?.count ?? 30
    let first = cal.date(from: cal.dateComponents([.year, .month], from: now)) ?? now
    // pondělí = 0 ... neděle = 6
    let offset = (cal.component(.weekday, from: first) + 5) % 7
    let cellCount = ((offset + daysInMonth + 6) / 7) * 7
    let rows = cellCount / 7
    let formatter: DateFormatter = {
      let f = DateFormatter()
      f.locale = steelsetLocale
      f.dateFormat = "LLLL"
      return f
    }()
    HStack(alignment: .top, spacing: 18) {
      VStack(alignment: .leading, spacing: 4) {
        SteelsetCaption(text: formatter.string(from: now).uppercased())
        HStack(spacing: 3) {
          ForEach(Array(steelsetWeekdayLetters.enumerated()), id: \.offset) { item in
            Text(verbatim: item.element)
              .font(.system(size: 9, weight: .semibold))
              .foregroundColor(steelsetDim)
              .frame(width: 13)
          }
        }
        VStack(alignment: .leading, spacing: 3) {
          ForEach(0..<rows, id: \.self) { row in
            HStack(spacing: 3) {
              ForEach(0..<7, id: \.self) { col in
                let day = row * 7 + col - offset + 1
                if day >= 1 && day <= daysInMonth {
                  RoundedRectangle(cornerRadius: 3)
                    .fill(month.days.contains(day) ? steelsetAccent : steelsetTrack)
                    .frame(width: 13, height: 13)
                    .overlay(
                      RoundedRectangle(cornerRadius: 3)
                        .stroke(Color.white.opacity(day == today ? 1 : 0), lineWidth: 1.5)
                    )
                } else {
                  Color.clear.frame(width: 13, height: 13)
                }
              }
            }
          }
        }
      }
      VStack(alignment: .leading, spacing: 1) {
        Spacer(minLength: 0)
        Text(verbatim: "\(month.count)")
          .font(.system(size: 34, weight: .bold).monospacedDigit())
          .foregroundColor(steelsetAccent)
        Text(verbatim: steelsetWorkoutsWord(month.count))
          .font(.system(size: 13, weight: .semibold))
          .foregroundColor(.white)
        Text(verbatim: steelsetL("tento měsíc", "this month"))
          .font(.system(size: 12, weight: .medium))
          .foregroundColor(steelsetDim)
        if streak > 0 {
          SteelsetStreakLine(streak: streak)
            .padding(.top, 6)
        }
      }
      Spacer(minLength: 0)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    .widgetURL(URL(string: "steelset://kalendar"))
    .steelsetWidgetBackground(steelsetBg, padded: true)
  }
}

struct SteelsetCalendarWidget: Widget {
  let kind = "SteelsetCalendar"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: SteelsetProvider()) { entry in
      SteelsetCalendarView(entry: entry)
    }
    .configurationDisplayName(steelsetL("Kalendář měsíce", "Month calendar"))
    .description(steelsetL("Dny s tréninkem v tomhle měsíci a série týdnů v řadě.", "Days you trained this month, plus your weekly streak."))
    .supportedFamilies([.systemMedium])
  }
}

// MARK: - 14 · Tělesná váha (malý)

struct SteelsetWeightView: View {
  let entry: SteelsetEntry

  var body: some View {
    let points = entry.snapshot?.weight ?? []
    let unit = entry.snapshot?.unit ?? "kg"
    Group {
      if let lastPoint = points.last, let firstPoint = points.first {
        VStack(alignment: .leading, spacing: 2) {
          SteelsetCaption(text: steelsetL("TĚLESNÁ VÁHA", "BODYWEIGHT"))
          Text(verbatim: "\(fmt1(lastPoint.value)) \(unit)")
            .font(.system(size: 30, weight: .bold).monospacedDigit())
            .foregroundColor(.white)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .padding(.top, 4)
          if points.count > 1 {
            Text(verbatim: "\(fmtSigned1(lastPoint.value - firstPoint.value)) \(unit) \(steelsetL("za měsíc", "this month"))")
              .font(.system(size: 12, weight: .semibold))
              .foregroundColor(steelsetAccent)
          } else {
            Text(verbatim: steelsetL("za posledních 30 dní", "over the last 30 days"))
              .font(.system(size: 12, weight: .semibold))
              .foregroundColor(steelsetDim)
          }
          Spacer(minLength: 0)
          SteelsetSparkline(values: points.map { $0.value })
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
      } else {
        SteelsetEmpty(caption: steelsetL("TĚLESNÁ VÁHA", "BODYWEIGHT"), hint: steelsetL("Připoj Apple Health v Profilu, ať má widget odkud brát vážení.", "Connect Apple Health in Profile so the widget can read your weigh-ins."))
      }
    }
    .widgetURL(URL(string: "steelset://profil"))
    .steelsetWidgetBackground(steelsetBg, padded: true)
  }
}

struct SteelsetWeightWidget: Widget {
  let kind = "SteelsetWeight"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: SteelsetProvider()) { entry in
      SteelsetWeightView(entry: entry)
    }
    .configurationDisplayName(steelsetL("Tělesná váha", "Bodyweight"))
    .description(steelsetL("Poslední vážení z Apple Health a trend za měsíc.", "Your latest weigh-in from Apple Health and the monthly trend."))
    .supportedFamilies([.systemSmall])
  }
}

// MARK: - 15 · Plány tento týden (velký)

struct SteelsetPlansView: View {
  let entry: SteelsetEntry

  var body: some View {
    let snapshot = entry.snapshot
    let routines = snapshot?.routines ?? []
    let weekStart = steelsetMs(steelsetWeekStart(entry.date))
    let doneCount = routines.filter { ($0.lastAt ?? 0) >= weekStart }.count
    let week = steelsetWeek(snapshot?.recent ?? [], now: entry.date)
    let streak = steelsetStreak(snapshot?.streakWeeks ?? [], now: entry.date)
    let unit = snapshot?.unit ?? "kg"
    Group {
      if routines.isEmpty {
        SteelsetEmpty(caption: steelsetL("PLÁNY TENTO TÝDEN", "PLANS THIS WEEK"), hint: snapshot == nil ? steelsetOpenHint : steelsetL("Zatím nemáš žádný plán. Vytvoříš ho v záložce Plány.", "You have no plan yet. Create one in the Plans tab."))
      } else {
        VStack(alignment: .leading, spacing: 0) {
          HStack {
            SteelsetCaption(text: steelsetL("PLÁNY TENTO TÝDEN", "PLANS THIS WEEK"))
            Spacer(minLength: 0)
            Text(verbatim: "\(doneCount) ze \(routines.count)")
              .font(.system(size: 13, weight: .bold).monospacedDigit())
              .foregroundColor(steelsetAccent)
          }
          .padding(.bottom, 10)
          ForEach(routines, id: \.id) { r in
            let done = (r.lastAt ?? 0) >= weekStart
            VStack(spacing: 0) {
              Rectangle().fill(steelsetTrack).frame(height: 1)
              HStack(spacing: 10) {
                ZStack {
                  if done {
                    Circle().fill(steelsetAccent)
                    Image(systemName: "checkmark")
                      .font(.system(size: 9, weight: .bold))
                      .foregroundColor(steelsetBg)
                  } else {
                    Circle().stroke(Color(white: 0.23), lineWidth: 2)
                  }
                }
                .frame(width: 18, height: 18)
                VStack(alignment: .leading, spacing: 1) {
                  Text(verbatim: r.name)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(done ? steelsetDim : .white)
                    .lineLimit(1)
                  Text(verbatim: "\(r.exercises) \(steelsetExercisesWord(r.exercises))")
                    .font(.system(size: 11.5, weight: .medium))
                    .foregroundColor(steelsetDim)
                }
                Spacer(minLength: 0)
                if r.id == snapshot?.next && !done {
                  Text(verbatim: steelsetL("Na řadě", "Up next"))
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(steelsetBg)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Capsule().fill(steelsetAccent))
                }
              }
              .padding(.vertical, 10)
            }
          }
          Spacer(minLength: 0)
          SteelsetStreakLine(streak: streak, extra: "\(fmtInt(week.volume)) \(unit) \(steelsetL("tento týden", "this week"))")
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      }
    }
    .widgetURL(URL(string: "steelset://plany"))
    .steelsetWidgetBackground(steelsetBg, padded: true)
  }
}

struct SteelsetPlansWidget: Widget {
  let kind = "SteelsetPlans"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: SteelsetProvider()) { entry in
      SteelsetPlansView(entry: entry)
    }
    .configurationDisplayName(steelsetL("Plány tento týden", "Plans this week"))
    .description(steelsetL("Které plány už tento týden máš za sebou a který je na řadě.", "Which plans you have done this week and which one is up next."))
    .supportedFamilies([.systemLarge])
  }
}

// MARK: - 16 · Série po partiích (střední)

struct SteelsetMusclesView: View {
  let entry: SteelsetEntry

  var body: some View {
    let rows = steelsetTopMuscles(entry.snapshot?.recent ?? [], now: entry.date)
    let top = rows.first?.sets ?? 1
    Group {
      if rows.isEmpty {
        SteelsetEmpty(caption: steelsetL("SÉRIE PO PARTIÍCH · 7 DNÍ", "SETS BY MUSCLE · 7 DAYS"), hint: entry.snapshot == nil ? steelsetOpenHint : steelsetL("Za posledních sedm dní žádné série.", "No sets in the last seven days."))
      } else {
        VStack(alignment: .leading, spacing: 5) {
          SteelsetCaption(text: steelsetL("SÉRIE PO PARTIÍCH · 7 DNÍ", "SETS BY MUSCLE · 7 DAYS"))
            .padding(.bottom, 2)
          ForEach(rows, id: \.name) { m in
            HStack(spacing: 8) {
              Text(verbatim: steelsetMuscle(m.name))
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
                .frame(width: 78, alignment: .leading)
              GeometryReader { geo in
                ZStack(alignment: .leading) {
                  Capsule().fill(steelsetTrack)
                  Capsule()
                    .fill(steelsetZoneColor(m.sets))
                    .frame(width: max(4, geo.size.width * CGFloat(m.sets / top)))
                }
              }
              .frame(height: 8)
              Text(verbatim: fmtSets(m.sets))
                .font(.system(size: 12, weight: .semibold).monospacedDigit())
                .foregroundColor(steelsetDim)
                .frame(width: 28, alignment: .trailing)
            }
          }
          Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      }
    }
    .widgetURL(URL(string: "steelset://muscle-map"))
    .steelsetWidgetBackground(steelsetBg, padded: true)
  }
}

struct SteelsetMusclesWidget: Widget {
  let kind = "SteelsetMuscles"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: SteelsetProvider()) { entry in
      SteelsetMusclesView(entry: entry)
    }
    .configurationDisplayName(steelsetL("Série po partiích", "Sets by muscle"))
    .description(steelsetL("Kolik sérií dostala která partie za posledních sedm dní, barvy jako na svalové mapě.", "How many sets each muscle got in the last seven days, colored like the muscle map."))
    .supportedFamilies([.systemMedium])
  }
}

// MARK: - Skupiny pro WidgetBundle

// WidgetBundle v jednom bloku unese jen omezený počet widgetů, proto jsou domovské widgety
// rozdělené do dvou skupin a hlavní bundle v index.swift je skládá přes `.body`.
struct SteelsetHomeWidgetsA: WidgetBundle {
  var body: some Widget {
    SteelsetWeekWidget()
    SteelsetGoalWidget()
    SteelsetLastWidget()
    SteelsetCalendarWidget()
  }
}

struct SteelsetHomeWidgetsB: WidgetBundle {
  var body: some Widget {
    SteelsetWeightWidget()
    SteelsetPlansWidget()
    SteelsetMusclesWidget()
  }
}
