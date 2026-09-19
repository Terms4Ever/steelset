import AsyncStorage from '@react-native-async-storage/async-storage';

/** AsyncStorage key holding the persisted zustand store. */
export const STORE_KEY = 'steelset-store-v1';

/**
 * The key used before the Steelset rename. Installs that predate the rename still hold their
 * workouts under it, so it is read once and copied forward. It is never written to and never
 * deleted - it stays behind as a safety copy, so reverting the rename loses nothing.
 */
const LEGACY_STORE_KEY = 'setly-store-v1';

/** Read the persisted store, copying the pre-rename payload forward the first time. */
export async function readPersistedStore(name: string = STORE_KEY): Promise<string | null> {
  const current = await AsyncStorage.getItem(name);
  if (current != null) return current;
  const legacy = await AsyncStorage.getItem(LEGACY_STORE_KEY);
  if (legacy == null) return null;
  await AsyncStorage.setItem(name, legacy);
  return legacy;
}

/**
 * Storage for zustand `persist`: reads fall back to the pre-rename key, writes only ever hit the
 * current one. Wiping the app writes an empty payload rather than removing the key, so cleared
 * data never comes back from the legacy copy.
 */
export const persistedStoreStorage = {
  getItem: (name: string) => readPersistedStore(name),
  setItem: (name: string, value: string) => AsyncStorage.setItem(name, value),
  removeItem: (name: string) => AsyncStorage.removeItem(name),
};
