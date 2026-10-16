/** České skloňování podle počtu: 1 série, 2-4 série, 5+ sérií. */
export function csPlural(n: number, one: string, few: string, many: string): string {
  const a = Math.abs(n);
  if (a === 1) return one;
  return a >= 2 && a <= 4 ? few : many;
}

/** Anglické: 1 set, jinak sets. */
export function enPlural(n: number, one: string, other: string): string {
  return Math.abs(n) === 1 ? one : other;
}
