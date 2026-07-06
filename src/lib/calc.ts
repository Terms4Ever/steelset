import { Exercise, LoggedExercise, MuscleGroup, SetEntry, Workout } from '@/data/types';

const MS_DAY = 86_400_000;
const MS_WEEK = 7 * MS_DAY;

/** Estimated 1RM (Epley). Returns 0 for invalid input. */
export function e1rm(weight: number | null, reps: number | null): number {
  if (!weight || !reps || weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/** A set counts toward stats only if completed with real numbers. */
export function isCountable(s: SetEntry): boolean {
  return s.done && !!s.weight && !!s.reps && s.weight > 0 && s.reps > 0;
}

/** Volume (tonnage) of one logged exercise = Σ weight×reps of countable sets. */
export function exerciseVolume(le: LoggedExercise): number {
  return le.sets.reduce((sum, s) => (isCountable(s) ? sum + s.weight! * s.reps! : sum), 0);
}

/** Total tonnage of a whole workout. */
export function workoutVolume(w: Workout): number {
  return w.exercises.reduce((sum, le) => sum + exerciseVolume(le), 0);
}

/** Best estimated 1RM for an exercise across finished workouts (optionally before a cutoff). */
export function bestE1rm(workouts: Workout[], exerciseId: string, before = Infinity): number {
  let best = 0;
  for (const w of workouts) {
    if (!w.finishedAt || w.finishedAt >= before) continue;
    for (const le of w.exercises) {
      if (le.exerciseId !== exerciseId) continue;
      for (const s of le.sets) {
        if (isCountable(s)) best = Math.max(best, e1rm(s.weight, s.reps));
      }
    }
  }
  return best;
}

/** The most recent finished sets logged for an exercise - used to pre-fill "minule". */
export function lastPerformance(workouts: Workout[], exerciseId: string): SetEntry[] | null {
  const finished = workouts
    .filter((w) => w.finishedAt && w.exercises.some((le) => le.exerciseId === exerciseId))
    .sort((a, b) => b.finishedAt! - a.finishedAt!);
  if (!finished.length) return null;
  const le = finished[0].exercises.find((x) => x.exerciseId === exerciseId)!;
  return le.sets.filter(isCountable);
}

/**
 * Is (weight×reps) a personal record for this exercise vs all prior finished history?
 * PR = its estimated 1RM strictly beats the previous best e1RM.
 */
export function isPR(workouts: Workout[], exerciseId: string, weight: number | null, reps: number | null, before = Infinity): boolean {
  const value = e1rm(weight, reps);
  if (value <= 0) return false;
  return value > bestE1rm(workouts, exerciseId, before) + 1e-9;
}

/** Volume per muscle group since a timestamp (primary muscle gets full credit, secondary half). */
export function muscleVolume(
  workouts: Workout[],
  exercisesById: Record<string, Exercise>,
  since = 0,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const w of workouts) {
    if (!w.finishedAt || w.finishedAt < since) continue;
    for (const le of w.exercises) {
      const ex = exercisesById[le.exerciseId];
      if (!ex) continue;
      const vol = exerciseVolume(le);
      if (vol <= 0) continue;
      out[ex.primary] = (out[ex.primary] ?? 0) + vol;
      for (const m of ex.secondary ?? []) out[m] = (out[m] ?? 0) + vol * 0.5;
    }
  }
  return out;
}

// ---- detailed muscle map ----------------------------------------------------------------------
// The detailed map splits the coarse groups the exercises are tagged with:
//   Záda → Trapézy / Horní záda / Spodní záda,  Nohy → Kvadricepsy / Hamstringy.
// Per-exercise overrides below; anything unknown falls back to the group's default split.

const DETAIL_DEFAULT: Record<string, string> = { Záda: 'Horní záda', Nohy: 'Kvadricepsy' };

/** exerciseId → (coarse group → detailed muscle) overrides for the seed catalogue. */
const DETAIL_OVERRIDES: Record<string, Record<string, string>> = {
  deadlift: { Záda: 'Spodní záda', Nohy: 'Hamstringy' },
  rdl: { Nohy: 'Hamstringy', Záda: 'Spodní záda' },
  'leg-curl': { Nohy: 'Hamstringy' },
  'hip-thrust': { Nohy: 'Hamstringy' },
  'face-pull': { Záda: 'Trapézy' },
  hyperextension: { Záda: 'Spodní záda' },
  'good-morning': { Záda: 'Spodní záda', Nohy: 'Hamstringy' },
  shrug: { Záda: 'Trapézy' },
};

/** Name-based fallback so CUSTOM exercises land on the right detailed muscle too. */
function detailByName(name: string, coarse: string): string | null {
  const n = name.toLowerCase();
  if (coarse === 'Nohy') {
    if (/(rdl|rumun|zakop|leg ?curl|hamstring|mrtv)/.test(n)) return 'Hamstringy';
    return null;
  }
  if (coarse === 'Záda') {
    if (/(shrug|trap[eé]z)/.test(n)) return 'Trapézy';
    if (/(hyperextenz|spodn[ií]|vzp[řr]imova|good ?morning|mrtv)/.test(n)) return 'Spodní záda';
    return null;
  }
  return null;
}

export function detailedMuscle(exerciseId: string, coarse: string, name?: string): string {
  return (
    DETAIL_OVERRIDES[exerciseId]?.[coarse] ??
    (name ? detailByName(name, coarse) : null) ??
    DETAIL_DEFAULT[coarse] ??
    coarse
  );
}

/** muscleVolume, but keyed by the detailed muscle names (splits back + legs). */
export function muscleVolumeDetailed(
  workouts: Workout[],
  exercisesById: Record<string, Exercise>,
  since = 0,
  until = Infinity,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const w of workouts) {
    if (!w.finishedAt || w.finishedAt < since || w.finishedAt > until) continue;
    for (const le of w.exercises) {
      const ex = exercisesById[le.exerciseId];
      if (!ex) continue;
      const vol = exerciseVolume(le);
      if (vol <= 0) continue;
      const p = detailedMuscle(le.exerciseId, ex.primary, ex.name);
      out[p] = (out[p] ?? 0) + vol;
      for (const m of ex.secondary ?? []) {
        const d = detailedMuscle(le.exerciseId, m, ex.name);
        out[d] = (out[d] ?? 0) + vol * 0.5;
      }
    }
  }
  return out;
}

