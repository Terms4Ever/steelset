jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';

import { adError, logAds, readAdsLog } from '@/lib/adsLog';

// Deník reklam v Profilu (#18): bez něj nejde na zařízení poznat, proč se reklama nezobrazí.
describe('deník reklam', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('chyba od Googlu nese kód i zprávu', () => {
    const e = Object.assign(new Error('Request Error: No ad to show.'), { code: 'googleMobileAds/no-fill' });
    expect(adError(e)).toBe('googleMobileAds/no-fill Request Error: No ad to show.');
  });

  it('chyba bez kódu nebo jiná hodnota se neztratí', () => {
    expect(adError(new Error('timeout'))).toBe('timeout');
    expect(adError('nic')).toBe('nic');
    expect(adError(undefined)).toBe('');
  });

  it('drží posledních 30 událostí v pořadí zápisu', async () => {
    for (let i = 0; i < 35; i++) await logAds(`e${i}`, 1000 + i);
    const log = await readAdsLog();
    expect(log).toHaveLength(30);
    expect(log[0]).toEqual({ at: 1005, text: 'e5' });
    expect(log[29]).toEqual({ at: 1034, text: 'e34' });
  });

  it('souběžné zápisy se neztratí (build 41 ztratil řádek o sledování)', async () => {
    await Promise.all([logAds('consent', 1), logAds('tracking', 2), logAds('sdk', 3)]);
    expect((await readAdsLog()).map((e) => e.text)).toEqual(['consent', 'tracking', 'sdk']);
  });

  it('poškozený deník nic neshodí', async () => {
    await AsyncStorage.setItem('steelset-ads-log', '{rozbité');
    await expect(readAdsLog()).resolves.toEqual([]);
    await expect(logAds('dál')).resolves.toBeUndefined();
  });
});
