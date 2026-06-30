import { Platform } from 'react-native';

// Apple Health (HealthKit) wrapper. iOS only. Calls degrade safely.
// Cannot be tested off-device — healthSelfTest() surfaces real errors on the phone.

const HR = 'HKQuantityTypeIdentifierHeartRate';
const BODYMASS = 'HKQuantityTypeIdentifierBodyMass';
const READ = [HR, BODYMASS];
const SHARE = ['HKWorkoutTypeIdentifier', BODYMASS, 'HKQuantityTypeIdentifierActiveEnergyBurned'];

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

export async function saveWorkout(startMs: number, endMs: number): Promise<void> {
  const m = hk();
  if (!m?.saveWorkoutSample || endMs <= startMs) return;
  try {
    await m.saveWorkoutSample('traditionalStrengthTraining', [], new Date(startMs), new Date(endMs));
  } catch {
    // ignore
  }
}

/** Avg/max heart rate for a window — reads raw HR samples (more reliable than statistics). */
export async function heartRateFor(startMs: number, endMs: number): Promise<{ avg?: number; max?: number }> {
  const m = hk();
  if (!m?.queryQuantitySamples || endMs <= startMs) return {};
  try {
    const samples = await m.queryQuantitySamples(HR, {
      unit: 'count/min',
      filter: { startDate: new Date(startMs), endDate: new Date(endMs) },
    });
    const vals: number[] = (samples ?? []).map((s: any) => s?.quantity).filter((v: any) => typeof v === 'number');
    if (!vals.length) return {};
    return {
      avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      max: Math.round(Math.max(...vals)),
    };
  } catch {
    return {};
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
    const end = new Date();
    const start = new Date(Date.now() - 10 * 60 * 1000);
    await m.saveWorkoutSample('traditionalStrengthTraining', [], start, end);
    out.push('Zápis test tréninku: OK (mrkni v Apple Health → Workouts)');
  } catch (e) {
    out.push('Zápis CHYBA: ' + err(e));
  }
  try {
    const end = new Date();
    const start = new Date(Date.now() - 6 * 3600 * 1000);
    const samples = await m.queryQuantitySamples(HR, { unit: 'count/min', filter: { startDate: start, endDate: end } });
    const n = samples?.length ?? 0;
    out.push('Tep – vzorků za 6 h: ' + n);
    if (n) out.push('Poslední tep: ' + Math.round(samples[n - 1]?.quantity) + ' /min');
    else out.push('(žádné HR vzorky – zaznamenej trénink na hodinkách v Apple Cvičení a chvíli počkej na sync)');
  } catch (e) {
    out.push('Tep CHYBA: ' + err(e));
  }
  return out.join('\n');
}
