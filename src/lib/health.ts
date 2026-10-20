import { locale, t } from '@/i18n';
import { Platform } from 'react-native';

import type { HrSample } from '@/data/types';
import { DiagWorkout, describeRecentWorkouts } from '@/lib/healthDiag';

// Apple Health (HealthKit) wrapper. iOS only. Calls degrade safely.
// Cannot be tested off-device — healthSelfTest() surfaces real errors on the phone.

const HR = 'HKQuantityTypeIdentifierHeartRate';
const BODYMASS = 'HKQuantityTypeIdentifierBodyMass';
const ACTIVE_ENERGY = 'HKQuantityTypeIdentifierActiveEnergyBurned';
const WORKOUT = 'HKWorkoutTypeIdentifier';
const READ = [HR, BODYMASS, ACTIVE_ENERGY, WORKOUT];
// Telefon do Apple Health nezapisuje a o zápis ani nežádá (#18). Úklid zápisů ze starých verzí
// měli jen testeři a veřejná verze ho nepotřebuje; kontrola Applu se na nevyužitý zápis ptá.
const SHARE: string[] = [];

export interface HealthWorkout {
  uuid: string;
  activityType: number;
  name: string;
  start: number; // epoch ms
  end: number; // epoch ms
  durationSec: number;
  energyKcal?: number;
}

// HKWorkoutActivityType (numeric) → label for common activities in the app language (#20)
function activityName(type: number): string {
  const a = t().activities;
  return a[String(type)] ?? a.other;
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

/** Active energy (kcal) burned in a window — summed from the Watch's samples. */
export async function activeEnergyKcal(startMs: number, endMs: number): Promise<number | undefined> {
  const m = hk();
  if (!m?.queryQuantitySamples || endMs <= startMs) return undefined;
  try {
    const samples = await m.queryQuantitySamples(ACTIVE_ENERGY, {
      unit: 'kcal',
      limit: 0,
      filter: { date: { startDate: new Date(startMs), endDate: new Date(endMs) } },
    });
    const total = (samples ?? []).reduce((sum: number, s: any) => (typeof s?.quantity === 'number' ? sum + s.quantity : sum), 0);
    return total > 0 ? Math.round(total) : undefined;
  } catch {
    return undefined;
  }
}

/** Convenience: HR series + avg/max + burned kcal for a window in one call. */
export async function heartRateFor(
  startMs: number,
  endMs: number,
): Promise<{ avg?: number; max?: number; series: HrSample[]; kcal?: number }> {
  const [series, kcal] = await Promise.all([heartRateSeries(startMs, endMs), activeEnergyKcal(startMs, endMs)]);
  return { ...hrStats(series), series, kcal };
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

/**
 * Vážení z Health od `sinceMs` do teď, nejstarší první. Pro widget tělesné váhy (#16).
 * Stejný tvar dotazu jako u tepu: `limit` je povinný (0 = vše) a okno patří do `filter.date`.
 */
export async function bodyweightHistoryKg(sinceMs: number): Promise<{ at: number; kg: number }[]> {
  const m = hk();
  if (!m?.queryQuantitySamples) return [];
  try {
    const samples = await m.queryQuantitySamples(BODYMASS, {
      unit: 'kg',
      limit: 0,
      filter: { date: { startDate: new Date(sinceMs), endDate: new Date() } },
    });
    return (samples ?? [])
      .map((s: any) => ({ at: new Date(s?.startDate).getTime(), kg: Math.round(s?.quantity * 10) / 10 }))
      .filter((x: { at: number; kg: number }) => Number.isFinite(x.at) && Number.isFinite(x.kg) && x.kg > 0)
      .sort((a: { at: number }, b: { at: number }) => a.at - b.at);
  } catch {
    return [];
  }
}

/** Run every Health step and report exactly what worked / failed — for on-device diagnosis. */
export async function healthSelfTest(): Promise<string> {
  const d = t().diag;
  if (Platform.OS !== 'ios') return d.iphoneOnly;
  const m = hk();
  if (!m) return d.noModule;
  const out: string[] = [];
  const err = (e: any) => (e?.message ? String(e.message) : String(e)).slice(0, 200);

  try {
    const fn = m.isHealthDataAvailableAsync ?? m.isHealthDataAvailable;
    out.push(d.available + ': ' + (fn ? String(await fn()) : d.fnMissing));
  } catch (e) {
    out.push('Dostupnost CHYBA: ' + err(e));
  }
  try {
    const r = await m.requestAuthorization({ toShare: SHARE, toRead: READ });
    out.push(d.permission + ': ' + String(r));
  } catch (e) {
    out.push(d.permissionError + ': ' + err(e));
  }
  try {
    const res = await m.queryWorkoutSamples({
      limit: 10,
      ascending: false,
      filter: { date: { startDate: new Date(Date.now() - 30 * 86400000) } },
    });
    out.push(d.workouts30 + ': ' + (res?.length ?? 0));
    // kalorie u posledních tréninků: bez nich Kondice ukáže čas (#25)
    const recent: DiagWorkout[] = [];
    for (const proxy of (res ?? []).slice(0, 5)) {
      const w = typeof proxy?.toJSON === 'function' ? proxy.toJSON() : proxy;
      let activeKcal: number | undefined;
      try {
        const stat = await proxy?.getStatistic?.(ACTIVE_ENERGY, 'kcal');
        if (typeof stat?.sumQuantity?.quantity === 'number') activeKcal = stat.sumQuantity.quantity;
      } catch {
        /* statistika chybí, zůstane totalEnergyBurned */
      }
      recent.push({
        start: new Date(w?.startDate).getTime(),
        durationSec: typeof w?.duration?.quantity === 'number' ? w.duration.quantity : 0,
        source: String(w?.sourceRevision?.source?.name ?? '?'),
        activeKcal,
        totalKcal: typeof w?.totalEnergyBurned?.quantity === 'number' ? w.totalEnergyBurned.quantity : undefined,
      });
    }
    if (recent.length) {
      out.push(d.recentWorkouts + ':');
      out.push(...describeRecentWorkouts(recent, (ms) => new Date(ms).toLocaleString(locale()), d.kcalMissing));
    }
  } catch (e) {
    out.push(d.workoutsError + ': ' + err(e));
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
    out.push(d.hr6h + ': ' + n);
    if (n) out.push(d.lastHr + ': ' + Math.round(samples[n - 1]?.quantity) + ' /min');
    else out.push(d.noHr);
  } catch (e) {
    out.push(d.hrError + ': ' + err(e));
  }
  return out.join('\n');
}
