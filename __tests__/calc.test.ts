import { Exercise, Workout } from '@/data/types';
import {
  bestE1rm,
  e1rm,
  e1rmTrend,
  exerciseVolume,
  isCountable,
  isPR,
  hrWindow,
  lastPerformance,
  muscleVolume,
  muscleVolumeDetailed,
  perExerciseHr,
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

  it('perExerciseHr segments HR by exercise timeline within the window', () => {
    const w = {
      id: 'x', name: 'w', startedAt: 0, finishedAt: 1000,
      hrSeries: [{ t: 100, bpm: 140 }, { t: 200, bpm: 140 }, { t: 400, bpm: 120 }, { t: 600, bpm: 120 }, { t: 800, bpm: 100 }],
      exercises: [
        { exerciseId: 'a', sets: [{ type: 'R', weight: 100, reps: 5, done: true, doneAt: 300 }] },
        { exerciseId: 'b', sets: [{ type: 'R', weight: 80, reps: 5, done: true, doneAt: 700 }] },
      ],
    } as any as Workout;
    // a: window [0,300] → 140,140 → 140 ; b: window [300,700] → 120,120 → 120 (no neighbour bleed)
    expect(perExerciseHr(w)).toEqual([140, 120]);
  });

  it('perExerciseHr falls back to even slots when doneAt is outside the window (edited records)', () => {
    const w = {
      id: 'x', name: 'w', startedAt: 0, finishedAt: 1000,
      hrSeries: [{ t: 100, bpm: 140 }, { t: 700, bpm: 100 }],
      exercises: [
        { exerciseId: 'a', sets: [{ type: 'R', weight: 100, reps: 5, done: true, doneAt: 5000 }] }, // edit-time doneAt, outside window
        { exerciseId: 'b', sets: [{ type: 'R', weight: 80, reps: 5, done: true, doneAt: 6000 }] },
      ],
    } as any as Workout;
    // no in-window anchors → window split evenly: a=[0,500] → 140, b=[500,1000] → 100
    expect(perExerciseHr(w)).toEqual([140, 100]);
  });

  it('muscleVolumeDetailed splits back and legs by exercise', () => {
    const exs = {
      deadlift: { id: 'deadlift', name: 'MT', primary: 'Záda', secondary: ['Nohy'], equipment: 'Činka', tracking: 'weight_reps' },
      pullup: { id: 'pullup', name: 'Shyby', primary: 'Záda', equipment: 'Vlastní váha', tracking: 'weighted_bw' },
      squat: { id: 'squat', name: 'Dřep', primary: 'Nohy', equipment: 'Činka', tracking: 'weight_reps' },
    } as any;
    const ws = [
      { id: 'w1', name: 't', startedAt: 0, finishedAt: 10, exercises: [
        { exerciseId: 'deadlift', sets: [done(100, 10)] }, // 1000 → Spodní záda, +500 Hamstringy
        { exerciseId: 'pullup', sets: [done(90, 10)] }, // 900 → Horní záda
        { exerciseId: 'squat', sets: [done(80, 10)] }, // 800 → Kvadricepsy
      ] },
    ] as any as Workout[];
    const v = muscleVolumeDetailed(ws, exs);
    expect(v['Spodní záda']).toBe(1000);
    expect(v['Horní záda']).toBe(900);
    expect(v['Kvadricepsy']).toBe(800);
    expect(v['Hamstringy']).toBe(500);
    expect(v['Záda']).toBeUndefined();
  });

  it('hrWindow falls back to the series span when the workout window collapsed (old edits)', () => {
    const w = {
      id: 'x', name: 'w', startedAt: 5000, finishedAt: 5000, // collapsed by an older version's edit
      hrSeries: [{ t: 1000, bpm: 140 }, { t: 2000, bpm: 120 }, { t: 3000, bpm: 100 }],
      exercises: [{ exerciseId: 'a', sets: [{ type: 'R', weight: 100, reps: 5, done: true, doneAt: 9000 }] }],
    } as any as Workout;
    expect(hrWindow(w)).toEqual({ start: 1000, end: 3000 });
    expect(perExerciseHr(w)).toEqual([120]); // whole span → avg(140,120,100)
  });

  it('perExerciseHr is null for exercises with no completed set at all', () => {
    const w = {
      id: 'x', name: 'w', startedAt: 0, finishedAt: 1000,
      hrSeries: [{ t: 100, bpm: 140 }, { t: 200, bpm: 140 }],
      exercises: [
        { exerciseId: 'a', sets: [{ type: 'R', weight: 100, reps: 5, done: true, doneAt: 300 }] },
        { exerciseId: 'b', sets: [{ type: 'R', weight: 80, reps: 5, done: false }] }, // not completed
      ],
    } as any as Workout;
    expect(perExerciseHr(w)).toEqual([140, null]);
  });
});
