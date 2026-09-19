import { SetEntry, Workout } from '@/data/types';
import { canMakeRoutine, commonReps, workoutToRoutine } from '@/lib/routineFromWorkout';

const set = (p: Partial<SetEntry> = {}): SetEntry => ({ type: 'R', weight: 60, reps: 10, done: true, ...p });
const workout = (p: Partial<Workout> = {}): Workout => ({
  id: 'w1',
  name: 'Push A',
  startedAt: 1_700_000_000_000,
  finishedAt: 1_700_003_600_000,
  exercises: [],
  ...p,
});

describe('commonReps', () => {
  it('bere nejčastější počet opakování', () => {
    expect(commonReps([set({ reps: 10 }), set({ reps: 10 }), set({ reps: 8 })])).toBe(10);
  });
  it('při shodě vyhrává vyšší', () => {
    expect(commonReps([set({ reps: 12 }), set({ reps: 8 })])).toBe(12);
  });
  it('bez opakování vrací náhradní hodnotu', () => {
    expect(commonReps([set({ reps: null })])).toBe(8);
  });
});

describe('workoutToRoutine', () => {
  it('zachová cviky i jejich pořadí', () => {
    const r = workoutToRoutine(
      workout({
        exercises: [
          { exerciseId: 'squat', sets: [set(), set(), set()] },
          { exerciseId: 'bench-barbell', sets: [set(), set()] },
        ],
      }),
    );
    expect(r.exercises.map((e) => e.exerciseId)).toEqual(['squat', 'bench-barbell']);
    expect(r.exercises.map((e) => e.targetSets)).toEqual([3, 2]);
  });

  it('zahřívací série se do počtu nepočítají', () => {
    const r = workoutToRoutine(
      workout({ exercises: [{ exerciseId: 'squat', sets: [set({ type: 'W', reps: 12 }), set(), set()] }] }),
    );
    expect(r.exercises[0].targetSets).toBe(2);
    expect(r.exercises[0].targetReps).toBe(10);
  });

  it('nedokončené série se nepočítají a cvik bez hotové série vypadne', () => {
    const r = workoutToRoutine(
      workout({
        exercises: [
          { exerciseId: 'squat', sets: [set(), set({ done: false })] },
          { exerciseId: 'bench-barbell', sets: [set({ done: false }), set({ done: false })] },
        ],
      }),
    );
    expect(r.exercises).toHaveLength(1);
    expect(r.exercises[0]).toMatchObject({ exerciseId: 'squat', targetSets: 1 });
  });

  it('váhy se do plánu neukládají a progrese je vypnutá', () => {
    const r = workoutToRoutine(workout({ exercises: [{ exerciseId: 'squat', sets: [set({ weight: 180 })] }] }));
    expect(r.autoProgress).toBe(false);
    expect(JSON.stringify(r)).not.toContain('180');
  });

  it('obecný název tréninku nahradí pracovním názvem plánu', () => {
    const ex = [{ exerciseId: 'squat', sets: [set()] }];
    expect(workoutToRoutine(workout({ name: 'Rychlý trénink', exercises: ex })).name).toBe('Nový plán');
    expect(workoutToRoutine(workout({ name: 'Zápis tréninku', exercises: ex })).name).toBe('Nový plán');
    expect(workoutToRoutine(workout({ name: 'Nohy těžké', exercises: ex })).name).toBe('Nohy těžké');
  });

  it('supersérie se přenese do plánu', () => {
    const r = workoutToRoutine(
      workout({
        exercises: [
          { exerciseId: 'squat', sets: [set()], supersetGroup: 'ss1' },
          { exerciseId: 'leg-curl', sets: [set()], supersetGroup: 'ss1' },
        ],
      }),
    );
    expect(r.exercises[0].supersetGroup).toBe('ss1');
    expect(r.exercises[1].supersetGroup).toBe('ss1');
  });

  it('časový cvik si nese sekundy ve stejném poli', () => {
    const r = workoutToRoutine(
      workout({ exercises: [{ exerciseId: 'plank', sets: [set({ weight: null, reps: 60 }), set({ weight: null, reps: 60 })] }] }),
    );
    expect(r.exercises[0]).toMatchObject({ targetSets: 2, targetReps: 60 });
  });
});

describe('canMakeRoutine', () => {
  it('trénink z Health bez sérií plán nedá', () => {
    expect(canMakeRoutine(workout({ exercises: [], source: 'health' }))).toBe(false);
  });
  it('trénink jen se zahřívacími sériemi taky ne', () => {
    expect(canMakeRoutine(workout({ exercises: [{ exerciseId: 'squat', sets: [set({ type: 'W' })] }] }))).toBe(false);
  });
  it('trénink s hotovou pracovní sérií ano', () => {
    expect(canMakeRoutine(workout({ exercises: [{ exerciseId: 'squat', sets: [set()] }] }))).toBe(true);
  });
});
