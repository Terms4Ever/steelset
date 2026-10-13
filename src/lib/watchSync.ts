import { liveActivity } from '@/lib/liveActivity';
import { watch } from '@/lib/watch';
import { endedState, runningState, startsWatch, type WatchEnded } from '@/lib/watchState';
import { exercisesById, useStore } from '@/store/useStore';

export type WatchApi = Pick<typeof watch, 'startFor' | 'end' | 'forget'>;

/**
 * Drží hodinky v souladu s tréninkem v telefonu (#15).
 *
 * Start a konec hlídá na `activeWorkoutId`, ne v jednotlivých obrazovkách: trénink jde ukončit
 * i zahodit z víc míst a hodinky se o tom musí dozvědět vždy. Odpočinek a další sérii posílá
 * obrazovka tréninku, ta jediná zná odpočet.
 */
export function startWatchSync(api: WatchApi = watch, now: () => number = Date.now): () => void {
  const sync = (prevId: string | null, nextId: string | null) => {
    const s = useStore.getState();
    if (prevId && prevId !== nextId) {
      // zahozený trénink z `workouts` zmizí (jde do koše), hodinky ho pak neuloží
      const kept = s.workouts.some((w) => w.id === prevId);
      api.end(endedState(prevId, !kept, now()));
    }
    if (nextId && nextId !== prevId && s.settings.watchAutoStart !== false) {
      const w = s.workouts.find((x) => x.id === nextId);
      if (w && startsWatch(w, now())) api.startFor(runningState(w, null, exercisesById(s), now()));
    }
  };

  // trénink běžel už před spuštěním aplikace: hodinky se probudí znovu, běžící záznam si nechají
  sync(null, useStore.getState().activeWorkoutId);
  let last = useStore.getState().activeWorkoutId;
  return useStore.subscribe((s) => {
    if (s.activeWorkoutId === last) return;
    const prev = last;
    last = s.activeWorkoutId;
    sync(prev, last);
  });
}

export type FinishFromWatch = { finished: boolean; reason: string };

/**
 * Hodinky ukončily trénink. Telefon ho ukončí taky, pokud má aspoň jednu hotovou sérii; bez ní
 * zůstane otevřený, aby se potichu nezahodil (AGENTS, pravidlo 7).
 *
 * Na shodě id nezáleží: hodinky běží jen pro jeden trénink a jejich id může zaostat za telefonem.
 * Konec, který padl dřív, než aktuální trénink začal, je ale z minula a ukončit ho nesmí (#23).
 */
export function finishFromWatch(ended: WatchEnded, api: Pick<WatchApi, 'forget'> = watch): FinishFromWatch {
  const s = useStore.getState();
  const activeId = s.activeWorkoutId;
  if (!activeId) return { finished: false, reason: 'v telefonu neběží trénink' };
  const w = s.workouts.find((x) => x.id === activeId);
  if (!w || w.manual) return { finished: false, reason: 'aktivní trénink není živý' };
  if (ended.at < w.startedAt) return { finished: false, reason: 'konec je z minulého tréninku' };
  api.forget(activeId);
  if (!w.exercises.some((le) => le.sets.some((st) => st.done))) {
    return { finished: false, reason: 'trénink nemá hotovou sérii, zůstal otevřený' };
  }
  liveActivity.end();
  s.finishWorkout();
  return { finished: true, reason: ended.workoutId && ended.workoutId !== activeId ? 'ukončen (id se lišilo)' : 'ukončen' };
}
