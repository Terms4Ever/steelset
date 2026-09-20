import { SetEntry } from '@/data/types';

/**
 * Přetažení hodnoty mezi sériemi jednoho cviku.
 *
 * Táhne se svisle uvnitř jednoho sloupce, takže váha může skončit jen ve váze
 * a opakování jen v opakováních - kříž mezi sloupci nejde udělat ani omylem.
 * Cíl se hledá podle změřených pozic řádků, ne podle jedné výšky: dokončená série
 * je o rozdíl proti minule vyšší, takže by dělení jednou výškou u delších cviků minulo.
 */

export type CopyField = 'weight' | 'reps';

/** Náhradní výška řádku, kdyby se pozice sérií nestihly změřit. */
export const ROW_HEIGHT_FALLBACK = 65;

/**
 * Na kterou sérii prst ukazuje.
 *
 * `centers` jsou svislé středy řádků v rámci cviku (z `onLayout`). Řádky nejsou
 * stejně vysoké - dokončená série si pod číslem nese ještě rozdíl proti minule -,
 * takže dělit posun jednou výškou by u delších cviků minulo o řádek. Hledá se proto
 * nejbližší skutečný střed. Dokud se pozice nezměří, jede se podle náhradní výšky.
 */
export function dropIndex(from: number, dy: number, centers: number[], count: number): number {
  if (count <= 0) return from;
  const clamp = (i: number) => Math.min(count - 1, Math.max(0, i));
  if (centers.length !== count || !centers.every((c) => Number.isFinite(c)) || centers[from] == null) {
    return clamp(from + Math.round(dy / ROW_HEIGHT_FALLBACK));
  }
  const y = centers[from] + dy;
  let best = from;
  let bestDist = Infinity;
  centers.forEach((c, i) => {
    const d = Math.abs(c - y);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return clamp(best);
}

/**
 * Hodnota, která se při puštění zapíše do cílové série, nebo null, když se nemá dít nic.
 *
 * Kopíruje se hodnota tak, jak je uložená - u váhy tedy celkové kilogramy. U cviků
 * s vlastní vahou je `Workout.bodyweightKg` pro celý trénink stejný, takže zkopírovaná
 * celková váha dá v +KG sloupci přesně ten přídavek, který uživatel viděl u zdroje.
 */
export function valueToCopy(sets: SetEntry[], from: number, to: number, field: CopyField): number | null {
  if (from === to) return null;
  const src = sets[from];
  const dst = sets[to];
  if (!src || !dst) return null;
  const v = src[field];
  return v == null ? null : v;
}

/** Má smysl tohle přetažení dotáhnout do konce? */
export function canCopy(sets: SetEntry[], from: number, to: number, field: CopyField): boolean {
  return valueToCopy(sets, from, to, field) !== null;
}
