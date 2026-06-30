import { Platform } from 'react-native';

// Defensive Apple Health (HealthKit) wrapper. iOS only; every call degrades to a
// safe no-op so the app never crashes if Health is unavailable or the API shifts.
// Validated on-device (TestFlight) — HealthKit cannot run on web/simulator-less envs.

function hk(): any | null {
  if (Platform.OS !== 'ios') return null;
  try {
    return require('@kingstinct/react-native-healthkit');
  } catch {
    return null;
  }
}

const READ = ['HKQuantityTypeIdentifierHeartRate', 'HKQuantityTypeIdentifierBodyMass'];
const SHARE = ['HKWorkoutTypeIdentifier', 'HKQuantityTypeIdentifierBodyMass', 'HKQuantityTypeIdentifierActiveEnergyBurned'];

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

/** Prompt the HealthKit permission sheet for the data we read/write. */
export async function requestHealth(): Promise<boolean> {
  const m = hk();
  if (!m?.requestAuthorization) return false;
  try {
    return !!(await m.requestAuthorization({ toShare: SHARE, toRead: READ }));
  } catch {
    return false;
  }
}

/** Write a completed strength-training workout to Apple Health. */
export async function saveWorkout(startMs: number, endMs: number): Promise<void> {
  const m = hk();
  if (!m?.saveWorkoutSample || endMs <= startMs) return;
  try {
    await m.saveWorkoutSample('traditionalStrengthTraining', [], new Date(startMs), new Date(endMs));
  } catch {
    // ignore
  }
}

/** Avg/max heart rate for a time window (as recorded by an Apple Watch workout). */
export async function heartRateFor(startMs: number, endMs: number): Promise<{ avg?: number; max?: number }> {
  const m = hk();
  if (!m?.queryStatisticsForQuantity || endMs <= startMs) return {};
  try {
    const res = await m.queryStatisticsForQuantity(
      'HKQuantityTypeIdentifierHeartRate',
      ['discreteAverage', 'discreteMax'],
      { filter: { startDate: new Date(startMs), endDate: new Date(endMs) }, unit: 'count/min' },
    );
    const avg = res?.averageQuantity?.quantity;
    const max = res?.maximumQuantity?.quantity;
    return { avg: avg ? Math.round(avg) : undefined, max: max ? Math.round(max) : undefined };
  } catch {
    return {};
  }
}

/** Most recent body weight (kg) from Health, or null. */
export async function latestBodyweightKg(): Promise<number | null> {
  const m = hk();
  if (!m?.queryQuantitySamples) return null;
  try {
    const samples = await m.queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', {
      unit: 'kg',
      limit: 1,
      ascending: false,
    });
    const v = samples?.[0]?.quantity;
    return typeof v === 'number' ? v : null;
  } catch {
    return null;
  }
}
