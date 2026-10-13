import { Platform } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { WatchEnded, WatchState } from '@/lib/watchState';

// Most k hodinkové aplikaci (#15). Jen iOS s nativním modulem, jinde se nic nestane (web, Expo Go).

let mod: any = null;
if (Platform.OS === 'ios') {
  try {
    const { requireNativeModule } = require('expo-modules-core');
    mod = requireNativeModule('SteelsetWatchBridge');
  } catch {
    mod = null;
  }
}

let startedForId: string | null = null;

export const watch = {
  available: () => !!mod,

  /** Spustí trénink na hodinkách. Pro stejný trénink jen jednou, i když se volá opakovaně. */
  startFor(state: WatchState) {
    if (!mod || startedForId === state.workoutId) return;
    startedForId = state.workoutId;
    try {
      // kontext jde napřed, ať ho hodinky po probuzení najdou
      mod.pushState(state);
      mod
        .startWorkout()
        .then((ok: boolean) => logWatch(ok ? 'hodinky spuštěné' : 'hodinky nespuštěné (nejsou spárované nebo nemají aplikaci)'))
        .catch(() => logWatch('spuštění hodinek selhalo'));
    } catch {
      /* bez hodinek se nic neděje */
    }
  },

  push(state: WatchState) {
    if (!mod || startedForId !== state.workoutId) return;
    try {
      mod.pushState(state);
    } catch {
      /* ignore */
    }
  },

  /** Konec v telefonu ukončí i hodinky. Jen u tréninku, který hodinky spustil. */
  end(state: WatchState) {
    if (!mod || startedForId !== state.workoutId) return;
    startedForId = null;
    void logWatch(state.discard ? 'trénink zahozen, hodinky končí bez uložení' : 'trénink skončil v telefonu, hodinky končí');
    try {
      mod.pushState(state);
    } catch {
      /* ignore */
    }
  },

  /** Hodinky ukončily trénink. Vrací odhlášení. */
  onEnded(listener: (ended: WatchEnded) => void): () => void {
    if (!mod?.addListener) return () => {};
    const sub = mod.addListener('onWatchEnded', (e: any) => listener(toEnded(e)));
    return () => sub?.remove?.();
  },

  /**
   * Konec z hodinek, který si JS ještě nevyzvedl: přišel před odběrem nebo když aplikace spala.
   * Nativní strana ho drží, dokud ho tohle nevyzvedne (#23).
   */
  takePendingEnded(): WatchEnded | null {
    if (!mod) return null;
    try {
      const e = mod.takePendingEnded();
      return e ? toEnded(e) : null;
    } catch {
      return null;
    }
  },

  /** Hodinky ukončily trénink: dál už se jim nic neposílá. */
  forget(workoutId: string) {
    if (startedForId === workoutId) startedForId = null;
  },
};

function toEnded(e: any): WatchEnded {
  return { workoutId: typeof e?.workoutId === 'string' ? e.workoutId : '', at: typeof e?.at === 'number' ? e.at : Date.now() };
}

const LOG_KEY = 'steelset-watch-log';
const LOG_MAX = 20;

/**
 * Deník událostí hodinek v telefonu (#23). Konec z hodinek nejde z Windows vyzkoušet, takže když
 * se zase něco ztratí, Profil ukáže, co telefon dostal a jak s tím naložil.
 */
export async function logWatch(text: string, now = Date.now()): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(LOG_KEY);
    const list: { at: number; text: string }[] = raw ? JSON.parse(raw) : [];
    list.push({ at: now, text });
    await AsyncStorage.setItem(LOG_KEY, JSON.stringify(list.slice(-LOG_MAX)));
  } catch {
    /* deník nesmí shodit nic jiného */
  }
}

export async function readWatchLog(): Promise<{ at: number; text: string }[]> {
  try {
    const raw = await AsyncStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
