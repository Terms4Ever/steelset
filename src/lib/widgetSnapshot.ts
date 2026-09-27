import { Exercise, Routine, Unit, Workout } from '@/data/types';
import { MS, muscleSetsDetailed, SET_ZONES, workoutVolumeEx } from '@/lib/calc';
import { toDisplayWeight } from '@/lib/format';

/**
 * Data pro widgety na ploše a zamčené obrazovce (#16).
 *
 * Widget běží ve vlastním procesu a na AsyncStorage aplikace nedosáhne. Aplikace mu proto po
 * každé změně zapíše tenhle snímek jako JSON do App Group a widget si ho přečte sám.
 *
 * **Tvar musí sedět 1:1 se `struct WidgetSnapshot` v `targets/widgets/HomeWidgets.swift`.**
 * Swift ho dekóduje přes `Codable`, takže přejmenované nebo chybějící pole znamená prázdný widget
 * bez jakékoli hlášky. Když se tvar mění, zvedá se `v` a Swift se upraví ve stejné dávce.
 *
 * Snímek nese syrová data, ne hotová čísla. Klouzavé okno, kalendářní týden i měsíc se posouvají
 * s časem, takže by hotový součet zastaral, i když aplikaci nikdo neotevře. Widget si je dopočítá
 * sám v okamžiku vykreslení; referenční verze výpočtů je dole a hlídá ji test.
 */
export const WIDGET_APP_GROUP = 'group.cz.setly.app';
export const WIDGET_SNAPSHOT_KEY = 'widgetSnapshot';
export const WIDGET_SNAPSHOT_VERSION = 2;

/** Kolik dní dozadu snímek nese tréninky. Šest týdnů pokryje vždy celý aktuální měsíc pro kalendář. */
const RECENT_DAYS = 42;
/** Strop počtu týdnů pro sérii v řadě, ať snímek po letech nenaroste. */
const MAX_STREAK_WEEKS = 200;
/** Kolik plánů se vejde do velkého widgetu. */
const MAX_ROUTINES = 4;
/** Okno pro trend tělesné váhy. */
const WEIGHT_DAYS = 30;

export type WidgetSnapshot = {
  v: number;
  unit: Unit;
  /**
   * Dokončené tréninky za posledních 42 dní, nejnovější první. `volume` je už v jednotce uživatele,
   * `sets` jsou tvrdé série po partiích (vedlejší partie za půl), stejně jako na svalové mapě.
   */
  recent: { at: number; volume: number; sets: Record<string, number> }[];
  /** Týdny s tréninkem jako `floor(ms / týden)`, sestupně. Stejné dělení jako `weekStreak`. */
  streakWeeks: number[];
  /** Týdenní cíl v počtu tréninků, 0 = uživatel si ho nenastavil. */
  goal: number;
  /** Poslední dokončený trénink. */
  last: { id: string; name: string; at: number; volume: number; minutes: number; avgHr: number | null } | null;
  /** Plány v pořadí ze seznamu, nejvýš čtyři; ten na řadě je vždy mezi nimi. */
  routines: { id: string; name: string; exercises: number; lastAt: number | null }[];
  /** Id plánu, který je na řadě. */
  next: string | null;
  /** Vážení za posledních 30 dní v jednotce uživatele, nejstarší první. Prázdné bez Apple Health. */
  weight: { at: number; value: number }[];
};

/**
 * Plán, který je na řadě: ten, který čeká nejdéle. Nikdy necvičený má přednost a mezi nimi
 * rozhoduje pořadí v seznamu. U splitu, kde se plány střídají, to vychází na ten další.
 */
export function nextRoutine(routines: Routine[], workouts: Workout[]): { routine: Routine; lastAt: number | null } | null {
  if (!routines.length) return null;
  const last = lastByRoutine(workouts);
  let best: { routine: Routine; lastAt: number | null } | null = null;
  for (const r of routines) {
    const lastAt = last.get(r.id) ?? null;
    if (!best) {
      best = { routine: r, lastAt };
      continue;
    }
    // nikdy necvičený vyhrává; mezi dvěma necvičenými zůstává první v seznamu
    if (best.lastAt == null) continue;
    if (lastAt == null || lastAt < best.lastAt) best = { routine: r, lastAt };
  }
  return best;
}

