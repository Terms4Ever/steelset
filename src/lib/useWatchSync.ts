import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { heartRateFor } from '@/lib/health';
import { watch } from '@/lib/watch';
import { finishFromWatch, startWatchSync } from '@/lib/watchSync';
import { useStore } from '@/store/useStore';

/** Tep pro trénink ukončený z hodinek. Hodinky ho ukládají do Health až po konci, proto chvíli počká. */
function pullHeartRateLater(workoutId: string, startedAt: number, end: number) {
  setTimeout(() => {
    const s = useStore.getState();
    if (!s.settings.healthEnabled) return;
    heartRateFor(startedAt, end).then((hr) => {
      if (hr.avg || hr.max || hr.kcal || hr.series.length) {
        useStore.getState().setWorkoutHr(workoutId, hr.avg, hr.max, hr.series.length ? hr.series : undefined, hr.kcal);
      }
    });
  }, 8000);
}

export function useWatchSync(ready: boolean) {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    if (!ready || !watch.available()) return;
    const stop = startWatchSync();

    const onEnded = (workoutId: string) => {
      const s = useStore.getState();
      const w = s.workouts.find((x) => x.id === s.activeWorkoutId);
      const end = Date.now();
      if (!finishFromWatch(workoutId)) return;
      if (w) pullHeartRateLater(w.id, w.startedAt, end);
      if (pathRef.current === '/workout') router.replace('/');
    };
    // nejdřív odběr, pak vyzvednout konec, který přišel před ním; jinak by mezi tím propadl
    const off = watch.onEnded(onEnded);
    const pending = watch.takePendingEnded();
    if (pending != null) onEnded(pending);
    return () => {
      off();
      stop();
    };
  }, [ready, router]);
}
