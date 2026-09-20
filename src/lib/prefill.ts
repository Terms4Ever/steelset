import { LoggedExercise, RoutineExercise, SetEntry, Workout } from '@/data/types';
import { lastPerformance } from '@/lib/calc';

/** Build N empty working sets, pre-filling weight/reps from previous performance by index. */
export function prefillSets(prev: SetEntry[] | null, count: number): SetEntry[] {
  const sets: SetEntry[] = [];
  for (let i = 0; i < count; i++) {
    const p = prev?.[i];
    sets.push({ type: 'R', weight: p?.weight ?? null, reps: p?.reps ?? null, done: false });
  }
  return sets;
}

/**
 * Sestaví cvik plánu předvyplněný podle posledního výkonu.
 *
 * Váha se NENAVYŠUJE. Dřív ji plán s „automatickou progresí" sám přičítal o `increment`,
 * jenže pak předvyplnění lhalo o tom, co uživatel doopravdy zvedl, a nikdo se ho neptal.
 * Zaseknutí na váze dnes pozná `detectStall` (src/lib/stall.ts) a trénink nabídne zvýšení.
 */
export function buildPrefilledExercise(re: RoutineExercise, workouts: Workout[]): LoggedExercise {
  const prev = lastPerformance(workouts, re.exerciseId);
  const sets: SetEntry[] = [];
  for (let i = 0; i < re.targetSets; i++) {
    const p = prev?.[i];
    sets.push({ type: 'R', weight: p?.weight ?? null, reps: p?.reps ?? re.targetReps, done: false });
  }
  return { exerciseId: re.exerciseId, sets, ...(re.supersetGroup ? { supersetGroup: re.supersetGroup } : {}) };
}
