import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { HealthWorkout, listHealthWorkouts } from '@/lib/health';
import { localCoversWindow, useStore } from '@/store/useStore';

/**
 * Scans Apple Health for workouts not yet imported or dismissed.
 * Runs on mount and whenever the app returns to the foreground (Strava-style detection).
 */
export function useHealthScan(): HealthWorkout[] {
  const healthEnabled = useStore((s) => s.settings.healthEnabled);
  const hydrated = useStore((s) => s._hydrated);
  const workouts = useStore((s) => s.workouts);
  const dismissed = useStore((s) => s.dismissedHealth);
  const [list, setList] = useState<HealthWorkout[]>([]);

  const seen = useMemo(() => {
    const set = new Set<string>(dismissed);
    workouts.forEach((w) => w.healthUuid && set.add(w.healthUuid));
    return set;
  }, [workouts, dismissed]);

  const scan = useCallback(async () => {
    if (!healthEnabled || Platform.OS !== 'ios') {
      setList([]);
      return;
    }
    setList(await listHealthWorkouts());
  }, [healthEnabled]);

  useEffect(() => {
    if (!hydrated) return;
    scan();
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') scan();
    });
    return () => sub.remove();
  }, [hydrated, scan]);

  // reactive to imports/dismissals without re-querying Health; skip sessions already logged live in Steelset
  return useMemo(
    () => list.filter((hw) => !seen.has(hw.uuid) && !localCoversWindow(workouts, hw.start, hw.end)),
    [list, seen, workouts],
  );
}
