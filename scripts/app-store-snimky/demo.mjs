// Ukázková data pro snímky do App Storu: šest týdnů Push / Pull / Legs.
// node demo.mjs <cs|en> <active:0|1>  -> vypíše JSON stavu persistu
const [lang = 'cs', active = '0'] = process.argv.slice(2);
const DAY = 86400000;
const now = new Date();
now.setHours(19, 0, 0, 0);
const today = now.getTime();

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const round = (v, step = 2.5) => Math.round(v / step) * step;

const BW = 82;
const plans = {
  push: { name: 'Push', ex: [['bench-barbell', 4, 6, 70, 82.5], ['ohp', 3, 8, 40, 47.5], ['bench-incline-barbell', 3, 10, 55, 62.5], ['lateral-raise', 3, 15, 10, 12, 1], ['triceps-pushdown', 3, 12, 25, 30]] },
  pull: { name: 'Pull', ex: [['deadlift', 3, 5, 110, 130], ['pullup', 3, 8, BW, BW + 10], ['row-barbell', 3, 8, 60, 70], ['face-pull', 3, 15, 20, 25], ['curl-db', 3, 12, 12, 14, 1]] },
  legs: { name: 'Legs', ex: [['squat', 4, 5, 90, 107.5], ['rdl', 3, 8, 80, 95], ['leg-press', 3, 12, 150, 180, 10], ['leg-curl', 3, 12, 40, 47.5], ['calf-raise', 4, 15, 60, 70, 5]] },
};

const routines = Object.entries(plans).map(([id, p]) => ({
  id: 'demo-' + id,
  name: p.name,
  folder: 'PPL',
  autoProgress: true,
  exercises: p.ex.map(([exerciseId, sets, reps]) => ({ exerciseId, targetSets: sets, targetReps: reps })),
}));

function build(key, start, progress, finished) {
  const p = plans[key];
  let t = start + 5 * 60000;
  const exercises = p.ex.map(([exerciseId, sets, reps, from, to, step = 2.5], ei) => {
    const w = round(from + (to - from) * progress, step);
    const out = [];
    const doneCount = finished ? sets : ei === 0 ? sets : ei === 1 ? 2 : 0;
    for (let s = 0; s < sets; s++) {
      const done = s < doneCount;
      t += (done ? 150 + rnd() * 60 : 0) * 1000;
      const r = done ? Math.max(reps - (s === sets - 1 && rnd() > 0.6 ? 1 : 0), 1) : reps;
      out.push({ type: 'R', weight: w, reps: r, rpe: null, done, ...(done ? { doneAt: t } : {}) });
    }
    return { exerciseId, sets: out };
  });
  const end = finished ? t + 4 * 60000 : undefined;
  const w = { id: `demo-${key}-${start}`, routineId: 'demo-' + key, name: p.name, startedAt: start, bodyweightKg: BW, exercises };
  if (!finished) return w;
  const hrSeries = [];
  for (let x = start; x <= end; x += 30000) {
    const inSet = exercises.some((e) => e.sets.some((s) => s.doneAt && x <= s.doneAt && x > s.doneAt - 45000));
    hrSeries.push({ t: x, bpm: Math.round((inSet ? 148 : 118) + rnd() * 14) });
  }
  const avgHr = Math.round(hrSeries.reduce((a, b) => a + b.bpm, 0) / hrSeries.length);
  const maxHr = Math.max(...hrSeries.map((h) => h.bpm));
  return { ...w, finishedAt: end, avgHr, maxHr, kcal: Math.round(((end - start) / 60000) * (5.6 + rnd())), hrSeries };
}

const workouts = [];
const order = ['push', 'pull', 'legs'];
let n = 0;
// 6 týdnů, 4 tréninky týdně (po, út, čt, so), poslední včera
const days = [];
for (let d = 42; d >= 1; d--) {
  const dow = new Date(today - d * DAY).getDay();
  if ([1, 2, 4, 6].includes(dow)) days.push(d);
}
days.forEach((d, i) => {
  const start = today - d * DAY - 60 * 60000;
  workouts.push(build(order[n++ % 3], start, i / (days.length - 1), true));
});
let activeWorkoutId = null;
if (active === '1') {
  const w = build(order[n % 3], Date.now() - 24 * 60000, 1, false);
  workouts.push(w);
  activeWorkoutId = w.id;
}

const bodyweightLog = [];
for (let d = 42; d >= 0; d -= 3) bodyweightLog.push({ at: today - d * DAY, kg: Math.round((83.4 - (42 - d) * 0.035 + rnd() * 0.4) * 10) / 10 });

const state = {
  routines,
  workouts,
  activeWorkoutId,
  bodyweightLog,
  settings: { onboarded: true, language: lang, weeklyGoal: 4, bodyweightKg: BW, unit: 'kg' },
  isPro: false,
};
process.stdout.write(JSON.stringify(state));
