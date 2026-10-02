import { Platform } from 'react-native';

import { MS } from '@/lib/calc';
import { refillHeartRate } from '@/lib/cloudHealth';
import { bodyweightHistoryKg, heartRateFor } from '@/lib/health';
import { useStore } from '@/store/useStore';

/**
 * Po obnovení z iCloudu vrátí data z Apple Health, která záloha schválně nenese (#18):
 * historii vážení pro widget a tep s kaloriemi ke starým tréninkům. Bez propojeného Health nic.
 */
export async function refillHealthAfterRestore(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  const s = useStore.getState();
  if (!s.settings.healthEnabled) return;
  try {
    const log = await bodyweightHistoryKg(Date.now() - 60 * MS.DAY);
    if (log.length) useStore.getState().setBodyweightLog(log);
  } catch {
    // vážení dotáhne i useBodyweightSync při příštím návratu do popředí
  }
  await refillHeartRate(useStore.getState().workouts, heartRateFor, useStore.getState().setWorkoutHr);
}
