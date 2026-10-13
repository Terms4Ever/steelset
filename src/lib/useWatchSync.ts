import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { heartRateFor } from '@/lib/health';
import { logWatch, watch } from '@/lib/watch';
import type { WatchEnded } from '@/lib/watchState';
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

    const onEnded = (ended: WatchEnded, via: string) => {
      const s = useStore.getState();
      const w = s.workouts.find((x) => x.id === s.activeWorkoutId);
      const result = finishFromWatch(ended);
      void logWatch(`konec z hodinek (${via}): ${result.reason}`);
      if (!result.finished) return;
      if (w) pullHeartRateLater(w.id, w.startedAt, ended.at);
      if (pathRef.current === '/workout') router.replace('/');
    };
    // Nativní strana drží konec, dokud si ho JS nevyzvedne. Vyzvedává se po startu, po události
    // i při návratu do popředí: konec, který přišel, když aplikace spala, se tak neztratí (#23).
    const takePending = (via: string) => {
      const pending = watch.takePendingEnded();
      if (pending) onEnded(pending, via);
    };
    // nejdřív odběr, pak vyzvednout konec, který přišel před ním; jinak by mezi tím propadl
    const off = watch.onEnded(() => takePending('událost'));
    takePending('start aplikace');
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') takePending('návrat do popředí');
    });
    return () => {
      off();
      sub.remove();
      stop();
    };
  }, [ready, router]);
}
