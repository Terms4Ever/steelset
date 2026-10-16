import { Routine, Workout } from '@/data/types';
import { t } from '@/i18n';

/**
 * Kde všude cvik leží. Podle toho se pozná, jestli se dá smazat natvrdo, nebo se musí jen schovat.
 *
 * Odcvičený trénink si drží jen `exerciseId`. Kdyby cvik z katalogu zmizel, detail tréninku by místo
 * názvu ukázal „Cvik" a jeho objem by vypadl ze svalové mapy, protože výpočty neznámý cvik přeskočí.
 * Proto se maže natvrdo jen cvik, na který nic neodkazuje.
 */
export type ExerciseUsage = {
  /** Počet odcvičených i rozdělaných tréninků, které cvik obsahují. */
  workouts: number;
  /** Počet plánů, které cvik obsahují. */
  routines: number;
  /** Leží cvik i v koši? Ten se dá obnovit, takže se počítá jako použití. */
  inTrash: boolean;
};

export function exerciseUsage(
  id: string,
  workouts: Workout[],
  routines: Routine[],
  trashed: Workout[] = [],
): ExerciseUsage {
  const inWorkout = (w: Workout) => w.exercises.some((le) => le.exerciseId === id);
  return {
    workouts: workouts.filter(inWorkout).length,
    routines: routines.filter((r) => r.exercises.some((re) => re.exerciseId === id)).length,
    inTrash: trashed.some(inWorkout),
  };
}

/** Je cvik někde použitý? Použitý cvik se smí jen schovat, jinak by se ztratila historie. */
export function isExerciseUsed(u: ExerciseUsage): boolean {
  return u.workouts > 0 || u.routines > 0 || u.inTrash;
}

/**
 * Věta do potvrzovacího dialogu. Říká, co se stane, ne co se smaže - u použitého cviku se totiž
 * nemaže nic, jen se přestane nabízet.
 */
export function deleteExerciseWarning(name: string, u: ExerciseUsage): string {
  const x = t().exercises;
  const parts: string[] = [];
  if (u.workouts > 0) parts.push(x.inWorkouts(u.workouts));
  if (u.routines > 0) parts.push(x.inRoutines(u.routines));
  if (!parts.length && !u.inTrash) return x.deleteUnused(name);
  return x.deleteUsed(name, parts.length ? x.isIn(parts) : x.inTrash);
}
