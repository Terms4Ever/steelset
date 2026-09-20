import { Routine, SetEntry, Workout } from '@/data/types';
import { deleteExerciseWarning, exerciseUsage, isExerciseUsed } from '@/lib/exerciseUsage';

const set = (): SetEntry => ({ type: 'R', weight: 60, reps: 10, done: true });
const workout = (id: string, exerciseIds: string[]): Workout => ({
  id,
  name: 'Trénink',
  startedAt: 0,
  exercises: exerciseIds.map((exerciseId) => ({ exerciseId, sets: [set()] })),
});
const routine = (id: string, exerciseIds: string[]): Routine => ({
  id,
  name: 'Plán',
  exercises: exerciseIds.map((exerciseId) => ({ exerciseId, targetSets: 3, targetReps: 8 })),
});

describe('exerciseUsage', () => {
  it('nepoužitý cvik nemá žádný výskyt', () => {
    const u = exerciseUsage('drep', [workout('w1', ['bench'])], [routine('r1', ['bench'])]);
    expect(u).toEqual({ workouts: 0, routines: 0, inTrash: false });
    expect(isExerciseUsed(u)).toBe(false);
  });

  it('spočítá tréninky i plány, ve kterých cvik je', () => {
    const u = exerciseUsage(
      'bench',
      [workout('w1', ['bench', 'drep']), workout('w2', ['drep']), workout('w3', ['bench'])],
      [routine('r1', ['bench']), routine('r2', ['drep'])],
    );
    expect(u.workouts).toBe(2);
    expect(u.routines).toBe(1);
    expect(isExerciseUsed(u)).toBe(true);
  });

  it('cvik jen v koši se pořád počítá jako použitý, koš jde obnovit', () => {
    const u = exerciseUsage('bench', [], [], [workout('t1', ['bench'])]);
    expect(u).toEqual({ workouts: 0, routines: 0, inTrash: true });
    expect(isExerciseUsed(u)).toBe(true);
  });

  it('stejný cvik dvakrát v jednom tréninku je jeden trénink', () => {
    const u = exerciseUsage('bench', [workout('w1', ['bench', 'bench'])], []);
    expect(u.workouts).toBe(1);
  });
});

describe('deleteExerciseWarning', () => {
  it('u nepoužitého cviku říká, že se smaže', () => {
    const text = deleteExerciseWarning('Drep', exerciseUsage('drep', [], []));
    expect(text).toContain('smaže');
    expect(text).not.toContain('přestane nabízet');
  });

  it('u použitého cviku říká, že se jen přestane nabízet, a vyjmenuje kde je', () => {
    const u = exerciseUsage('bench', [workout('w1', ['bench'])], [routine('r1', ['bench'])]);
    const text = deleteExerciseWarning('Bench press', u);
    expect(text).toContain('přestane nabízet');
    expect(text).toContain('1 tréninku');
    expect(text).toContain('1 plánu');
  });

  it('skloňuje podle počtu', () => {
    const many = exerciseUsage('bench', [workout('a', ['bench']), workout('b', ['bench']), workout('c', ['bench'])], []);
    expect(deleteExerciseWarning('Bench', many)).toContain('3 trénincích');
    const lots = exerciseUsage(
      'bench',
      ['a', 'b', 'c', 'd', 'e'].map((i) => workout(i, ['bench'])),
      [],
    );
    expect(deleteExerciseWarning('Bench', lots)).toContain('5 trénincích');
  });
});
