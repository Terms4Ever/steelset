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
  muscleAlerts,
  muscleVolume,
  muscleVolumeDetailed,
  perExerciseHr,
  strengthScore,
  topExercisesForMuscle,
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

  it('topExercisesForMuscle ranks by attributed volume (primary 1.0, secondary 0.5)', () => {
    const exs = {
      deadlift: { id: 'deadlift', name: 'MT', primary: 'Záda', secondary: ['Nohy'], equipment: 'Činka', tracking: 'weight_reps' },
      rdl: { id: 'rdl', name: 'RDL', primary: 'Nohy', secondary: ['Hýždě'], equipment: 'Činka', tracking: 'weight_reps' },
    } as any;
    const ws = [
      { id: 'w1', name: 't', startedAt: 0, finishedAt: 10, exercises: [
        { exerciseId: 'deadlift', sets: [done(100, 10)] }, // Nohy→Hamstringy secondary → 500
        { exerciseId: 'rdl', sets: [done(80, 10)] }, // Nohy→Hamstringy primary → 800
      ] },
    ] as any as Workout[];
    const top = topExercisesForMuscle(ws, exs, 'Hamstringy');
    expect(top.map((t) => t.exerciseId)).toEqual(['rdl', 'deadlift']);
    expect(top[0].volume).toBe(800);
    expect(top[1].volume).toBe(500);
  });

  it('exerciseVolumeFor counts bodyweight reps as bodyweight × reps (fixes abs never lighting up)', () => {
    const { exerciseVolumeFor, workoutVolumeEx } = require('@/lib/calc');
    const ex = { id: 'hanging-leg-raise', name: 'Zvedání nohou ve visu', primary: 'Břicho', equipment: 'Vlastní váha', tracking: 'bodyweight_reps' } as any;
    const w = { id: 'w', name: 't', startedAt: 0, finishedAt: 10, bodyweightKg: 91, exercises: [
      { exerciseId: 'hanging-leg-raise', sets: [
        { type: 'R', weight: null, reps: 12, done: true },
        { type: 'R', weight: null, reps: 12, done: true },
        { type: 'R', weight: null, reps: 12, done: false }, // not done → 0
      ] },
    ] } as any;
    expect(exerciseVolumeFor(w.exercises[0], ex, w)).toBe(91 * 12 * 2);
    expect(workoutVolumeEx(w, { 'hanging-leg-raise': ex })).toBe(91 * 12 * 2);
  });

  it('exerciseVolumeFor doubles volume for unilateral exercises', () => {
    const { exerciseVolumeFor } = require('@/lib/calc');
    const ex = { id: 'db-row', name: 'Veslování jednoručkou', primary: 'Záda', equipment: 'Jednoručky', tracking: 'weight_reps', unilateral: true } as any;
    const w = { id: 'w', name: 't', startedAt: 0, finishedAt: 10, bodyweightKg: 91, exercises: [
      { exerciseId: 'db-row', sets: [{ type: 'R', weight: 30, reps: 10, done: true }] },
    ] } as any;
    expect(exerciseVolumeFor(w.exercises[0], ex, w)).toBe(30 * 10 * 2);
  });

  it('muscleVolumeDetailed lights up abs from bodyweight-only exercises', () => {
    const exs = { hlr: { id: 'hlr', name: 'Zvedání nohou ve visu', primary: 'Břicho', equipment: 'Vlastní váha', tracking: 'bodyweight_reps' } } as any;
    const ws = [{ id: 'w1', name: 't', startedAt: 0, finishedAt: 10, bodyweightKg: 90, exercises: [
      { exerciseId: 'hlr', sets: [{ type: 'R', weight: null, reps: 10, done: true }] },
    ] }] as any as Workout[];
    expect(muscleVolumeDetailed(ws, exs)['Břicho']).toBe(900);
  });

  it('lastPerformance includes weightless done sets (bodyweight reps ghosts + deltas)', () => {
    const ws = [{ id: 'w1', name: 't', startedAt: 0, finishedAt: 10, exercises: [
      { exerciseId: 'pushup', sets: [
        { type: 'R', weight: null, reps: 12, done: true },
        { type: 'R', weight: null, reps: 10, done: false }, // not done → excluded
      ] },
    ] }] as any as Workout[];
    const prev = lastPerformance(ws, 'pushup');
    expect(prev).toHaveLength(1);
    expect(prev![0].reps).toBe(12);
  });

  it('detailedMuscle maps custom exercises by name keywords', () => {
    const { detailedMuscle } = require('@/lib/calc');
    expect(detailedMuscle('custom_1', 'Nohy', 'Rumunský mrtvý tah s jednoručkami')).toBe('Hamstringy');
    expect(detailedMuscle('custom_2', 'Nohy', 'Zakopávání na stroji')).toBe('Hamstringy');
    expect(detailedMuscle('custom_3', 'Nohy', 'Dřep na multipressu')).toBe('Kvadricepsy');
    expect(detailedMuscle('custom_4', 'Záda', 'Shrugs s jednoručkami')).toBe('Trapézy');
    expect(detailedMuscle('custom_5', 'Záda', 'Hyperextenze')).toBe('Spodní záda');
    expect(detailedMuscle('custom_6', 'Záda', 'Přítahy na hrazdě')).toBe('Horní záda');
    // seed overrides still win over name heuristics
    expect(detailedMuscle('deadlift', 'Záda', 'Mrtvý tah')).toBe('Spodní záda');
  });

  it('muscleAlerts works on weekly hard sets (absolute zones)', () => {
    expect(muscleAlerts({ Kvadricepsy: 12, Hamstringy: 4 })[0]?.kind).toBe('weak');
    expect(muscleAlerts({ Kvadricepsy: 12, Hamstringy: 10, Hrudník: 10 })).toEqual([]);
    expect(muscleAlerts({ Hrudník: 30, Biceps: 10, 'Horní záda': 12 }).some((a) => a.kind === 'overload')).toBe(true);
    expect(muscleAlerts({ 'Horní záda': 12, Hrudník: 10, Břicho: 2 }).some((a) => a.kind === 'weak')).toBe(true);
    expect(muscleAlerts({})).toEqual([]);
  });

  it('summarizeSets collapses uniform sets and lists mixed ones', () => {
    const { summarizeSets } = require('@/lib/calc');
    const f = (kg: number) => `${kg} kg`;
    const S = (w: number | null, r: number) => ({ type: 'R', weight: w, reps: r, done: true }) as any;
    expect(summarizeSets([S(100, 8), S(100, 8), S(100, 8)], f)).toBe('3× 100 kg × 8');
    expect(summarizeSets([S(100, 8), S(100, 6), S(90, 6)], f)).toBe('100 kg × 8 · 100 kg × 6 · 90 kg × 6');
    expect(summarizeSets([S(100, 8)], f)).toBe('100 kg × 8');
    expect(summarizeSets([S(null, 12), S(null, 12)], f, { hideWeight: true })).toBe('2× 12');
    // weighted bodyweight renders as BW +X against the workout's snapshot
    expect(summarizeSets([S(101, 5), S(101, 5)], f, { bwKg: 91 })).toBe('2× BW +10 kg × 5');
    expect(summarizeSets([S(91, 5)], f, { bwKg: 91 })).toBe('BW × 5');
    expect(summarizeSets([], f)).toBe('');
  });

  it('lastSession returns the most recent session with done sets, skipping the current workout', () => {
    const { lastSession } = require('@/lib/calc');
    const ws = [
      { id: 'old', name: 't', startedAt: 0, finishedAt: 1000, bodyweightKg: 90, exercises: [
        { exerciseId: 'squat', sets: [{ type: 'R', weight: 100, reps: 5, done: true }] } ] },
      { id: 'empty', name: 't', startedAt: 0, finishedAt: 2000, exercises: [
        { exerciseId: 'squat', sets: [{ type: 'R', weight: 120, reps: 5, done: false }] } ] }, // nothing done → skipped
      { id: 'cur', name: 't', startedAt: 0, finishedAt: 3000, exercises: [
        { exerciseId: 'squat', sets: [{ type: 'R', weight: 130, reps: 5, done: true }] } ] },
    ] as any as Workout[];
    expect(lastSession(ws, 'squat')!.sets[0].weight).toBe(130);
    const excl = lastSession(ws, 'squat', 'cur')!;
    expect(excl.sets[0].weight).toBe(100); // 'empty' skipped, falls through to 'old'
    expect(excl.bodyweightKg).toBe(90);
    expect(lastSession(ws, 'bench-barbell')).toBeNull();
  });

  it('setZone maps weekly sets to absolute zones', () => {
    const { setZone } = require('@/lib/calc');
    expect(setZone(0)).toBe('none');
    expect(setZone(4.5)).toBe('low');
    expect(setZone(5)).toBe('optimum');
    expect(setZone(19.9)).toBe('optimum');
    expect(setZone(20)).toBe('high');
    expect(setZone(25)).toBe('high');
    expect(setZone(25.1)).toBe('overload');
  });

  it('muscleSetsDetailed counts hard sets (no warm-ups), halves secondary, doubles unilateral', () => {
    const { muscleSetsDetailed, perWeek } = require('@/lib/calc');
    const exs = {
      pullup: { id: 'pullup', name: 'Shyby', primary: 'Záda', secondary: ['Biceps'], equipment: 'Vlastní váha', tracking: 'weighted_bw' },
      row: { id: 'row', name: 'Veslování jednoručkou', primary: 'Záda', equipment: 'Jednoručky', tracking: 'weight_reps', unilateral: true },
    } as any;
    const ws = [{ id: 'w1', name: 't', startedAt: 0, finishedAt: 10, bodyweightKg: 91, exercises: [
      { exerciseId: 'pullup', sets: [
        { type: 'W', weight: 91, reps: 5, done: true }, // warm-up → ignored
        { type: 'R', weight: 91, reps: 5, done: true },
        { type: 'R', weight: 91, reps: 4, done: true },
        { type: 'R', weight: 91, reps: 4, done: false }, // not done → ignored
      ] },
      { exerciseId: 'row', sets: [{ type: 'R', weight: 30, reps: 10, done: true }] }, // unilateral → 2
    ] }] as any as Workout[];
    const sets = muscleSetsDetailed(ws, exs);
    expect(sets['Horní záda']).toBe(4); // pullup 2 + row 1×2
    expect(sets['Biceps']).toBe(1); // pullup secondary 2 × 0.5
    expect(perWeek({ 'Horní záda': 8 }, 28)['Horní záda']).toBe(2);
  });

  it('topExerciseSetsForMuscle: pull-ups equal a high-tonnage machine when sets are equal', () => {
    const { topExerciseSetsForMuscle } = require('@/lib/calc');
    const exs = {
      pullup: { id: 'pullup', name: 'Shyby', primary: 'Záda', equipment: 'Vlastní váha', tracking: 'weighted_bw' },
      reardelt: { id: 'reardelt', name: 'Rear deltoid', primary: 'Záda', equipment: 'Stroj', tracking: 'weight_reps' },
    } as any;
    const ws = [{ id: 'w1', name: 't', startedAt: 0, finishedAt: 10, bodyweightKg: 91, exercises: [
      { exerciseId: 'pullup', sets: Array.from({ length: 4 }, () => ({ type: 'R', weight: 91, reps: 5, done: true })) },
      { exerciseId: 'reardelt', sets: Array.from({ length: 4 }, () => ({ type: 'R', weight: 63, reps: 12, done: true })) },
    ] }] as any as Workout[];
    const top = topExerciseSetsForMuscle(ws, exs, 'Horní záda');
    expect(top.map((t) => t.sets)).toEqual([4, 4]); // tonnage differs 3×, hard sets are equal
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
