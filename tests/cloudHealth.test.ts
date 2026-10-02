jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const cloud = { file: null as string | null };
jest.mock('@/lib/cloudsync', () => ({
  cloudAvailable: async () => true,
  cloudBackup: async (content: string) => {
    cloud.file = content;
    return true;
  },
  cloudRestore: async () => cloud.file,
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { readFileSync } from 'fs';
import { join } from 'path';

import type { Workout } from '@/data/types';
import {
  HEALTH_STATE_FIELDS,
  HEALTH_WORKOUT_FIELDS,
  keepLocalHealth,
  refillHeartRate,
  stripHealthForCloud,
  workoutsMissingHr,
} from '@/lib/cloudHealth';
import { STORE_KEY } from '@/lib/storeKeys';
import { syncFromCloud, syncToCloud } from '@/lib/sync';

const series = [
  { t: 1_000, bpm: 120 },
  { t: 2_000, bpm: 140 },
];
const hrWorkout = (id: string, extra: Partial<Workout> = {}): Workout => ({
  id,
  name: 'Push',
  startedAt: 1_000,
  finishedAt: 5_000,
  avgHr: 130,
  maxHr: 160,
  kcal: 300,
  hrSeries: series,
  bodyweightKg: 82,
  healthUuid: 'HK-1',
  exercises: [{ exerciseId: 'bench', sets: [{ id: 's1', reps: 5, weight: 100, done: true } as any] }],
  ...extra,
});
const persisted = (state: Record<string, any>) => JSON.stringify({ state, version: 0 });
const HEALTH_WORDS = ['avgHr', 'maxHr', 'kcal', 'hrSeries', 'bodyweightLog', '"bpm"'];

beforeEach(async () => {
  await AsyncStorage.clear();
  cloud.file = null;
});

describe('cloudHealth · do iCloudu nic z Apple Health (#18, pravidlo 5.1.3 ii)', () => {
  it('ze zálohy zmizí tep, kalorie i vážení, trénink jinak zůstane celý', () => {
    const out = stripHealthForCloud(
      persisted({
        workouts: [hrWorkout('w1')],
        trashedWorkouts: [{ ...hrWorkout('w2'), trashedAt: 9 }],
        bodyweightLog: [{ at: 1, kg: 82 }],
        settings: { bodyweightKg: 82, healthEnabled: true },
      }),
    );
    for (const word of HEALTH_WORDS) expect(out).not.toContain(word);
    const st = JSON.parse(out).state;
    expect(st.workouts[0]).toMatchObject({ id: 'w1', bodyweightKg: 82, healthUuid: 'HK-1', finishedAt: 5_000 });
    expect(st.workouts[0].exercises[0].sets[0].weight).toBe(100);
    expect(st.trashedWorkouts[0]).toMatchObject({ id: 'w2', trashedAt: 9 });
    expect(st.settings).toEqual({ bodyweightKg: 82, healthEnabled: true });
  });

  it('každé pole tréninku popsané jako data z Apple Health se ze zálohy vynechá', () => {
    // nové pole z Health by jinak tiše skončilo v iCloudu; metadata importu (uuid, původ) nejsou zdravotní údaj
    const types = readFileSync(join(__dirname, '../src/data/types.ts'), 'utf8');
    const body = types.slice(types.indexOf('export interface Workout {'), types.indexOf('}', types.indexOf('export interface Workout {')));
    const fromHealth = body
      .split('\n')
      .filter((l) => /Apple Health|řada tepu/.test(l))
      .map((l) => l.trim().split(/[?:]/)[0])
      .filter((f) => !['healthUuid', 'source'].includes(f));
    expect(fromHealth.length).toBeGreaterThanOrEqual(4);
    for (const f of fromHealth) expect(HEALTH_WORKOUT_FIELDS as readonly string[]).toContain(f);
    expect(HEALTH_STATE_FIELDS).toContain('bodyweightLog');
  });

  it('syncToCloud posílá zálohu bez dat z Health, v telefonu zůstanou', async () => {
    const local = persisted({ workouts: [hrWorkout('w1')], bodyweightLog: [{ at: 1, kg: 82 }] });
    await AsyncStorage.setItem(STORE_KEY, local);
    await syncToCloud();
    const sent = JSON.parse(cloud.file!).data as string;
    for (const word of HEALTH_WORDS) expect(sent).not.toContain(word);
    expect(await AsyncStorage.getItem(STORE_KEY)).toBe(local);
  });

  it('obnova z iCloudu nechá telefonu jeho tep a vážení, nové tréninky přijdou bez tepu', async () => {
    const cloudJson = persisted({ workouts: [{ id: 'w1', name: 'Push' }, { id: 'w9', name: 'Nový' }] });
    const localJson = persisted({ workouts: [hrWorkout('w1')], bodyweightLog: [{ at: 1, kg: 82 }] });
    const st = JSON.parse(keepLocalHealth(cloudJson, localJson)).state;
    expect(st.workouts[0]).toMatchObject({ id: 'w1', avgHr: 130, kcal: 300, hrSeries: series });
    expect(st.workouts[1].avgHr).toBeUndefined();
    expect(st.bodyweightLog).toEqual([{ at: 1, kg: 82 }]);
    // čerstvý telefon nemá co vracet
    expect(keepLocalHealth(cloudJson, null)).toBe(cloudJson);
  });

  it('syncFromCloud skládá zálohu s místními daty z Health', async () => {
    await AsyncStorage.setItem(STORE_KEY, persisted({ workouts: [hrWorkout('w1')] }));
    cloud.file = JSON.stringify({ at: Date.now(), data: persisted({ workouts: [{ id: 'w1', name: 'Přejmenovaný' }] }) });
    expect(await syncFromCloud()).toBe(true);
    const w = JSON.parse((await AsyncStorage.getItem(STORE_KEY))!).state.workouts[0];
    expect(w).toMatchObject({ name: 'Přejmenovaný', avgHr: 130, hrSeries: series });
  });
});

describe('cloudHealth · tep se po obnovení dotáhne z Health', () => {
  const bare = (id: string, extra: Partial<Workout> = {}): Workout => ({ id, name: id, startedAt: 1, finishedAt: 2, exercises: [], ...extra });

  it('ptá se jen u dokončených živých tréninků bez tepu, nejnovější první', () => {
    const list = [
      bare('stary', { startedAt: 1 }),
      bare('novy', { startedAt: 5 }),
      bare('rucni', { manual: true }),
      bare('bezi', { finishedAt: undefined }),
      bare('maTep', { avgHr: 120 }),
    ];
    expect(workoutsMissingHr(list).map((w) => w.id)).toEqual(['novy', 'stary']);
  });

  it('uloží, co Health má, prázdné přeskočí a chyba jednoho nezastaví ostatní', async () => {
    const save = jest.fn();
    const fetchHr = jest.fn(async (start: number) => {
      if (start === 3) throw new Error('HealthKit');
      if (start === 2) return { series: [] };
      return { avg: 125, max: 150, series, kcal: 250 };
    });
    const n = await refillHeartRate([bare('a', { startedAt: 1 }), bare('b', { startedAt: 2 }), bare('c', { startedAt: 3 })], fetchHr, save);
    expect(n).toBe(1);
    expect(fetchHr).toHaveBeenCalledTimes(3);
    expect(save).toHaveBeenCalledWith('a', 125, 150, series, 250);
  });
});
