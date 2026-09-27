import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';

import { MS } from '@/lib/calc';
import { bodyweightHistoryKg } from '@/lib/health';
import { useStore } from '@/store/useStore';

/** Jak často nejvýš se Health ptá znovu, když se aplikace vrátí do popředí. */
const REFRESH_MS = 60 * 60 * 1000;

/**
 * Drží ve store vážení z Apple Health za 60 dní pro widget tělesné váhy (#16).
 *
 * Načte je po startu a pak při návratu do popředí, nejvýš jednou za hodinu. Prázdný výsledek
 * uloženou historii nepřepíše: Health vrací prázdno i při chybě a widget by pak přišel o trend.
 */
export function useBodyweightSync(ready: boolean) {
  const enabled = useStore((s) => s.settings.healthEnabled);
  useEffect(() => {
    if (!ready || !enabled || Platform.OS !== 'ios') return;
    let lastPull = 0;
    const pull = async () => {
      if (Date.now() - lastPull < REFRESH_MS) return;
      lastPull = Date.now();
      const log = await bodyweightHistoryKg(Date.now() - 60 * MS.DAY);
      if (!log.length) return;
      if (JSON.stringify(log) !== JSON.stringify(useStore.getState().bodyweightLog)) useStore.getState().setBodyweightLog(log);
    };
    pull();
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') pull();
    });
    return () => sub.remove();
  }, [ready, enabled]);
}
