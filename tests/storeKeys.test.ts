jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';

import { persistedStoreStorage, readPersistedStore, STORE_KEY } from '@/lib/storeKeys';

const LEGACY_KEY = 'setly-store-v1';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('storeKeys · migration off the pre-rename key', () => {
  it('returns null on a fresh install', async () => {
    expect(await readPersistedStore()).toBeNull();
  });

  it('copies the pre-rename payload forward on first read', async () => {
    await AsyncStorage.setItem(LEGACY_KEY, '{"state":{"workouts":[1]}}');

    expect(await readPersistedStore()).toBe('{"state":{"workouts":[1]}}');
    expect(await AsyncStorage.getItem(STORE_KEY)).toBe('{"state":{"workouts":[1]}}');
    // the old copy stays behind as a safety net
    expect(await AsyncStorage.getItem(LEGACY_KEY)).toBe('{"state":{"workouts":[1]}}');
  });

  it('prefers the current key and leaves a stale legacy copy alone', async () => {
    await AsyncStorage.setItem(LEGACY_KEY, '{"state":{"workouts":[1]}}');
    await AsyncStorage.setItem(STORE_KEY, '{"state":{"workouts":[1,2]}}');

    expect(await readPersistedStore()).toBe('{"state":{"workouts":[1,2]}}');
    expect(await AsyncStorage.getItem(LEGACY_KEY)).toBe('{"state":{"workouts":[1]}}');
  });

  it('never resurrects wiped data - a wipe writes an empty payload, it does not remove the key', async () => {
    await AsyncStorage.setItem(LEGACY_KEY, '{"state":{"workouts":[1]}}');
    await persistedStoreStorage.setItem(STORE_KEY, '{"state":{"workouts":[]}}');

    expect(await readPersistedStore()).toBe('{"state":{"workouts":[]}}');
  });

  it('writes only ever hit the current key', async () => {
    await persistedStoreStorage.setItem(STORE_KEY, '{"state":{"workouts":[3]}}');

    expect(await AsyncStorage.getItem(STORE_KEY)).toBe('{"state":{"workouts":[3]}}');
    expect(await AsyncStorage.getItem(LEGACY_KEY)).toBeNull();
  });
});
