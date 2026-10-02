/**
 * Výpočet dalšího kroku pro steppery v Profilu (#21).
 *
 * Dřív se krok přičítal k aktuální hodnotě a minimum ji usekávalo mimo mřížku kroku: přírůstek
 * 2,5 kg šel minusem na 1,25 a 0,5, plusem pak jen 1,75, 3, 4,25, takže 2,5 se už nevrátilo.
 * Teď krok vždy dopadne na násobek `step`, takže cesta zpátky vede přes stejné hodnoty.
 */
const round2 = (n: number) => Math.round(n * 100) / 100;

export function stepNumber(value: number, step: number, dir: 1 | -1, min: number, max = Infinity): number {
  const k = value / step;
  // drobná nepřesnost z desetinných čísel nesmí přeskočit bod mřížky
  const onGrid = Math.abs(k - Math.round(k)) < 1e-6;
  const base = onGrid ? Math.round(k) : dir > 0 ? Math.floor(k) : Math.ceil(k);
  const next = round2((base + dir) * step);
  return Math.min(max, Math.max(min, next));
}

/** Krok po pevném seznamu hodnot. Hodnota mimo seznam (ze staré verze) jde k nejbližší v daném směru. */
export function stepOption(options: readonly number[], value: number, dir: 1 | -1): number {
  const sorted = [...options].sort((a, b) => a - b);
  if (dir > 0) return sorted.find((o) => o > value + 1e-9) ?? sorted[sorted.length - 1];
  return [...sorted].reverse().find((o) => o < value - 1e-9) ?? sorted[0];
}

/** Přírůstky podle běžných kotoučů (#21). Výchozí 2,5 kg a 5 lb v nich jsou. */
export const INCREMENT_OPTIONS_KG = [0.5, 1, 1.25, 2.5, 5] as const;
export const INCREMENT_OPTIONS_LB = [1, 2.5, 5, 10] as const;
