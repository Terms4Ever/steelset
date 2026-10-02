import type { Exercise, Workout } from '@/data/types';

/**
 * Co telefon posílá hodinkám (#15). Tvar čte `WorkoutManager.applyPhoneState` v
 * `targets/watch/WorkoutManager.swift`, klíče se musí shodovat (hlídá to test).
 */
export type WatchState = {
  active: boolean;
  workoutId: string;
  name: string;
  /** Konec odpočinku v ms, 0 = neodpočívá se. */
  restEndAt: number;
  /** „Bench press 4/4", prázdné, když už není co cvičit. */
  next: string;
  /** Jen u konce: trénink se v telefonu zahodil, hodinky ho neuloží. */
  discard: boolean;
  /** Kdy telefon stav poslal (ms). Hodinky podle něj zahodí starý konec z minulého tréninku. */
  at: number;
};

/** Spouštět hodinky jen u živého tréninku, ne u zpětného zápisu ani úpravy starého. */
export function startsWatch(w: Workout | undefined, now: number): boolean {
  if (!w || w.manual || w.finishedAt != null || w.editEndAt != null) return false;
  // po restartu telefonu se nespouští trénink, který začal před víc než 12 hodinami
  return now - w.startedAt < 12 * 60 * 60 * 1000;
}

/** Další nedokončená série: název cviku a její pořadí, jako v náhledu na hodinkách. */
export function nextSetLabel(w: Workout, exById: Record<string, Exercise | undefined>): string {
  for (const le of w.exercises) {
    const idx = le.sets.findIndex((s) => !s.done);
    if (idx === -1) continue;
    const name = exById[le.exerciseId]?.name ?? 'Cvik';
    return `${name} ${idx + 1}/${le.sets.length}`;
  }
  return '';
}

export function runningState(
  w: Workout,
  restEndAt: number | null,
  exById: Record<string, Exercise | undefined>,
  now: number,
): WatchState {
  return {
    active: true,
    workoutId: w.id,
    name: w.name,
    restEndAt: restEndAt != null && restEndAt > now ? restEndAt : 0,
    next: nextSetLabel(w, exById),
    discard: false,
    at: now,
  };
}

export function endedState(workoutId: string, discard: boolean, now: number): WatchState {
  return { active: false, workoutId, name: '', restEndAt: 0, next: '', discard, at: now };
}
