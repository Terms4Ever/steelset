/**
 * Přehazování pořadí cviků v živém tréninku i v plánu.
 *
 * Supersérie je souvislý úsek cviků se stejným `supersetGroup` (tak je zakládá
 * `linkSuperset` - spojuje vždy dva sousedy). Přesun proto nehýbe jedním cvikem,
 * ale celým blokem, a přeskakuje celý sousední blok. Jinak by se supersérie
 * rozpadla na dva kusy přerušené cizím cvikem.
 */

export type Groupable = { supersetGroup?: string };

/** Rozsah bloku [od, do], do kterého index patří. Bez supersérie je to jeden cvik. */
export function blockAt<T extends Groupable>(items: T[], index: number): [number, number] {
  const g = items[index]?.supersetGroup;
  if (!g) return [index, index];
  let start = index;
  let end = index;
  while (start > 0 && items[start - 1].supersetGroup === g) start--;
  while (end < items.length - 1 && items[end + 1].supersetGroup === g) end++;
  return [start, end];
}

/** Dá se blok s tímhle indexem posunout daným směrem? (-1 nahoru, 1 dolů) */
export function canMove<T extends Groupable>(items: T[], index: number, dir: -1 | 1): boolean {
  if (index < 0 || index >= items.length) return false;
  const [start, end] = blockAt(items, index);
  return dir < 0 ? start > 0 : end < items.length - 1;
}

/**
 * Prohodí blok s indexem `index` se sousedním blokem.
 *
 * Vrací i `order`: na pozici nového indexu je index původní. Slouží k přepočtu
 * všeho, co si drží index cviku - typicky fokus klávesnice.
 */
export function moveBlock<T extends Groupable>(items: T[], index: number, dir: -1 | 1): { items: T[]; order: number[] } {
  const order = items.map((_, i) => i);
  if (!canMove(items, index, dir)) return { items, order };
  const [start, end] = blockAt(items, index);
  const [ns, ne] = dir < 0 ? blockAt(items, start - 1) : blockAt(items, end + 1);
  const next =
    dir < 0
      ? [...order.slice(0, ns), ...order.slice(start, end + 1), ...order.slice(ns, ne + 1), ...order.slice(end + 1)]
      : [...order.slice(0, start), ...order.slice(ns, ne + 1), ...order.slice(start, end + 1), ...order.slice(ne + 1)];
  return { items: next.map((i) => items[i]), order: next };
}

/** Kam se po přesunu přesunul cvik, který byl na `oldIndex`. */
export function remapIndex(order: number[], oldIndex: number): number {
  const i = order.indexOf(oldIndex);
  return i === -1 ? oldIndex : i;
}

/**
 * Stabilní klíč pro React. Index se nehodí - po přesunu by se stav komponent
 * přilepil k jiné pozici. Stejný cvik může být v tréninku dvakrát, takže se
 * k identifikátoru přidává pořadí výskytu.
 */
export function stableKeys(items: { exerciseId: string }[]): string[] {
  const seen: Record<string, number> = {};
  return items.map((it) => {
    const n = (seen[it.exerciseId] = (seen[it.exerciseId] ?? 0) + 1);
    return `${it.exerciseId}#${n}`;
  });
}
