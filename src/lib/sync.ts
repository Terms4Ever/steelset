import AsyncStorage from '@react-native-async-storage/async-storage';

import { cloudBackup, cloudRestore } from './cloudsync';

const STORE_KEY = 'setly-store-v1'; // must match zustand persist `name`
const SYNC_AT_KEY = 'setly-synced-at';

/** Push the local persisted store to iCloud (last-write-wins by timestamp). */
export async function syncToCloud(): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(STORE_KEY);
    if (!data) return;
    const at = Date.now();
    const ok = await cloudBackup(JSON.stringify({ at, data }));
    if (ok) await AsyncStorage.setItem(SYNC_AT_KEY, String(at));
  } catch {
    // ignore - local data is untouched
  }
}

/**
 * Pull from iCloud if it's newer than what we last synced. Returns true if local
 * storage was replaced (caller should rehydrate the store).
 */
export async function syncFromCloud(): Promise<boolean> {
  try {
    const raw = await cloudRestore();
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { at?: number; data?: string };
    if (!parsed?.data || typeof parsed.at !== 'number') return false;
    const localAt = Number((await AsyncStorage.getItem(SYNC_AT_KEY)) ?? '0');
    if (parsed.at <= localAt) return false; // local is same or newer
    await AsyncStorage.setItem(STORE_KEY, parsed.data);
    await AsyncStorage.setItem(SYNC_AT_KEY, String(parsed.at));
    return true;
  } catch {
    return false;
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
/** Debounced backup - call on every store change. */
export function scheduleBackup(delay = 3000): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    void syncToCloud();
  }, delay);
}
