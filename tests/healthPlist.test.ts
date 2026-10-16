import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Apple odmítne nahraný build bez textů pro Apple Health (ITMS-90683, build 33 z 2. 10. 2026).
 * Knihovna HealthKitu odkazuje i na zápis, takže `NSHealthUpdateUsageDescription` musí telefon mít,
 * i když sám do Health nezapisuje a o zápis nežádá (S36, S39).
 */
const appJson = JSON.parse(readFileSync(join(__dirname, '../app.json'), 'utf8'));
const healthkit = (appJson.expo.plugins as any[]).find((p) => Array.isArray(p) && p[0] === '@kingstinct/react-native-healthkit');

describe('app.json · texty pro Apple Health v telefonu', () => {
  it('plugin HealthKitu je nastavený', () => {
    expect(healthkit).toBeDefined();
  });

  it.each(['NSHealthShareUsageDescription', 'NSHealthUpdateUsageDescription'])('%s je skutečný text, ne false', (key) => {
    const value = healthkit[1][key];
    expect(typeof value).toBe('string');
    expect(value.length).toBeGreaterThan(30);
  });
});

describe('hodinky · texty pro Apple Health', () => {
  const plist = readFileSync(join(__dirname, '../targets/watch/Info.plist'), 'utf8');
  it.each(['NSHealthShareUsageDescription', 'NSHealthUpdateUsageDescription'])('%s je v Info.plist hodinek', (key) => {
    expect(plist).toMatch(new RegExp('<key>' + key + '</key>[\\s]*<string>[^<]{30,}</string>'));
  });
});

describe('texty oprávnění v obou jazycích (#20)', () => {
  const CZECH = /[ěščřžýáíéůúťďňĚŠČŘŽÝÁÍÉŮÚ]/;
  const cs = JSON.parse(readFileSync(join(__dirname, '../locales/cs.json'), 'utf8')).ios;
  const en = JSON.parse(readFileSync(join(__dirname, '../locales/en.json'), 'utf8')).ios;

  it('aplikace má v obou jazycích stejné klíče, anglicky bez českých znaků', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(cs).sort());
    for (const k of Object.keys(en)) expect(CZECH.test(en[k])).toBe(false);
  });

  it('čeština v locales sedí s texty v app.json, slovenština dostane češtinu', () => {
    expect(cs.NSHealthShareUsageDescription).toBe(healthkit[1].NSHealthShareUsageDescription);
    expect(cs.NSHealthUpdateUsageDescription).toBe(healthkit[1].NSHealthUpdateUsageDescription);
    expect(cs.NSUserTrackingUsageDescription).toBe(appJson.expo.ios.infoPlist.NSUserTrackingUsageDescription);
    expect(appJson.expo.locales).toEqual({ cs: './locales/cs.json', sk: './locales/cs.json', en: './locales/en.json' });
  });

  it('hodinky mají InfoPlist.strings pro češtinu, slovenštinu i angličtinu', () => {
    const read = (lang: string) => readFileSync(join(__dirname, `../targets/watch/${lang}.lproj/InfoPlist.strings`), 'utf8');
    for (const lang of ['cs', 'sk', 'en']) {
      const s = read(lang);
      for (const key of ['NSHealthShareUsageDescription', 'NSHealthUpdateUsageDescription']) {
        expect(s).toMatch(new RegExp('"' + key + '" = "[^"]{30,}";'));
      }
    }
    expect(CZECH.test(read('en'))).toBe(false);
  });
});
