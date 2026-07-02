import { Platform } from 'react-native';

// Live Activity (Dynamic Island + lock screen) for the running workout. iOS 16.2+ only; every call
// degrades to a no-op elsewhere (web, Android, Expo Go, older iOS).

let mod: any = null;
if (Platform.OS === 'ios') {
  try {
    const { requireNativeModule } = require('expo-modules-core');
    mod = requireNativeModule('SteelsetLiveActivity');
  } catch {
    mod = null;
  }
}

let startedForId: string | null = null;

export const liveActivity = {
  /** Start (or adopt) the activity for one workout id — safe to call repeatedly. */
  startFor(id: string, name: string, startedAtMs: number, doneSets: number, totalSets: number) {
    if (!mod || startedForId === id) return;
    try {
      mod.start(name, startedAtMs, doneSets, totalSets);
      startedForId = id;
    } catch {
      /* ignore */
    }
  },
  update(doneSets: number, totalSets: number, restEndAtMs: number | null) {
    if (!mod || startedForId == null) return;
    try {
      mod.update(doneSets, totalSets, restEndAtMs);
    } catch {
      /* ignore */
    }
  },
  end() {
    if (!mod) return;
    startedForId = null;
    try {
      mod.end();
    } catch {
      /* ignore */
    }
  },
};
