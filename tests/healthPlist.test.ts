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
