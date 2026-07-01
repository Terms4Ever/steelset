import { Platform } from 'react-native';

import type { HrSample } from '@/data/types';

// Apple Health (HealthKit) wrapper. iOS only. Calls degrade safely.
// Cannot be tested off-device — healthSelfTest() surfaces real errors on the phone.

const HR = 'HKQuantityTypeIdentifierHeartRate';
const BODYMASS = 'HKQuantityTypeIdentifierBodyMass';
const WORKOUT = 'HKWorkoutTypeIdentifier';
const READ = [HR, BODYMASS, WORKOUT];
// Steelset does NOT write workouts to Apple Health (that clutters the Fitness/Kondice app).
// Workout write permission is requested only so the user can clean up test entries a previous
// version saved — see deleteMyHealthWorkouts().
const SHARE = [WORKOUT];

export interface HealthWorkout {
  uuid: string;
  activityType: number;
  name: string;
  start: number; // epoch ms
  end: number; // epoch ms
  durationSec: number;
  energyKcal?: number;
}

// HKWorkoutActivityType (numeric) → Czech label for common activities; unknown → "Trénink".
const ACTIVITY_CZ: Record<number, string> = {
  50: 'Silový trénink',
  20: 'Funkční síla',
  59: 'Core',
  63: 'HIIT',
  11: 'Kruhový trénink',
  37: 'Běh',
  52: 'Chůze',
  13: 'Kolo',
  24: 'Turistika',
  35: 'Veslování',
  16: 'Eliptical',
  44: 'Schody',
  57: 'Jóga',
  66: 'Pilates',
  62: 'Flexibilita',
  64: 'Švihadlo',
  65: 'Kickbox',
  8: 'Box',
  73: 'Kardio',
  80: 'Zklidnění',
};
function activityName(type: number): string {
  return ACTIVITY_CZ[type] ?? 'Trénink';
}

function hk(): any | null {
  if (Platform.OS !== 'ios') return null;
  try {
    return require('@kingstinct/react-native-healthkit');
  } catch {
    return null;
  }
}

export async function healthAvailable(): Promise<boolean> {
  const m = hk();
  if (!m) return false;
  try {
    const fn = m.isHealthDataAvailableAsync ?? m.isHealthDataAvailable;
    return fn ? !!(await fn()) : true;
  } catch {
    return false;
  }
}

export async function requestHealth(): Promise<boolean> {
  const m = hk();
  if (!m?.requestAuthorization) return false;
  try {
    return !!(await m.requestAuthorization({ toShare: SHARE, toRead: READ }));
  } catch {
    return false;
  }
}

/** Delete every workout Steelset previously wrote to Apple Health. HealthKit only lets an app
 *  delete its OWN samples, so this never touches Apple Watch / other apps' workouts. Returns count. */
export async function deleteMyHealthWorkouts(): Promise<number> {
  const m = hk();
  if (!m?.deleteObjects) return 0;
  try {
    const n = await m.deleteObjects(WORKOUT, { date: { startDate: new Date(2015, 0, 1), endDate: new Date() } });
    return typeof n === 'number' ? n : 0;
  } catch {
    return 0;
  }
}

/** Time series of heart rate for a window — raw per-sample bpm, sorted by time. */
export async function heartRateSeries(startMs: number, endMs: number): Promise<HrSample[]> {
  const m = hk();
  if (!m?.queryQuantitySamples || endMs <= startMs) return [];
  try {
    // limit is REQUIRED (0 = all); date window goes under filter.date.{startDate,endDate}.
    const samples = await m.queryQuantitySamples(HR, {
      unit: 'count/min',
      limit: 0,
      filter: { date: { startDate: new Date(startMs), endDate: new Date(endMs) } },
    });
    return (samples ?? [])
      .map((s: any) => ({ t: new Date(s?.startDate).getTime(), bpm: Math.round(s?.quantity) }))
      .filter((x: HrSample) => Number.isFinite(x.t) && Number.isFinite(x.bpm) && x.bpm > 0)
      .sort((a: HrSample, b: HrSample) => a.t - b.t);
  } catch {
    return [];
  }
}

/** Avg/max from an HR series (pure). */
export function hrStats(series: HrSample[]): { avg?: number; max?: number } {
  if (!series.length) return {};
  const vals = series.map((s) => s.bpm);
  return {
    avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    max: Math.max(...vals),
  };
}

