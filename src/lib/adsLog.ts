import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG_KEY = 'steelset-ads-log';
const LOG_MAX = 30;

export type AdsLogEntry = { at: number; text: string };

// Zápisy jdou za sebou: souběžné čtení a zápis by si navzájem přepsaly události (build 41
// ztratil řádek o sledování, který přišel hned po souhlasu).
let queue: Promise<void> = Promise.resolve();

/**
 * Deník reklam v telefonu (#18). V buildu 40 se nezobrazila žádná reklama a chyby SDK se
 * polykaly, takže nešlo poznat, jestli chybí souhlas, start SDK, nebo jen Google reklamu
 * nedodal. Profil ukáže, co se dělo, i s kódem chyby od Googlu.
 */
export function logAds(text: string, now = Date.now()): Promise<void> {
  queue = queue.then(async () => {
    try {
      const raw = await AsyncStorage.getItem(LOG_KEY);
      const list: AdsLogEntry[] = raw ? JSON.parse(raw) : [];
      list.push({ at: now, text });
      await AsyncStorage.setItem(LOG_KEY, JSON.stringify(list.slice(-LOG_MAX)));
    } catch {
      /* deník nesmí shodit nic jiného */
    }
  });
  return queue;
}

export async function readAdsLog(): Promise<AdsLogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Chyba z Google Mobile Ads jako krátký text: kód (`googleMobileAds/no-fill`) a zpráva. */
export function adError(e: unknown): string {
  const err = e as { code?: unknown; message?: unknown } | null | undefined;
  const code = typeof err?.code === 'string' ? err.code : '';
  const message = typeof err?.message === 'string' ? err.message : String(e ?? '');
  return code ? `${code} ${message}`.trim() : message;
}