/** Top exercises contributing to one detailed muscle in a window (primary 1.0, secondary 0.5). */
export function topExercisesForMuscle(
  workouts: Workout[],
  exercisesById: Record<string, Exercise>,
  muscle: string,
  since = 0,
  until = Infinity,
): { exerciseId: string; volume: number }[] {
  const acc: Record<string, number> = {};
  for (const w of workouts) {
    if (!w.finishedAt || w.finishedAt < since || w.finishedAt > until) continue;
    for (const le of w.exercises) {
      const ex = exercisesById[le.exerciseId];
      if (!ex) continue;
      const vol = exerciseVolume(le);
      if (vol <= 0) continue;
      if (detailedMuscle(le.exerciseId, ex.primary, ex.name) === muscle) acc[le.exerciseId] = (acc[le.exerciseId] ?? 0) + vol;
      for (const m of ex.secondary ?? [])
        if (detailedMuscle(le.exerciseId, m, ex.name) === muscle) acc[le.exerciseId] = (acc[le.exerciseId] ?? 0) + vol * 0.5;
    }
  }
  return Object.entries(acc)
    .map(([exerciseId, volume]) => ({ exerciseId, volume }))
    .sort((a, b) => b.volume - a.volume);
}

/** Smart banners for the muscle map. Deterministic + conservative. */
export function muscleAlerts(vol: Record<string, number>): { kind: 'weak' | 'overload'; text: string }[] {
  const out: { kind: 'weak' | 'overload'; text: string }[] = [];
  const q = vol['Kvadricepsy'] ?? 0;
  const h = vol['Hamstringy'] ?? 0;
  if (q > 0 && h > 0 && q / h >= 3) {
    out.push({
      kind: 'weak',
      text: `Hamstringy máš ${Math.round(q / h)}× slabší než kvadricepsy - přidej RDL nebo leg curl.`,
    });
  } else if (q > 500 && h === 0) {
    out.push({ kind: 'weak', text: 'Hamstringy netrénuješ vůbec - přidej RDL nebo leg curl.' });
  }
  const entries = Object.entries(vol).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (entries.length >= 3 && total > 0) {
    const [topName, topVol] = entries.sort((a, b) => b[1] - a[1])[0];
    const share = topVol / total;
    if (share >= 0.4) {
      out.push({
        kind: 'overload',
        text: `${topName} dělá ${Math.round(share * 100)} % celkového objemu - rozlož zátěž nebo přidej den volna.`,
      });
    }
  }
  return out;
}