/** Convenience: HR series + avg/max for a window in one call. */
export async function heartRateFor(startMs: number, endMs: number): Promise<{ avg?: number; max?: number; series: HrSample[] }> {
  const series = await heartRateSeries(startMs, endMs);
  return { ...hrStats(series), series };
}

/** Recent Apple Health / Kondice workouts (Watch etc.) available to import. */
export async function listHealthWorkouts(sinceMs = Date.now() - 30 * 86400000, limit = 40): Promise<HealthWorkout[]> {
  const m = hk();
  if (!m?.queryWorkoutSamples) return [];
  try {
    const res = await m.queryWorkoutSamples({
      limit,
      ascending: false,
      filter: { date: { startDate: new Date(sinceMs) } },
    });
    return (res ?? [])
      .map((proxy: any) => {
        // WorkoutProxy is a native object; toJSON() gives a plain, reliably-readable snapshot.
        const w = typeof proxy?.toJSON === 'function' ? proxy.toJSON() : proxy;
        const start = new Date(w?.startDate).getTime();
        const end = new Date(w?.endDate).getTime();
        const activityType = Number(w?.workoutActivityType);
        const durationSec =
          typeof w?.duration?.quantity === 'number' ? Math.round(w.duration.quantity) : Math.round((end - start) / 1000);
        return {
          uuid: String(w?.uuid),
          activityType,
          name: activityName(activityType),
          start,
          end,
          durationSec,
          energyKcal: typeof w?.totalEnergyBurned?.quantity === 'number' ? Math.round(w.totalEnergyBurned.quantity) : undefined,
        } as HealthWorkout;
      })
      .filter((w: HealthWorkout) => Number.isFinite(w.start) && Number.isFinite(w.end) && w.end > w.start && !!w.uuid);
  } catch {
    return [];
  }
}

export async function latestBodyweightKg(): Promise<number | null> {
  const m = hk();
  if (!m?.queryQuantitySamples) return null;
  try {
    const samples = await m.queryQuantitySamples(BODYMASS, { unit: 'kg', limit: 1, ascending: false });
    const v = samples?.[0]?.quantity;
    return typeof v === 'number' ? v : null;
  } catch {
    return null;
  }
}

/** Run every Health step and report exactly what worked / failed — for on-device diagnosis. */
export async function healthSelfTest(): Promise<string> {
  if (Platform.OS !== 'ios') return 'Apple Health je dostupné jen na iPhonu.';
  const m = hk();
  if (!m) return 'HealthKit modul se nenačetl (native require selhal).';
  const out: string[] = [];
  const err = (e: any) => (e?.message ? String(e.message) : String(e)).slice(0, 200);

  try {
    const fn = m.isHealthDataAvailableAsync ?? m.isHealthDataAvailable;
    out.push('Dostupnost: ' + (fn ? String(await fn()) : 'fn chybí'));
  } catch (e) {
    out.push('Dostupnost CHYBA: ' + err(e));
  }
  try {
    const r = await m.requestAuthorization({ toShare: SHARE, toRead: READ });
    out.push('Oprávnění (requestAuthorization): ' + String(r));
  } catch (e) {
    out.push('Oprávnění CHYBA: ' + err(e));
  }
  try {
    const res = await m.queryWorkoutSamples({
      limit: 10,
      ascending: false,
      filter: { date: { startDate: new Date(Date.now() - 30 * 86400000) } },
    });
    out.push('Tréninky v Health (30 dní): ' + (res?.length ?? 0));
  } catch (e) {
    out.push('Čtení tréninků CHYBA: ' + err(e));
  }
  try {
    const end = new Date();
    const start = new Date(Date.now() - 6 * 3600 * 1000);
    const samples = await m.queryQuantitySamples(HR, {
      unit: 'count/min',
      limit: 0,
      filter: { date: { startDate: start, endDate: end } },
    });
    const n = samples?.length ?? 0;
    out.push('Tep – vzorků za 6 h: ' + n);
    if (n) out.push('Poslední tep: ' + Math.round(samples[n - 1]?.quantity) + ' /min');
    else out.push('(žádné HR vzorky – zaznamenej trénink na hodinkách v Apple Cvičení a chvíli počkej na sync)');
  } catch (e) {
    out.push('Tep CHYBA: ' + err(e));
  }
  return out.join('\n');
}
