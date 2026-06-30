import { Exercise, Workout } from '@/data/types';

/** Clean, importable CSV of full workout history (data ownership - no lock-in). */
export function workoutsToCsv(workouts: Workout[], exercisesById: Record<string, Exercise>): string {
  const rows: string[] = ['Datum;Trénink;Cvik;Série;Typ;Váha (kg);Opakování;RPE'];
  const finished = [...workouts].filter((w) => w.finishedAt).sort((a, b) => a.finishedAt! - b.finishedAt!);
  for (const w of finished) {
    const date = new Date(w.finishedAt!).toISOString().slice(0, 10);
    for (const le of w.exercises) {
      const name = exercisesById[le.exerciseId]?.name ?? le.exerciseId;
      le.sets.forEach((s, i) => {
        rows.push(
          [
            date,
            csvField(w.name),
            csvField(name),
            i + 1,
            s.type,
            s.weight ?? '',
            s.reps ?? '',
            s.rpe ?? '',
          ].join(';'),
        );
      });
    }
  }
  return rows.join('\n');
}

function csvField(v: string): string {
  if (/[;"\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}