/** Number of completed working sets per muscle group in a window (for weekly set targets). */
export function muscleSetCount(
  workouts: Workout[],
  exercisesById: Record<string, Exercise>,
  since = 0,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const w of workouts) {
    if (!w.finishedAt || w.finishedAt < since) continue;
    for (const le of w.exercises) {
      const ex = exercisesById[le.exerciseId];
      if (!ex) continue;
      const sets = le.sets.filter((s) => isCountable(s) && s.type !== 'W').length;
      if (!sets) continue;
      out[ex.primary] = (out[ex.primary] ?? 0) + sets;
    }
  }
  return out;
}

/** ISO-ish week key (year*100 + weekOfYear-ish) using UTC week buckets from epoch. */
function weekBucket(ms: number): number {
  return Math.floor(ms / MS_WEEK);
}

/**
 * Consecutive-week training streak counting back from `now`.
 * Current week counts if trained; otherwise streak measured from last completed week.
 */
export function weekStreak(workouts: Workout[], now: number): number {
  const weeks = new Set<number>();
  for (const w of workouts) if (w.finishedAt) weeks.add(weekBucket(w.finishedAt));
  if (!weeks.size) return 0;
  const thisWeek = weekBucket(now);
  // start from current week if trained, else previous week
  let cursor = weeks.has(thisWeek) ? thisWeek : thisWeek - 1;
  let streak = 0;
  while (weeks.has(cursor)) {
    streak++;
    cursor--;
  }
  return streak;
}

/** Workouts whose finishedAt falls in [now-window, now]. */
export function workoutsInWindow(workouts: Workout[], now: number, windowMs: number): Workout[] {
  return workouts.filter((w) => w.finishedAt && w.finishedAt >= now - windowMs && w.finishedAt <= now);
}

export function weeklyVolume(workouts: Workout[], now: number): number {
  return workoutsInWindow(workouts, now, MS_WEEK).reduce((s, w) => s + workoutVolume(w), 0);
}

/**
 * Composite Strength Score - one motivating number that goes up.
 * Sum of best e1RM across the major compound lifts, scaled. Bodyweight-independent,
 * stable, and only ever increases as PRs land.
 */
const SCORE_LIFTS = ['squat', 'bench-barbell', 'deadlift', 'ohp', 'row-barbell', 'pullup'];
export function strengthScore(workouts: Workout[]): number {
  let total = 0;
  for (const id of SCORE_LIFTS) total += bestE1rm(workouts, id);
  return Math.round(total / 2);
}

/**
 * Average heart rate per exercise (by index) for a finished workout. Segments the timeline: exercise i's
 * window runs from the previous exercise's last completed set (or workout start) to this exercise's last
 * completed set — so it never borrows a neighbour's HR. Only set timestamps inside the workout window
 * count, so imported/edited sets (edit-time doneAt outside the window) are skipped. null = no HR for that
 * exercise.
 */
