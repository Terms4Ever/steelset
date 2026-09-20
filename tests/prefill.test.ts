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

describe('buildPrefilledExercise', () => {
  const re = { exerciseId: 'squat', targetSets: 3, targetReps: 5 };

  it('zopakuje poslední výkon a váhu nenavyšuje', () => {
    const ws = [workout('w1', 10_000, 'squat', [done(100, 5), done(100, 5), done(100, 5)])];
    const le = buildPrefilledExercise(re, ws);
    expect(le.sets).toHaveLength(3);
    expect(le.sets.every((s) => s.weight === 100)).toBe(true);
    expect(le.sets.every((s) => s.reps === 5)).toBe(true);
  });

  it('nenavýší ani po splnění cíle ve všech sériích', () => {
    const ws = [workout('w1', 10_000, 'squat', [done(120, 8), done(120, 8)])];
    const le = buildPrefilledExercise({ ...re, targetReps: 8 }, ws);
    expect(le.sets[0].weight).toBe(120);
  });

  it('bez historie doplní cílová opakování a prázdnou váhu', () => {
    const le = buildPrefilledExercise(re, []);
    expect(le.sets).toHaveLength(3);
    expect(le.sets[0]).toMatchObject({ weight: null, reps: 5 });
  });

  it('série bez předlohy dostane cílová opakování', () => {
    const ws = [workout('w1', 10_000, 'squat', [done(100, 5)])];
    const le = buildPrefilledExercise(re, ws);
    expect(le.sets[1]).toMatchObject({ weight: null, reps: 5 });
  });

  it('supersérii z plánu přenese dál', () => {
    const le = buildPrefilledExercise({ ...re, supersetGroup: 'ss1' }, []);
    expect(le.supersetGroup).toBe('ss1');
  });
});
