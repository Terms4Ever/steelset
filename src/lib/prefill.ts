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
 * Build a logged exercise for a routine entry, pre-filled from last session.
 * Auto-progress: if enabled and every set last time hit the rep target, bump the
 * working weight by `increment` and reset reps to the target.
 */
export function buildPrefilledExercise(
  re: RoutineExercise,
  workouts: Workout[],
  autoProgress: boolean,
  increment: number,
): LoggedExercise {
  const prev = lastPerformance(workouts, re.exerciseId);
  let bumpWeight: number | null = null;
  if (autoProgress && prev && prev.length > 0) {
    const allHitTarget = prev.every((s) => (s.reps ?? 0) >= re.targetReps);
    const topWeight = Math.max(...prev.map((s) => s.weight ?? 0));
    if (allHitTarget && topWeight > 0) bumpWeight = topWeight + increment;
  }
  const sets: SetEntry[] = [];
  for (let i = 0; i < re.targetSets; i++) {
    const p = prev?.[i];
    sets.push({
      type: 'R',
      weight: bumpWeight ?? p?.weight ?? null,
      reps: bumpWeight ? re.targetReps : (p?.reps ?? re.targetReps),
      done: false,
    });
  }
  return { exerciseId: re.exerciseId, sets };
}
