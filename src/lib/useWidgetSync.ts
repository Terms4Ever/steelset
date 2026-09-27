import { useEffect } from 'react';

import { writeWidgetSnapshot } from '@/lib/widgetData';
import { buildWidgetSnapshot } from '@/lib/widgetSnapshot';
import { exercisesById, useStore } from '@/store/useStore';

/** Po poslední změně se počká tolik, než se snímek zapíše. Při zápisu sérií jde změn víc za sebou. */
const DEBOUNCE_MS = 800;

/**
 * Drží snímek pro widgety v souladu se store (#16).
 *
 * Zapíše hned a pak po každé změně store, se zpožděním a jen když se snímek opravdu liší.
 * Tím se pokryje dopsání série, ukončení tréninku i úprava plánu, aniž by to každá obrazovka
 * musela hlídat sama. Klouzavé okno „tento týden" si widget posouvá sám, na to zápis netřeba.
 *
 * Vrací funkci, která synchronizaci zastaví. Mimo hook ji volá test.
 */
export function startWidgetSync(write: (json: string) => void = writeWidgetSnapshot, debounceMs = DEBOUNCE_MS): () => void {
  let last = '';
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    timer = null;
    const s = useStore.getState();
    const json = JSON.stringify(
      buildWidgetSnapshot(
        {
          workouts: s.workouts,
          routines: s.routines,
          activeWorkoutId: s.activeWorkoutId,
          unit: s.settings.unit,
          exercisesById: exercisesById(s),
        },
        Date.now(),
      ),
    );
    if (json === last) return;
    last = json;
    write(json);
  };

  flush();
  const unsub = useStore.subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, debounceMs);
  });
  return () => {
    unsub();
    if (timer) clearTimeout(timer);
  };
}

export function useWidgetSync(ready: boolean) {
  useEffect(() => (ready ? startWidgetSync() : undefined), [ready]);
}
