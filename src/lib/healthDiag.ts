/**
 * Výpis posledních tréninků v diagnostice Apple Health (#25). Kondice ukazuje u tréninku čas
 * místo kalorií, když k němu žádné kalorie nedorazily; výpis to řekne bez hledání v Nastavení.
 */
export type DiagWorkout = {
  start: number;
  durationSec: number;
  source: string;
  /** Aktivní energie z tréninku (statistika HKWorkout), jen tu počítá Kondice. */
  activeKcal?: number;
  /** Starší `totalEnergyBurned`, když statistika chybí. */
  totalKcal?: number;
};

export function describeRecentWorkouts(list: DiagWorkout[], fmtDate: (ms: number) => string, missing: string): string[] {
  return list.map((w) => {
    const kcal = Math.round(w.activeKcal || w.totalKcal || 0);
    const min = Math.round(w.durationSec / 60);
    return `${fmtDate(w.start)} · ${w.source} · ${min} min · ${kcal} kcal${kcal > 0 ? '' : ` ${missing}`}`;
  });
}
