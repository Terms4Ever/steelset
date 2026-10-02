import { Platform } from 'react-native';

import type { WatchState } from '@/lib/watchState';

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
      mod.startWorkout().catch(() => {});
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
    try {
      mod.pushState(state);
    } catch {
      /* ignore */
    }
  },

  /** Hodinky ukončily trénink. Vrací odhlášení. */
  onEnded(listener: (workoutId: string) => void): () => void {
    if (!mod?.addListener) return () => {};
    const sub = mod.addListener('onWatchEnded', (e: { workoutId?: string }) => listener(e?.workoutId ?? ''));
    return () => sub?.remove?.();
  },

  /** Konec z hodinek, který přišel, než se JS stihl přihlásit k odběru. */
  takePendingEnded(): string | null {
    if (!mod) return null;
    try {
      return mod.takePendingEnded() ?? null;
    } catch {
      return null;
    }
  },

  /** Hodinky ukončily trénink: dál už se jim nic neposílá. */
  forget(workoutId: string) {
    if (startedForId === workoutId) startedForId = null;
  },
};
