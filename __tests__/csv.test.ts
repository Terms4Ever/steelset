import { Exercise, Workout } from '@/data/types';
import { workoutsToCsv } from '@/lib/csv';

const exById: Record<string, Exercise> = {
  squat: { id: 'squat', name: 'Dřep s činkou', primary: 'Nohy', equipment: 'Činka', tracking: 'weight_reps' },
};

describe('workoutsToCsv', () => {
  it('produces a header + one row per set, sorted by date', () => {
    const ws: Workout[] = [
      {
        id: 'w1',
        name: 'Push A',
        startedAt: 0,
        finishedAt: new Date('2026-06-20T10:00:00Z').getTime(),
        exercises: [{ exerciseId: 'squat', sets: [{ type: 'R', weight: 100, reps: 5, done: true }] }],
      },
    ];
    const csv = workoutsToCsv(ws, exById);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('Datum;Trénink;Cvik');
    expect(lines[1]).toContain('2026-06-20');
    expect(lines[1]).toContain('Dřep s činkou');
    expect(lines[1]).toContain('100');
  });

  it('skips unfinished workouts and escapes special chars', () => {
    const ws: Workout[] = [
      { id: 'a', name: 'Probíhá', startedAt: 0, exercises: [{ exerciseId: 'squat', sets: [{ type: 'R', weight: 1, reps: 1, done: true }] }] },
      {
        id: 'b',
        name: 'Push; A',
        startedAt: 0,
        finishedAt: 10_000,
        exercises: [{ exerciseId: 'squat', sets: [{ type: 'R', weight: 80, reps: 5, done: true }] }],
      },
    ];
    const csv = workoutsToCsv(ws, exById);
    expect(csv).not.toContain('Probíhá');
    expect(csv).toContain('"Push; A"'); // semicolon field quoted
  });
});