/**
 * Effective time window for a workout's heart-rate data. Normally [startedAt, finishedAt] — but records
 * edited by older app versions could collapse that window (start === end) while the HR samples themselves
 * survive; in that case fall back to the series' own span so the graph and per-exercise averages still work.
 */
export function hrWindow(w: Workout): { start: number; end: number } | null {
  const s = w.hrSeries;
  if (!s || s.length < 2) return null;
  const start = w.startedAt;
  const end = w.finishedAt ?? w.startedAt;
  if (end > start && s.filter((p) => p.t >= start && p.t <= end).length >= 2) return { start, end };
  const lo = Math.min(...s.map((p) => p.t));
  const hi = Math.max(...s.map((p) => p.t));
  return hi > lo ? { start: lo, end: hi } : null;
}

export function perExerciseHr(w: Workout): (number | null)[] {
  const series = w.hrSeries;
  const n = w.exercises.length;
  if (!series?.length || !n) return w.exercises.map(() => null);
  const win = hrWindow(w);
  if (!win) return w.exercises.map(() => null);
  const winStart = win.start;
  const winEnd = win.end;
  if (winEnd <= winStart) return w.exercises.map(() => null);
  // anchor = last completed set inside the window. Exercises without one (imported records, or sets
  // (re)completed during a later edit whose doneAt falls outside the window) get their boundary
  // interpolated evenly between the surrounding anchors, so every exercise still gets an HR estimate.
  const anchors: (number | null)[] = w.exercises.map((le) => {
    const ts = le.sets
      .map((s) => s.doneAt)
      .filter((t): t is number => typeof t === 'number' && t >= winStart && t <= winEnd);
    return ts.length ? Math.max(...ts) : null;
  });
  const bounds: number[] = new Array(n);
  let i = 0;
  let prev = winStart;
  while (i < n) {
    if (anchors[i] != null) {
      bounds[i] = Math.max(anchors[i]!, prev);
      prev = bounds[i];
      i++;
      continue;
    }
    let j = i;
    while (j < n && anchors[j] == null) j++;
    const right = j < n ? Math.max(anchors[j]!, prev) : winEnd;
    const m = j - i;
    const parts = m + (j < n ? 1 : 0); // the anchored neighbour keeps its own boundary
    for (let k = 0; k < m; k++) bounds[i + k] = prev + ((k + 1) * (right - prev)) / Math.max(1, parts);
    prev = bounds[j - 1];
    i = j;
  }
  const out: (number | null)[] = [];
  let lo = winStart;
  for (let idx = 0; idx < n; idx++) {
    const hi = bounds[idx];
    const hasCompleted = w.exercises[idx].sets.some((s) => s.done);
    if (!hasCompleted || hi <= lo) {
      out.push(null);
      lo = Math.max(lo, hi);
      continue;
    }
    const pts = series.filter((p) => p.t >= lo && p.t <= hi).map((p) => p.bpm);
    out.push(pts.length ? Math.round(pts.reduce((a, b) => a + b, 0) / pts.length) : null);
    lo = hi;
  }
  return out;
}

/** e1RM trend points (sorted by time) for charting one exercise. */
export function e1rmTrend(workouts: Workout[], exerciseId: string): { at: number; value: number }[] {
  const pts: { at: number; value: number }[] = [];
  for (const w of workouts) {
    if (!w.finishedAt) continue;
    let best = 0;
    for (const le of w.exercises) {
      if (le.exerciseId !== exerciseId) continue;
      for (const s of le.sets) if (isCountable(s)) best = Math.max(best, e1rm(s.weight, s.reps));
    }
    if (best > 0) pts.push({ at: w.finishedAt, value: best });
  }
  return pts.sort((a, b) => a.at - b.at);
}

export const MS = { DAY: MS_DAY, WEEK: MS_WEEK };
