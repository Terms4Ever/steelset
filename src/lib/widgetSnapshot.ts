import { Exercise, Routine, Unit, Workout } from '@/data/types';
import { MS, workoutVolumeEx } from '@/lib/calc';
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
 * Snímek nese syrová data, ne hotová čísla. „Tento týden" je v aplikaci klouzavých sedm dní, takže
 * by hotový součet do druhého dne zastaral, i když aplikaci nikdo neotevře. Widget si okno
 * dopočítá sám z `recent` v okamžiku vykreslení, stejně jako obrazovka Pokrok.
 */
export const WIDGET_APP_GROUP = 'group.cz.setly.app';
export const WIDGET_SNAPSHOT_KEY = 'widgetSnapshot';
export const WIDGET_SNAPSHOT_VERSION = 1;

/** Kolik dní dozadu snímek nese tréninky. Týden stačí na okno, druhý je rezerva na zastaralý snímek. */
const RECENT_DAYS = 14;
/** Strop počtu týdnů pro sérii v řadě, ať snímek po letech nenaroste. */
const MAX_STREAK_WEEKS = 200;

export type WidgetSnapshot = {
  v: number;
  unit: Unit;
  /** Dokončené tréninky za posledních 14 dní, nejnovější první. `volume` je už v jednotce uživatele. */
  recent: { at: number; volume: number }[];
  /**
   * Týdny s aspoň jedním dokončeným tréninkem jako `floor(ms / týden)`, sestupně. Stejné dělení
   * jako `weekStreak` v `src/lib/calc.ts`, aby widget ukázal stejnou sérii jako Dnešek.
   */
  streakWeeks: number[];
  /** Rozdělaný živý trénink. Zpětný zápis (`manual`) nemá běžící čas, proto se tu neukazuje. */
  active: { name: string; startedAt: number } | null;
  /** Plán, který je na řadě. `null`, když žádný plán neexistuje. */
  next: { id: string; name: string; exercises: number; lastAt: number | null } | null;
};

/**
 * Plán, který je na řadě: ten, který čeká nejdéle. Nikdy necvičený má přednost a mezi nimi
 * rozhoduje pořadí v seznamu. U splitu, kde se plány střídají, to vychází na ten další.
 */
export function nextRoutine(routines: Routine[], workouts: Workout[]): { routine: Routine; lastAt: number | null } | null {
  if (!routines.length) return null;
  const last = new Map<string, number>();
  for (const w of workouts) {
    if (!w.routineId || !w.finishedAt) continue;
    const prev = last.get(w.routineId);
    if (prev == null || w.finishedAt > prev) last.set(w.routineId, w.finishedAt);
  }
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

export function buildWidgetSnapshot(
  input: {
    workouts: Workout[];
    routines: Routine[];
    activeWorkoutId: string | null;
    unit: Unit;
    exercisesById: Record<string, Exercise>;
  },
  now: number,
): WidgetSnapshot {
  const { workouts, routines, activeWorkoutId, unit, exercisesById } = input;
  const finished = workouts.filter((w) => w.finishedAt != null);

  const since = now - RECENT_DAYS * MS.DAY;
  const recent = finished
    .filter((w) => w.finishedAt! >= since && w.finishedAt! <= now)
    .sort((a, b) => b.finishedAt! - a.finishedAt!)
    .map((w) => ({
      at: w.finishedAt!,
      // zaokrouhluje se až součet (stejně jako na Pokroku), tady jen na desetinu kvůli velikosti
      volume: Math.round(toDisplayWeight(workoutVolumeEx(w, exercisesById), unit) * 10) / 10,
    }));

  const weeks = new Set<number>();
  for (const w of finished) weeks.add(Math.floor(w.finishedAt! / MS.WEEK));
  const streakWeeks = [...weeks].sort((a, b) => b - a).slice(0, MAX_STREAK_WEEKS);

  const live = activeWorkoutId ? workouts.find((w) => w.id === activeWorkoutId && !w.finishedAt) : undefined;
  const active = live && !live.manual ? { name: live.name, startedAt: live.startedAt } : null;

  const nx = nextRoutine(routines, workouts);
  const next = nx
    ? { id: nx.routine.id, name: nx.routine.name, exercises: nx.routine.exercises.length, lastAt: nx.lastAt }
    : null;

  return { v: WIDGET_SNAPSHOT_VERSION, unit, recent, streakWeeks, active, next };
}

/*
 * Referenční výpočty, které `HomeWidgets.swift` opakuje řádek po řádku. Aplikace je sama
 * nepotřebuje; jsou tu proto, aby test ověřil, že widget ukáže stejná čísla jako Dnešek
 * a Pokrok, a to i ze snímku, který mezitím zastaral.
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

/** Tréninky a objem za klouzavých sedm dní ze snímku. Stejné okno jako Pokrok. */
export function weekFromRecent(recent: WidgetSnapshot['recent'], now: number): { count: number; volume: number } {
  const from = now - MS.WEEK;
  const inWindow = recent.filter((r) => r.at >= from && r.at <= now);
  return { count: inWindow.length, volume: Math.round(inWindow.reduce((sum, r) => sum + r.volume, 0)) };
}
