import { describeRecentWorkouts } from '@/lib/healthDiag';

// Diagnostika Apple Health v Profilu (#25): Kondice ukazuje u tréninku ze Steelsetu čas místo
// kalorií. Výpis posledních tréninků řekne bez hledání v Nastavení, jestli k nim kalorie dorazily.
describe('výpis posledních tréninků v diagnostice', () => {
  const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);

  it('trénink s kaloriemi ukáže zdroj, délku a kalorie', () => {
    const lines = describeRecentWorkouts(
      [{ start: Date.UTC(2026, 9, 17, 9), durationSec: 3780, source: 'Steelset', activeKcal: 312.4, totalKcal: 300 }],
      fmt,
      '(chybí)',
    );
    expect(lines).toEqual(['2026-10-17 · Steelset · 63 min · 312 kcal']);
  });

  it('bez aktivní energie vezme celkovou, bez obojího řekne, že kalorie chybí', () => {
    const lines = describeRecentWorkouts(
      [
        { start: Date.UTC(2026, 9, 14, 9), durationSec: 4200, source: 'Steelset', totalKcal: 280 },
        { start: Date.UTC(2026, 9, 12, 9), durationSec: 4800, source: 'Steelset' },
      ],
      fmt,
      '(chybí)',
    );
    expect(lines).toEqual(['2026-10-14 · Steelset · 70 min · 280 kcal', '2026-10-12 · Steelset · 80 min · 0 kcal (chybí)']);
  });

  it('nula kalorií se počítá jako chybějící, Kondice pak ukáže čas', () => {
    expect(describeRecentWorkouts([{ start: 0, durationSec: 60, source: 'X', activeKcal: 0 }], fmt, '(chybí)')[0]).toContain('(chybí)');
  });
});
