import type { HrSample, Workout } from '@/data/types';

/**
 * Data z Apple Health do iCloudu nesmí (#18). Pravidlo Applu 5.1.3 (ii): aplikace „may not store
 * personal health information in iCloud". Záloha proto nese tréninky bez tepu a kalorií a bez
 * historie vážení; v telefonu zůstávají a po obnovení na novém telefonu se načtou znovu z Health.
 *
 * Tělesná váha v nastavení a její snímek u tréninku zůstávají: zadává je uživatel v aplikaci
 * a bez snímku by se u cviků s vlastní vahou rozbilo zobrazení přídavku (+KG).
 */
export const HEALTH_WORKOUT_FIELDS = ['avgHr', 'maxHr', 'kcal', 'hrSeries'] as const;
export const HEALTH_STATE_FIELDS = ['bodyweightLog'] as const;

type Persisted = { state?: Record<string, any>; version?: number };

function parse(json: string | null): Persisted | null {
  if (!json) return null;
  try {
    const p = JSON.parse(json);
    return p && typeof p === 'object' ? p : null;
  } catch {
    return null;
  }
}

function withoutHealth<T extends Record<string, any>>(w: T): T {
  if (!w || typeof w !== 'object') return w;
  const copy: Record<string, any> = { ...w };
  for (const f of HEALTH_WORKOUT_FIELDS) delete copy[f];
  return copy as T;
}

/** Persist store připravený pro iCloud: bez polí z Apple Health. Nečitelný vstup vrátí beze změny. */
export function stripHealthForCloud(persistedJson: string): string {
  const p = parse(persistedJson);
  if (!p?.state) return persistedJson;
  const state: Record<string, any> = { ...p.state };
  for (const f of HEALTH_STATE_FIELDS) delete state[f];
  for (const key of ['workouts', 'trashedWorkouts']) {
    if (Array.isArray(state[key])) state[key] = state[key].map(withoutHealth);
  }
  return JSON.stringify({ ...p, state });
}

/**
 * Obnova z iCloudu přepíše místní data. Co z Health telefon už měl, se tím ztratit nesmí:
 * tep a kalorie se vrátí k tréninkům se stejným `id` a historie vážení zůstane místní.
 */
export function keepLocalHealth(cloudJson: string, localJson: string | null): string {
  const cloud = parse(cloudJson);
  const local = parse(localJson);
  if (!cloud?.state || !local?.state) return cloudJson;

  const health = new Map<string, Record<string, any>>();
  for (const key of ['workouts', 'trashedWorkouts']) {
    for (const w of Array.isArray(local.state[key]) ? local.state[key] : []) {
      if (!w?.id) continue;
      const h: Record<string, any> = {};
      for (const f of HEALTH_WORKOUT_FIELDS) if (w[f] != null) h[f] = w[f];
      if (Object.keys(h).length) health.set(w.id, h);
    }
  }

  const state: Record<string, any> = { ...cloud.state };
  for (const key of ['workouts', 'trashedWorkouts']) {
    if (Array.isArray(state[key])) state[key] = state[key].map((w: any) => (w?.id && health.has(w.id) ? { ...w, ...health.get(w.id) } : w));
  }
  for (const f of HEALTH_STATE_FIELDS) if (local.state[f] != null) state[f] = local.state[f];
  return JSON.stringify({ ...cloud, state });
}

/** Tréninky, kterým po obnovení chybí tep: dokončené, živě zapsané a bez řady tepu. Nejnovější první. */
export function workoutsMissingHr(workouts: Workout[], limit = 200): Workout[] {
  return workouts
    .filter((w) => !!w.finishedAt && !w.manual && !w.hrSeries?.length && w.avgHr == null)
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, limit);
}

type HrResult = { avg?: number; max?: number; series: HrSample[]; kcal?: number };

/**
 * Po obnovení z iCloudu dotáhne tep z Health ke starým tréninkům. Jde postupně, ať se HealthKit
 * nezahltí; trénink, ke kterému Health nic nemá, se jen přeskočí. Vrací počet doplněných.
 */
export async function refillHeartRate(
  workouts: Workout[],
  fetchHr: (start: number, end: number) => Promise<HrResult>,
  save: (id: string, avg?: number, max?: number, series?: HrSample[], kcal?: number) => void,
): Promise<number> {
  let filled = 0;
  for (const w of workoutsMissingHr(workouts)) {
    try {
      const hr = await fetchHr(w.startedAt, w.finishedAt!);
      if (hr.avg || hr.max || hr.kcal || hr.series.length) {
        save(w.id, hr.avg, hr.max, hr.series.length ? hr.series : undefined, hr.kcal);
        filled++;
      }
    } catch {
      // jeden nepovedený dotaz nezastaví ostatní
    }
  }
  return filled;
}
