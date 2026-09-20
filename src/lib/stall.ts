import { SetEntry, Workout } from '@/data/types';

/**
 * Zaseknutí na váze.
 *
 * Plán už váhu sám nenavyšuje (dřív to dělal `buildPrefilledExercise`). Místo toho
 * appka pozná, že se uživatel na nějaké váze zasekl, a nabídne mu zvýšení. Rozhodnutí
 * o váze tak zůstává na něm a předvyplnění nikdy nelže o tom, co minule zvedl.
 */

/** Kolik tréninků po sobě musí stát na stejné váze, aby se to počítalo za zaseknutí. */
export const STALL_SESSIONS = 3;

export type Stall = {
  /** Váha, na které to stojí (celková, v kg - jako všude ve `SetEntry.weight`). */
  weightKg: number;
  /** Kolik tréninků po sobě na ní stojí. */
  sessions: number;
  /** Navrhovaná vyšší váha. */
  nextKg: number;
};

/** Pracovní série = hotová, nezahřívací a se zapsanými opakováními. */
function workingSets(sets: SetEntry[]): SetEntry[] {
  return sets.filter((s) => s.done && s.type !== 'W' && !!s.reps && s.reps > 0);
}

/**
 * Nejtěžší pracovní série tréninku: váha a nejlepší počet opakování na ní.
 * Vrací null, když cvik nemá váhu (kliky) nebo v tom tréninku nic hotového není.
 */
function topSet(sets: SetEntry[]): { weightKg: number; reps: number } | null {
  const working = workingSets(sets).filter((s) => s.weight != null && s.weight > 0);
  if (!working.length) return null;
  const weightKg = Math.max(...working.map((s) => s.weight!));
  const reps = Math.max(...working.filter((s) => s.weight === weightKg).map((s) => s.reps!));
  return { weightKg, reps };
}

/** Nejtěžší série cviku v posledních trénincích, od nejnovějšího. */
function recentTopSets(
  workouts: Workout[],
  exerciseId: string,
  limit: number,
  excludeWorkoutId?: string,
): { weightKg: number; reps: number }[] {
  const out: { weightKg: number; reps: number }[] = [];
  const finished = workouts
    .filter((w) => w.finishedAt && w.id !== excludeWorkoutId)
    .sort((a, b) => b.finishedAt! - a.finishedAt!);
  for (const w of finished) {
    const le = w.exercises.find((x) => x.exerciseId === exerciseId);
    if (!le) continue;
    const top = topSet(le.sets);
    if (top) out.push(top);
    if (out.length === limit) break;
  }
  return out;
}

/**
 * Pozná zaseknutí: stejná nejtěžší pracovní váha ve `sessions` trénincích po sobě
 * a opakování se za tu dobu nezlepšila.
 *
 * Nezlepšila = nejlepší série v posledním tréninku nemá víc opakování než nejlepší
 * série v tom nejstarším ze sledovaných. Drobné kolísání mezi nimi se toleruje,
 * protože se porovnávají jen krajní tréninky - jeden slabší den tak nabídku nezdrží.
 * Jakmile uživatel přidá opakování, zaseknutí končí samo.
 */
export function detectStall(
  workouts: Workout[],
  exerciseId: string,
  increment: number,
  opts: { sessions?: number; excludeWorkoutId?: string } = {},
): Stall | null {
  const sessions = Math.max(2, opts.sessions ?? STALL_SESSIONS);
  if (!(increment > 0)) return null;
  const tops = recentTopSets(workouts, exerciseId, sessions, opts.excludeWorkoutId);
  if (tops.length < sessions) return null;
  const weightKg = tops[0].weightKg;
  if (!tops.every((t) => t.weightKg === weightKg)) return null;
  // tops[0] je nejnovější, tops[sessions - 1] nejstarší ze sledovaných
  if (tops[0].reps > tops[sessions - 1].reps) return null;
  return { weightKg, sessions, nextKg: weightKg + increment };
}
