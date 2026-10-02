jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const cloud = { available: true, written: [] as string[] };
jest.mock('@/lib/cloudsync', () => ({
  cloudAvailable: async () => cloud.available,
  cloudBackup: async (content: string) => {
    if (!cloud.available) return false;
    cloud.written.push(content);
    return true;
  },
  cloudRestore: async () => null,
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { backupHint, backupLabel } from '@/lib/backupStatus';
import { STORE_KEY } from '@/lib/storeKeys';
import { onBackupDone, readBackupStatus, syncToCloud } from '@/lib/sync';

const NOW = new Date(2026, 9, 2, 14, 0).getTime();
const MIN = 60_000;

describe('backupStatus · text v Profilu (#19)', () => {
  it('čas poslední zálohy řekne lidsky', () => {
    const at = (ms: number) => backupLabel({ kind: 'done', at: NOW - ms }, NOW).text;
    expect(at(20_000)).toBe('právě teď');
    expect(at(2 * MIN)).toBe('před 2 min');
    expect(at(59 * MIN)).toBe('před 59 min');
    expect(at(3 * 60 * MIN)).toBe('před 3 h');
    expect(at(30 * 60 * MIN)).toBe('včera');
    expect(at(5 * 24 * 60 * MIN)).toBe('před 5 dny');
    expect(at(40 * 24 * 60 * MIN)).toBe('23. 8. 2026');
  });

  it('vypnutý iCloud je varování, ne zelená', () => {
    expect(backupLabel({ kind: 'unavailable' }, NOW)).toEqual({ text: 'iCloud vypnutý', tone: 'warn' });
    expect(backupHint({ kind: 'unavailable' })).toContain('Zapni iCloud Drive');
    expect(backupLabel({ kind: 'done', at: NOW }, NOW).tone).toBe('ok');
    expect(backupLabel({ kind: 'never' }, NOW).tone).toBe('mute');
  });

  it('zálohovaný stav slibuje přenos na nový telefon', () => {
    expect(backupHint({ kind: 'done', at: NOW })).toContain('stejným Apple ID');
  });
});

describe('backupStatus · stav čte skutečnost', () => {
  const os = Platform.OS;
  beforeEach(async () => {
    await AsyncStorage.clear();
    cloud.available = true;
    cloud.written = [];
    (Platform as any).OS = 'ios';
  });
  afterAll(() => {
    (Platform as any).OS = os;
  });

  it('mimo iPhone záloha neběží', async () => {
    (Platform as any).OS = 'web';
    expect(await readBackupStatus()).toEqual({ kind: 'unsupported' });
  });

  it('bez iCloudu hlásí nedostupnost, i když kdysi záloha proběhla', async () => {
    await AsyncStorage.setItem(STORE_KEY, '{"state":{"workouts":[]}}');
    await syncToCloud();
    cloud.available = false;
    expect(await readBackupStatus()).toEqual({ kind: 'unavailable' });
  });

  it('před první zálohou „zatím ne", po ní čas zálohy a ozve se posluchač', async () => {
    expect(await readBackupStatus()).toEqual({ kind: 'never' });

    const heard = jest.fn();
    const off = onBackupDone(heard);
    await AsyncStorage.setItem(STORE_KEY, '{"state":{"workouts":[]}}');
    const before = Date.now();
    await syncToCloud();
    off();

    const st = await readBackupStatus();
    expect(st.kind).toBe('done');
    expect(st.kind === 'done' && st.at).toBeGreaterThanOrEqual(before);
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('nepovedená záloha posluchače nevolá a čas neposune', async () => {
    cloud.available = false;
    const heard = jest.fn();
    const off = onBackupDone(heard);
    await AsyncStorage.setItem(STORE_KEY, '{"state":{"workouts":[]}}');
    await syncToCloud();
    off();
    expect(heard).not.toHaveBeenCalled();
    cloud.available = true;
    expect(await readBackupStatus()).toEqual({ kind: 'never' });
  });
});
