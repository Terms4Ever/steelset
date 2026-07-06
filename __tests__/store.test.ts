jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { bestE1rm } from '@/lib/calc';
import { activeWorkout, history, localCoversWindow, useStore } from '@/store/useStore';

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

  it('editing an imported Health workout keeps it (no vanish) and preserves duration + HR', () => {
    const start = Date.now() - 3600000;
    const end = Date.now() - 1800000;
    const id = s().importHealthWorkout({ uuid: 'HK-2', name: 'Silový trénink', start, end, avg: 130, max: 165, series: [{ t: start, bpm: 120 }, { t: end, bpm: 150 }] })!;
    s().editWorkout(id);
    expect(s().activeWorkoutId).toBe(id);
    s().finishWorkout(); // finish WITHOUT adding sets — must not vanish
    const h = history(s());
    expect(h).toHaveLength(1);
    expect(h[0].id).toBe(id);
    expect(h[0].startedAt).toBe(start); // original window preserved (HR graph intact)
    expect(h[0].finishedAt).toBe(end);
    expect(h[0].avgHr).toBe(130);
    expect(h[0].hrSeries).toHaveLength(2);
    expect(h[0].editEndAt).toBeUndefined();
  });

  it('adds sets to an imported workout → one combined record (sets + heart rate)', () => {
    const start = Date.now() - 3600000;
    const end = Date.now() - 1800000;
    const id = s().importHealthWorkout({ uuid: 'HK-3', name: 'Silový trénink', start, end, avg: 140, max: 170 })!;
    s().editWorkout(id);
    s().addExerciseToActive('squat');
    s().updateSet(0, 0, { weight: 100, reps: 5, done: true });
    s().finishWorkout();
    const w = history(s())[0];
    expect(w.exercises).toHaveLength(1);
    expect(w.exercises[0].sets).toHaveLength(1);
    expect(w.avgHr).toBe(140); // heart rate retained alongside the new sets
    expect(w.finishedAt).toBe(end);
  });

  it('localCoversWindow: a live-logged workout hides an overlapping Health import', () => {
    const live = [{ id: 'a', name: 'x', startedAt: 1000, finishedAt: 2000, exercises: [] }] as any;
    expect(localCoversWindow(live, 1500, 2500)).toBe(true); // overlaps
    expect(localCoversWindow(live, 2000, 3000)).toBe(false); // starts exactly at end → no overlap
    expect(localCoversWindow(live, 3000, 4000)).toBe(false); // after
    const imported = [{ id: 'b', name: 'x', startedAt: 1000, finishedAt: 2000, healthUuid: 'u', exercises: [] }] as any;
    expect(localCoversWindow(imported, 1500, 2500)).toBe(false); // an import never "covers" another
  });

  it('remembers dismissed Health workouts without duplicates', () => {
    s().dismissHealthWorkouts(['A', 'B']);
    s().dismissHealthWorkouts(['B', 'C']);
    expect([...s().dismissedHealth].sort()).toEqual(['A', 'B', 'C']);
  });

  it('stamps a bodyweight snapshot on every started workout', () => {
    s().setSetting('bodyweightKg', 91);
    s().startWorkout(null);
    expect(activeWorkout(s())!.bodyweightKg).toBe(91);
  });

  it('pre-fills bodyweight for a weighted-bodyweight exercise (shyby) so weight is not empty', () => {
    s().setSetting('bodyweightKg', 91);
    s().startWorkout(null);
    s().addExerciseToActive('pullup'); // weighted_bw
    const a = activeWorkout(s())!;
    expect(a.exercises[0].sets.length).toBeGreaterThan(0);
    expect(a.exercises[0].sets.every((st) => st.weight === 91)).toBe(true);
  });

  it('does NOT pre-fill weight for a bodyweight_reps exercise (kliky) — no phantom tonnage', () => {
    s().setSetting('bodyweightKg', 91);
    s().startWorkout(null);
    s().addExerciseToActive('pushup'); // bodyweight_reps, weight column hidden
    const a = activeWorkout(s())!;
    expect(a.exercises[0].sets.every((st) => st.weight === null)).toBe(true);
  });

  it('unlinking a 3-member superset leaves no orphaned single-member group', () => {
    s().startWorkout(null);
    s().addExerciseToActive('squat');
    s().addExerciseToActive('bench-barbell');
    s().addExerciseToActive('ohp');
    s().linkSuperset(0); // squat + bench
    s().linkSuperset(1); // + ohp → all three linked
    expect(activeWorkout(s())!.exercises.every((e) => !!e.supersetGroup)).toBe(true);
    s().linkSuperset(1); // unlink bench+ohp → squat would be a superset-of-one
    expect(activeWorkout(s())!.exercises[0].supersetGroup).toBeUndefined();
  });

  it('removing a superset member drops the now-orphaned superset tag', () => {
    s().startWorkout(null);
    s().addExerciseToActive('squat');
    s().addExerciseToActive('bench-barbell');
    s().linkSuperset(0); // link squat + bench into one superset
    expect(activeWorkout(s())!.exercises[0].supersetGroup).toBeTruthy();
    s().removeActiveExercise(1); // remove bench → squat would be a superset-of-one
    const a = activeWorkout(s())!;
    expect(a.exercises).toHaveLength(1);
    expect(a.exercises[0].supersetGroup).toBeUndefined();
  });

  it('editing a heart-rate workout preserves its window (editEndAt set, start unchanged)', () => {
    s().startWorkout(null);
    s().addExerciseToActive('squat');
    s().updateSet(0, 0, { weight: 100, reps: 5, done: true });
    s().finishWorkout();
    const w0 = history(s())[0];
    s().setWorkoutHr(w0.id, 130, 165, [{ t: w0.startedAt, bpm: 120 }, { t: w0.finishedAt!, bpm: 150 }]);
    s().editWorkout(w0.id);
    const a = activeWorkout(s())!;
    expect(a.startedAt).toBe(w0.startedAt); // NOT collapsed to finishedAt
    expect(a.editEndAt).toBe(w0.finishedAt); // original end stashed → HR graph window survives
    s().finishWorkout();
    expect(history(s())[0].hrSeries).toHaveLength(2);
  });

  it('reassigning exercise muscles applies through selectors (seed exercise, history included)', () => {
    const { exercisesById } = require('@/store/useStore');
    // pullup default: Záda / Biceps → change to Ramena / Triceps
    s().setExerciseMuscles('pullup', 'Ramena', ['Triceps']);
    const byId = exercisesById({ customExercises: s().customExercises, exerciseMuscles: s().exerciseMuscles });
    expect(byId['pullup'].primary).toBe('Ramena');
    expect(byId['pullup'].secondary).toEqual(['Triceps']);
    // primary can never stay in secondary
    s().setExerciseMuscles('pullup', 'Triceps', ['Triceps', 'Záda']);
    const byId2 = exercisesById({ customExercises: s().customExercises, exerciseMuscles: s().exerciseMuscles });
    expect(byId2['pullup'].primary).toBe('Triceps');
    expect(byId2['pullup'].secondary).toEqual(['Záda']);
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
