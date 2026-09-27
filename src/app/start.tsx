import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { palette } from '@/constants/theme';
import { activeWorkout, useStore } from '@/store/useStore';

/**
 * Cíl odkazu z widgetu: `steelset://start?routine=<id>` spustí trénink podle plánu,
 * `steelset://start` volný trénink (#16). Obrazovka nic nevykresluje, jen rozhodne a přepne.
 *
 * Chová se stejně jako tlačítko na Dnešku: když už trénink běží, jen ho otevře a druhý nezaloží.
 * Plán, který mezitím zmizel, trénink nespustí, ale pošle na Dnešek, ať si uživatel vybere sám.
 * Widget se sice po smazání plánu přepíše, jenže systém ho může překreslit se zpožděním.
 */
export default function Start() {
  const { routine } = useLocalSearchParams<{ routine?: string }>();
  const router = useRouter();
  // v dev režimu React efekt pouští dvakrát a dvakrát spuštěný trénink by byly dva záznamy
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const s = useStore.getState();
    // bez dokončeného onboardingu přesměruje kořenový layout, tady se nic nezakládá
    if (!s.settings.onboarded) return;
    if (activeWorkout(s)) {
      router.replace('/workout');
      return;
    }
    if (routine && !s.routines.some((r) => r.id === routine)) {
      router.replace('/');
      return;
    }
    s.startWorkout(routine ?? null);
    router.replace('/workout');
  }, [routine, router]);

  return <View style={{ flex: 1, backgroundColor: palette.bg }} />;
}
