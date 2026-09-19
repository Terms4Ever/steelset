import { Routine, RoutineExercise, SetEntry, Workout } from '@/data/types';

/** Názvy, které nic neříkají - plán z nich dostane vlastní pracovní název. */
const GENERIC_NAMES = ['Rychlý trénink', 'Zápis tréninku'];

/** Pracovní série = hotová a nezahřívací. Plán se staví jen z nich. */
function workingSets(sets: SetEntry[]): SetEntry[] {
  return sets.filter((s) => s.done && s.type !== 'W');
}

/**
 * Nejčastější počet opakování z pracovních sérií. Při shodě vyhrává vyšší číslo, ať plán
 * nesklouzne dolů kvůli jedné slabší sérii. U časových cviků je ve stejném poli počet sekund.
 */
export function commonReps(sets: SetEntry[], fallback = 8): number {
  const counts = new Map<number, number>();
  sets.forEach((s) => {
    if (s.reps != null && s.reps > 0) counts.set(s.reps, (counts.get(s.reps) ?? 0) + 1);
  });
  if (counts.size === 0) return fallback;
  let best = fallback;
  let bestCount = 0;
  counts.forEach((count, reps) => {
    if (count > bestCount || (count === bestCount && reps > best)) {
      best = reps;
      bestCount = count;
    }
  });
  return best;
}

/**
 * Převod odcvičeného tréninku na plán: stejné cviky ve stejném pořadí, počty sérií a opakování
 * podle toho, co uživatel doopravdy odcvičil.
 *
 * Váhy se do plánu neukládají schválně - při spuštění je předvyplní `buildPrefilledExercise`
 * z posledního výkonu, takže plán nezastarává. Automatická progrese je vypnutá, plán vzniklý
 * ze skutečného tréninku nemá co navyšovat.
 */
export function workoutToRoutine(w: Workout): Omit<Routine, 'id'> {
  const exercises: RoutineExercise[] = w.exercises
    .map((le) => ({ le, sets: workingSets(le.sets) }))
    .filter(({ sets }) => sets.length > 0)
    .map(({ le, sets }) => ({
      exerciseId: le.exerciseId,
      targetSets: sets.length,
      targetReps: commonReps(sets),
      ...(le.supersetGroup ? { supersetGroup: le.supersetGroup } : {}),
    }));
  const name = w.name.trim();
  return {
    name: !name || GENERIC_NAMES.includes(name) ? 'Nový plán' : name,
    autoProgress: false,
    exercises,
  };
}

/** Má trénink z čeho plán postavit? (Import z Health bez sérií nemá.) */
export function canMakeRoutine(w: Workout): boolean {
  return w.exercises.some((le) => workingSets(le.sets).length > 0);
}
