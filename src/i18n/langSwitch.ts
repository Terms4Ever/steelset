import type { Lang } from './index';

/**
 * Má se po změně jazyka otevřít Profil? Jen když uživatel jazyk přepnul v Profilu, tedy až po
 * načtení uložených nastavení. Při startu se jazyk změní taky: dokud se nastavení nenačtou,
 * platí jazyk telefonu, a s ručně zvoleným jiným jazykem by aplikace pokaždé skočila do Profilu
 * (snímky do App Storu, S56). `shown` je jazyk, který platil po načtení, `null` = ještě nebyl.
 */
export function langSwitchTarget(shown: Lang | null, lang: Lang, ready: boolean): { shown: Lang | null; openProfile: boolean } {
  if (!ready) return { shown, openProfile: false };
  if (shown === null) return { shown: lang, openProfile: false };
  return { shown: lang, openProfile: shown !== lang };
}
