import { Workout } from '@/data/types';
import { buildPrefilledExercise, prefillSets } from '@/lib/prefill';

const done = (weight: number, reps: number) => ({ type: 'R' as const, weight, reps, done: true });
function workout(id: string, finishedAt: number, exId: string, sets: any[]): Workout {
  return { id, name: 't', startedAt: finishedAt - 1000, finishedAt, exercises: [{ exerciseId: exId, sets }] };
}

describe('prefillSets', () => {
  it('fills weight/reps from previous performance by index', () => {
    const prev = [done(100, 5), done(100, 4)];
    const sets = prefillSets(prev, 3);
    expect(sets).toHaveLength(3);
    expect(sets[0]).toMatchObject({ weight: 100, reps: 5, done: false });
    expect(sets[1]).toMatchObject({ weight: 100, reps: 4 });
    expect(sets[2]).toMatchObject({ weight: null, reps: null }); // no prev for 3rd
  });
  it('returns empty-valued sets without history', () => {
    expect(prefillSets(null, 2)).toEqual([
      { type: 'R', weight: null, reps: null, done: false },
      { type: 'R', weight: null, reps: null, done: false },
    ]);
  });
});

describe('buildPrefilledExercise auto-progress', () => {
  const re = { exerciseId: 'squat', targetSets: 3, targetReps: 5 };

  it('bumps weight by increment when all sets hit the target last time', () => {
    const ws = [workout('w1', 10_000, 'squat', [done(100, 5), done(100, 5), done(100, 5)])];
    const le = buildPrefilledExercise(re, ws, true, 2.5);
    expect(le.sets).toHaveLength(3);
    expect(le.sets.every((s) => s.weight === 102.5)).toBe(true);
    expect(le.sets.every((s) => s.reps === 5)).toBe(true);
  });

  it('does NOT bump when a set missed the target', () => {
    const ws = [workout('w1', 10_000, 'squat', [done(100, 5), done(100, 3)])];
    const le = buildPrefilledExercise(re, ws, true, 2.5);
    expect(le.sets[0].weight).toBe(100); // repeats last weight, no bump
  });

  it('does NOT bump when auto-progress is off', () => {
    const ws = [workout('w1', 10_000, 'squat', [done(100, 5), done(100, 5), done(100, 5)])];
    const le = buildPrefilledExercise(re, ws, false, 2.5);
    expect(le.sets[0].weight).toBe(100);
  });

  it('falls back to target reps with no history', () => {
    const le = buildPrefilledExercise(re, [], true, 2.5);
    expect(le.sets).toHaveLength(3);
    expect(le.sets[0]).toMatchObject({ weight: null, reps: 5 });
  });
});
