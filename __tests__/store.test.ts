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

  it('keeps an empty live session that ran ≥2 min so Apple Watch heart rate has a home', () => {
    s().startWorkout(null); // live, no sets logged (pure cardio / HR test)
    s().setWorkoutDate(Date.now() - 3 * 60 * 1000); // started 3 minutes ago
    s().finishWorkout();
    const h = history(s());
    expect(h).toHaveLength(1);
    expect(h[0].exercises).toHaveLength(0);
    expect(h[0].manual).toBeFalsy();
    expect(h[0].finishedAt).toBeGreaterThan(0);
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

  it('imports an Apple Health workout once and dedups by uuid', () => {
    const start = Date.now() - 3600000;
    const end = Date.now() - 1800000;
    const id1 = s().importHealthWorkout({ uuid: 'HK-1', name: 'Silový trénink', start, end, avg: 130, max: 165, series: [{ t: start, bpm: 120 }, { t: end, bpm: 150 }] });
    expect(id1).toBeTruthy();
    // second import of same HealthKit uuid is ignored
    const id2 = s().importHealthWorkout({ uuid: 'HK-1', name: 'Silový trénink', start: 1, end: 2 });
    expect(id2).toBeNull();

    const h = history(s());
    expect(h).toHaveLength(1);
    expect(h[0].source).toBe('health');
    expect(h[0].healthUuid).toBe('HK-1');
    expect(h[0].avgHr).toBe(130);
    expect(h[0].hrSeries).toHaveLength(2);
    expect(h[0].exercises).toHaveLength(0);
  });

  it('remembers dismissed Health workouts without duplicates', () => {
    s().dismissHealthWorkouts(['A', 'B']);
    s().dismissHealthWorkouts(['B', 'C']);
    expect([...s().dismissedHealth].sort()).toEqual(['A', 'B', 'C']);
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
