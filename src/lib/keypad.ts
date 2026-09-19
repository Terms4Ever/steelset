/**
 * Čistá logika fokusu číselné klávesnice v živém tréninku.
 *
 * Fokus drží INDEX série. Když série zmizí, index by beze změny ukazoval na jinou sérii a psaní
 * by přepsalo cizí data - proto se po smazání buď zruší, nebo posune o jednu zpět.
 */
export type KeypadFocus = { ex: number; set: number; field: 'weight' | 'reps' } | null;

/** Nový fokus poté, co se u cviku `ex` smazala série s indexem `removed`. */
export function focusAfterSetRemoved(focus: KeypadFocus, ex: number, removed: number): KeypadFocus {
  if (!focus || focus.ex !== ex || focus.set < removed) return focus;
  if (focus.set === removed) return null; // psalo se do smazané série
  return { ...focus, set: focus.set - 1 }; // série nad ní se posunuly o jednu nahoru
}
