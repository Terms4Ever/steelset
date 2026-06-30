jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { bestE1rm } from '@/lib/calc';
import { activeWorkout, history, useStore } from '@/store/useStore';

const s = () => useStore.getState();

beforeEach(() => {
  s().wipeAll();
});

describe('store · full workout lifecycle', () => {
  it('onboards, builds a routine, logs a session, and persists history', () => {
    s().completeOnboarding([]);
    expect(s().settings.onboarded).toBe(true);

    const rid = s().addRoutine({ name: 'Test', exercises: [{ exerciseId: 'squat', targetSets: 2, targetReps: 5 }] });
    const wid = s().startWorkout(rid);
    expect(s().activeWorkoutId).toBe(wid);

    const a = activeWorkout(s())!;
    expect(a.name).toBe('Test');
    expect(a.exercises[0].sets).toHaveLength(2);

    s().updateSet(0, 0, { weight: 100, reps: 5, done: true });
    s().updateSet(0, 1, { weight: 100, reps: 5, done: true });
    s().finishWorkout();

    expect(s().activeWorkoutId).toBeNull();
    const h = history(s());
    expect(h).toHaveLength(1);
    expect(h[0].finishedAt).toBeGreaterThan(0);
    expect(bestE1rm(s().workouts, 'squat')).toBeCloseTo(116.667, 2);
  });

  it('pre-fills the next session from the last one', () => {
    const rid = s().addRoutine({ name: 'T', exercises: [{ exerciseId: 'bench-barbell', targetSets: 1, targetReps: 5 }] });
    s().startWorkout(rid);
    s().updateSet(0, 0, { weight: 80, reps: 5, done: true });
    s().finishWorkout();

    s().startWorkout(rid);
    const a = activeWorkout(s())!;
    expect(a.exercises[0].sets[0].weight).toBe(80);
    expect(a.exercises[0].sets[0].done).toBe(false);
  });

  it('auto-progresses weight when all target reps were hit', () => {
    const rid = s().addRoutine({
      name: 'AP',
      autoProgress: true,
      exercises: [{ exerciseId: 'ohp', targetSets: 2, targetReps: 5 }],
    });
    s().startWorkout(rid);
    s().updateSet(0, 0, { weight: 40, reps: 5, done: true });
    s().updateSet(0, 1, { weight: 40, reps: 5, done: true });
    s().finishWorkout();

    s().startWorkout(rid);
    const a = activeWorkout(s())!;
    expect(a.exercises[0].sets[0].weight).toBe(42.5); // +increment
  });

  it('discards a session where nothing was completed', () => {
    s().startWorkout(null);
    s().addExerciseToActive('squat');
    // never mark a set done
    s().finishWorkout();
    expect(history(s())).toHaveLength(0);
    expect(s().activeWorkoutId).toBeNull();
  });

  it('drops uncompleted sets but keeps completed ones on finish', () => {
    s().startWorkout(null);
    s().addExerciseToActive('squat');
    s().updateSet(0, 0, { weight: 60, reps: 8, done: true });
    // sets 1,2 from prefill remain undone
    s().finishWorkout();
    const h = history(s());
    expect(h).toHaveLength(1);
    expect(h[0].exercises[0].sets).toHaveLength(1);
  });

  it('adds and persists a custom exercise', () => {
    const id = s().addExercise({ name: 'Můj cvik', primary: 'Hrudník', equipment: 'Stroj', tracking: 'weight_reps' });
    expect(s().customExercises.find((e) => e.id === id)?.name).toBe('Můj cvik');
  });

  it('wipeAll clears everything and resets onboarding', () => {
    s().completeOnboarding([]);
    s().addRoutine({ name: 'x', exercises: [] });
    s().wipeAll();
    expect(s().routines).toHaveLength(0);
    expect(s().workouts).toHaveLength(0);
    expect(s().settings.onboarded).toBe(false);
  });

  it('manual workout finishes on the chosen date, not now', () => {
    s().startWorkout(null, true);
    const chosen = Date.now() - 3 * 24 * 3600 * 1000; // 3 days ago
    s().setWorkoutDate(chosen);
    s().addExerciseToActive('squat');
    s().updateSet(0, 0, { weight: 100, reps: 5, done: true });
    s().finishWorkout();
    const h = history(s());
    expect(h).toHaveLength(1);
    expect(h[0].manual).toBe(true);
    expect(h[0].finishedAt).toBe(chosen);
  });
});
