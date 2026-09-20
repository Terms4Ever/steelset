import { SetEntry } from '@/data/types';

/**
 * Přetažení hodnoty mezi sériemi jednoho cviku.
 *
 * Táhne se svisle uvnitř jednoho sloupce, takže váha může skončit jen ve váze
 * a opakování jen v opakováních - kříž mezi sloupci nejde udělat ani omylem.
 * Cíl se počítá z posunu prstu a výšky řádku, ne z měření jednotlivých buněk:
 * řádky série jsou stejně vysoké a tahle cesta nepotřebuje nic doměřovat během gesta.
 */

export type CopyField = 'weight' | 'reps';

/** Kdyby se výšku řádku nepodařilo změřit, ať se dělí něčím rozumným. */
export const ROW_HEIGHT_FALLBACK = 60;

/** Na kterou sérii prst ukazuje. Za posledním řádkem se drží na posledním. */
export function dropIndex(from: number, dy: number, rowHeight: number, count: number): number {
  if (count <= 0) return from;
  const h = rowHeight > 0 ? rowHeight : ROW_HEIGHT_FALLBACK;
  const raw = from + Math.round(dy / h);
  return Math.min(count - 1, Math.max(0, raw));
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
