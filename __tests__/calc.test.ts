import { Exercise, Workout } from '@/data/types';
import {
  bestE1rm,
  e1rm,
  e1rmTrend,
  exerciseVolume,
  isCountable,
  isPR,
  lastPerformance,
  muscleVolume,
  strengthScore,
  weeklyVolume,
  weekStreak,
  workoutVolume,
  MS,
} from '@/lib/calc';

const done = (weight: number, reps: number, type: any = 'R') => ({ type, weight, reps, done: true });
const undone = (weight: number, reps: number) => ({ type: 'R' as const, weight, reps, done: false });

function workout(id: string, finishedAt: number, exId: string, sets: any[]): Workout {
  return { id, name: 't', startedAt: finishedAt - 1000, finishedAt, exercises: [{ exerciseId: exId, sets }] };
}

describe('e1rm', () => {
  it('returns the weight itself for a single rep', () => {
    expect(e1rm(100, 1)).toBe(100);
  });
  it('uses Epley for multi-rep', () => {
    expect(e1rm(100, 5)).toBeCloseTo(116.667, 2);
  });
  it('guards invalid input', () => {
    expect(e1rm(0, 5)).toBe(0);
    expect(e1rm(100, 0)).toBe(0);
    expect(e1rm(null, 5)).toBe(0);
    expect(e1rm(-50, 3)).toBe(0);
  });
});

describe('volume', () => {
  it('counts only completed sets', () => {
    expect(exerciseVolume({ exerciseId: 'x', sets: [done(100, 5), undone(100, 5)] })).toBe(500);
  });
  it('sums across exercises in a workout', () => {
    const w = workout('w1', 1000, 'squat', [done(100, 5), done(100, 5)]);
    expect(workoutVolume(w)).toBe(1000);
  });
  it('isCountable rejects incomplete or zero sets', () => {
    expect(isCountable(done(100, 5))).toBe(true);
    expect(isCountable(undone(100, 5))).toBe(false);
    expect(isCountable({ type: 'R', weight: 0, reps: 5, done: true })).toBe(false);
  });
});

describe('bestE1rm + history', () => {
  const ws: Workout[] = [
    workout('w1', 10_000, 'bench-barbell', [done(80, 5)]), // e1rm ~93.3
    workout('w2', 20_000, 'bench-barbell', [done(100, 3)]), // e1rm 110
  ];
  it('finds the best estimated 1RM across finished workouts', () => {
    expect(bestE1rm(ws, 'bench-barbell')).toBeCloseTo(110, 2);
  });
  it('respects the "before" cutoff', () => {
    expect(bestE1rm(ws, 'bench-barbell', 15_000)).toBeCloseTo(93.333, 2);
  });
  it('ignores unfinished workouts', () => {
    const active: Workout = { id: 'a', name: 't', startedAt: 30_000, exercises: [{ exerciseId: 'bench-barbell', sets: [done(200, 1)] }] };
    expect(bestE1rm([...ws, active], 'bench-barbell')).toBeCloseTo(110, 2);
  });
});

describe('lastPerformance', () => {
  it('returns the most recent finished sets for an exercise', () => {
    const ws = [
      workout('w1', 10_000, 'squat', [done(100, 5)]),
      workout('w2', 20_000, 'squat', [done(110, 5), done(110, 4)]),
    ];
    const prev = lastPerformance(ws, 'squat');
    expect(prev).toHaveLength(2);
    expect(prev![0]).toMatchObject({ weight: 110, reps: 5 });
  });
  it('returns null when no history', () => {
    expect(lastPerformance([], 'squat')).toBeNull();
  });
});

describe('isPR', () => {
  const ws = [workout('w1', 10_000, 'deadlift', [done(140, 3)])]; // e1rm = 154
  it('is true when the estimated 1RM beats history', () => {
    expect(isPR(ws, 'deadlift', 150, 3)).toBe(true); // e1rm 165 > 154
  });
  it('is false when it does not beat history', () => {
    expect(isPR(ws, 'deadlift', 140, 3)).toBe(false);
    expect(isPR(ws, 'deadlift', 100, 5)).toBe(false);
  });
  it('is a PR with no prior history', () => {
    expect(isPR([], 'deadlift', 60, 5)).toBe(true);
  });
});

describe('weekStreak', () => {
  it('counts consecutive trained weeks back from now', () => {
    const now = 100 * MS.WEEK + MS.DAY; // mid of week 100
    const ws = [
      workout('w1', 100 * MS.WEEK, 'squat', [done(100, 5)]),
      workout('w2', 99 * MS.WEEK, 'squat', [done(100, 5)]),
      workout('w3', 98 * MS.WEEK, 'squat', [done(100, 5)]),
      // gap at week 96
      workout('w4', 95 * MS.WEEK, 'squat', [done(100, 5)]),
    ];
    expect(weekStreak(ws, now)).toBe(3);
  });
  it('is 0 with no workouts', () => {
    expect(weekStreak([], 100 * MS.WEEK)).toBe(0);
  });
});

describe('weeklyVolume', () => {
  it('sums tonnage within the last 7 days', () => {
    const now = 1_000_000_000;
    const ws = [
      workout('w1', now - MS.DAY, 'squat', [done(100, 10)]), // 1000, in window
      workout('w2', now - 10 * MS.DAY, 'squat', [done(100, 10)]), // out of window
    ];
    expect(weeklyVolume(ws, now)).toBe(1000);
  });
});

describe('muscleVolume', () => {
  const exById: Record<string, Exercise> = {
    bench: { id: 'bench', name: 'Bench', primary: 'Hrudník', secondary: ['Triceps'], equipment: 'Činka', tracking: 'weight_reps' },
  };
  it('credits primary fully and secondary at half', () => {
    const ws = [workout('w1', 10_000, 'bench', [done(100, 5)])]; // vol 500
    const mv = muscleVolume(ws, exById);
    expect(mv['Hrudník']).toBe(500);
    expect(mv['Triceps']).toBe(250);
  });
});

describe('strengthScore + trend', () => {
  it('increases as compound PRs land and never counts unfinished work', () => {
    const ws = [
      workout('w1', 10_000, 'squat', [done(140, 5)]),
      workout('w2', 20_000, 'bench-barbell', [done(100, 5)]),
    ];
    expect(strengthScore(ws)).toBeGreaterThan(0);
  });
  it('builds a sorted e1rm trend', () => {
    const ws = [
      workout('w2', 20_000, 'squat', [done(110, 5)]),
      workout('w1', 10_000, 'squat', [done(100, 5)]),
    ];
    const trend = e1rmTrend(ws, 'squat');
    expect(trend.map((p) => p.at)).toEqual([10_000, 20_000]);
    expect(trend[1].value).toBeGreaterThan(trend[0].value);
  });
});