function lastByRoutine(workouts: Workout[]): Map<string, number> {
  const last = new Map<string, number>();
  for (const w of workouts) {
    if (!w.routineId || !w.finishedAt) continue;
    const prev = last.get(w.routineId);
    if (prev == null || w.finishedAt > prev) last.set(w.routineId, w.finishedAt);
  }
  return last;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function buildWidgetSnapshot(
  input: {
    workouts: Workout[];
    routines: Routine[];
    unit: Unit;
    weeklyGoal: number;
    bodyweightLog: { at: number; kg: number }[];
    exercisesById: Record<string, Exercise>;
  },
  now: number,
): WidgetSnapshot {
  const { workouts, routines, unit, weeklyGoal, bodyweightLog, exercisesById } = input;
  const finished = workouts.filter((w) => w.finishedAt != null).sort((a, b) => b.finishedAt! - a.finishedAt!);

  const since = now - RECENT_DAYS * MS.DAY;
  const recent = finished
    .filter((w) => w.finishedAt! >= since && w.finishedAt! <= now)
    .map((w) => {
      const sets: Record<string, number> = {};
      for (const [muscle, n] of Object.entries(muscleSetsDetailed([w], exercisesById))) sets[muscle] = round1(n);
      // zaokrouhluje se až součet (stejně jako na Pokroku), tady jen na desetinu kvůli velikosti
      return { at: w.finishedAt!, volume: round1(toDisplayWeight(workoutVolumeEx(w, exercisesById), unit)), sets };
    });

  const weeks = new Set<number>();
  for (const w of finished) weeks.add(Math.floor(w.finishedAt! / MS.WEEK));
  const streakWeeks = [...weeks].sort((a, b) => b - a).slice(0, MAX_STREAK_WEEKS);

  const lw = finished[0];
  const last = lw
    ? {
        id: lw.id,
        name: lw.name,
        at: lw.finishedAt!,
        volume: Math.round(toDisplayWeight(workoutVolumeEx(lw, exercisesById), unit)),
        minutes: Math.max(0, Math.round((lw.finishedAt! - lw.startedAt) / 60_000)),
        avgHr: lw.avgHr != null ? Math.round(lw.avgHr) : null,
      }
    : null;

  const nx = nextRoutine(routines, workouts);
  const lastAt = lastByRoutine(workouts);
  let shown = routines.slice(0, MAX_ROUTINES);
  // plán na řadě musí být vidět, i když je v seznamu až pátý
  if (nx && !shown.some((r) => r.id === nx.routine.id)) shown = [...shown.slice(0, MAX_ROUTINES - 1), nx.routine];

  const weightSince = now - WEIGHT_DAYS * MS.DAY;
  const weight = bodyweightLog
    .filter((w) => w.at >= weightSince && w.at <= now)
    .sort((a, b) => a.at - b.at)
    .map((w) => ({ at: w.at, value: round1(toDisplayWeight(w.kg, unit)) }));

  return {
    v: WIDGET_SNAPSHOT_VERSION,
    unit,
    recent,
    streakWeeks,
    goal: Math.max(0, Math.round(weeklyGoal || 0)),
    last,
    routines: shown.map((r) => ({ id: r.id, name: r.name, exercises: r.exercises.length, lastAt: lastAt.get(r.id) ?? null })),
    next: nx ? nx.routine.id : null,
    weight,
  };
}

/*
 * Referenční výpočty, které `HomeWidgets.swift` opakuje řádek po řádku. Aplikace je sama
 * nepotřebuje; jsou tu proto, aby test ověřil, že widget ukáže stejná čísla jako aplikace,
 * a to i ze snímku, který mezitím zastaral.
 */

/** Série v řadě ze snímku. Stejný algoritmus jako `weekStreak` v `src/lib/calc.ts`. */
export function streakFromWeeks(streakWeeks: number[], now: number): number {
  if (!streakWeeks.length) return 0;
  const weeks = new Set(streakWeeks);
  const thisWeek = Math.floor(now / MS.WEEK);
  let cursor = weeks.has(thisWeek) ? thisWeek : thisWeek - 1;
  let streak = 0;
  while (weeks.has(cursor)) {
    streak++;
    cursor--;
  }
  return streak;
}

/** Tréninky a objem za klouzavých sedm dní. Stejné okno jako Pokrok („Tento týden"). */
export function weekFromRecent(recent: WidgetSnapshot['recent'], now: number): { count: number; volume: number } {
  const from = now - MS.WEEK;
  const inWindow = recent.filter((r) => r.at >= from && r.at <= now);
  return { count: inWindow.length, volume: Math.round(inWindow.reduce((sum, r) => sum + r.volume, 0)) };
}

/**
 * Začátek kalendářního týdne (pondělí 00:00 místního času). Cíl se počítá po týdnech od pondělí,
 * aby se v pondělí vynuloval, jak se od cíle čeká; klouzavé okno by jen pomalu odtékalo.
 */
export function weekStartMonday(now: number): number {
  const d = new Date(now);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Kolik tréninků je hotových v tomhle kalendářním týdnu. */
export function goalDone(recent: WidgetSnapshot['recent'], now: number): number {
  const from = weekStartMonday(now);
  return recent.filter((r) => r.at >= from && r.at <= now).length;
}

/** Dny aktuálního měsíce (1 až 31), ve kterých byl aspoň jeden trénink. */
export function trainedDaysThisMonth(recent: WidgetSnapshot['recent'], now: number): number[] {
  const n = new Date(now);
  const days = new Set<number>();
  for (const r of recent) {
    const d = new Date(r.at);
    if (d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && r.at <= now) days.add(d.getDate());
  }
  return [...days].sort((a, b) => a - b);
}

/** Počet tréninků v aktuálním měsíci. */
export function workoutsThisMonth(recent: WidgetSnapshot['recent'], now: number): number {
  const n = new Date(now);
  return recent.filter((r) => {
    const d = new Date(r.at);
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && r.at <= now;
  }).length;
}

export type MuscleZone = 'low' | 'optimum' | 'high' | 'overload';

/** Stejné hranice jako `setZone` pro svalovou mapu, jen bez „žádné", tu widget neukazuje. */
export function muscleZone(sets: number): MuscleZone {
  if (sets < SET_ZONES.maintain) return 'low';
  if (sets < SET_ZONES.optimumMax) return 'optimum';
  if (sets <= SET_ZONES.highMax) return 'high';
  return 'overload';
}

/** Pět partií s nejvíc sériemi za klouzavých sedm dní. Stejné okno i počítání jako svalová mapa. */
export function topMuscles(recent: WidgetSnapshot['recent'], now: number, limit = 5): { name: string; sets: number }[] {
  const from = now - MS.WEEK;
  const sum: Record<string, number> = {};
  for (const r of recent) {
    if (r.at < from || r.at > now) continue;
    for (const [m, n] of Object.entries(r.sets)) sum[m] = (sum[m] ?? 0) + n;
  }
  return Object.entries(sum)
    .map(([name, sets]) => ({ name, sets: round1(sets) }))
    .filter((m) => m.sets > 0)
    .sort((a, b) => b.sets - a.sets || a.name.localeCompare(b.name, 'cs'))
    .slice(0, limit);
}

/** Poslední vážení a změna proti prvnímu v okně. `null` bez dat. */
export function weightTrend(weight: WidgetSnapshot['weight']): { value: number; change: number | null } | null {
  if (!weight.length) return null;
  const lastW = weight[weight.length - 1];
  return { value: lastW.value, change: weight.length > 1 ? round1(lastW.value - weight[0].value) : null };
}
