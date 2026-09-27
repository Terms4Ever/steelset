import { useEffect } from 'react';

import { writeWidgetSnapshot } from '@/lib/widgetData';
import { buildWidgetSnapshot } from '@/lib/widgetSnapshot';
import { exercisesById, useStore } from '@/store/useStore';

/** Po poslední změně se počká tolik, než se snímek zapíše. Při zápisu sérií jde změn víc za sebou. */
const DEBOUNCE_MS = 800;

/**
 * Drží snímek pro widgety v souladu se store (#16).
 *
 * Zapisuje po načtení dat a pak po každé změně, se zpožděním a jen když se snímek opravdu liší.
 * Tím se pokryje dopsání série, ukončení tréninku i úprava plánu, aniž by to každá obrazovka
 * musela hlídat sama. Klouzavé okno „tento týden" si widget posouvá sám, na to zápis netřeba.
 */
export function useWidgetSync(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    let last = '';
    let timer: ReturnType<typeof setTimeout> | null = null;

    const write = () => {
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
      writeWidgetSnapshot(json);
    };

    write();
    const unsub = useStore.subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(write, DEBOUNCE_MS);
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, [ready]);
}
