import { cs } from './cs';
import { en } from './en';

/**
 * Jazyk aplikace (#20, S45). Česky pro Česko a Slovensko, anglicky pro zbytek světa; v Profilu jde
 * zvolit natvrdo. Texty jsou ve slovnících `cs.ts` a `en.ts`, tvar `en` je vynucený typem `Dict`,
 * takže chybějící překlad neprojde přes `tsc`.
 *
 * Aktuální jazyk drží modul. Kořenový layout ho nastaví při renderu a při změně celý strom
 * přemontuje, takže `t()` stačí volat kdekoli, i mimo komponenty.
 */
export type Lang = 'cs' | 'en';
export type LangSetting = 'auto' | Lang;
export type Dict = typeof cs;

const DICTS: Record<Lang, Dict> = { cs, en };

let current: Lang = 'cs';

/** Jazyk telefonu: čeština a slovenština dostanou češtinu, ostatní angličtinu. */
export function deviceLang(): Lang {
  try {
    const { getLocales } = require('expo-localization');
    const code: string | null | undefined = getLocales()?.[0]?.languageCode;
    return code === 'cs' || code === 'sk' ? 'cs' : 'en';
  } catch {
    return 'cs';
  }
}

export function resolveLang(setting: LangSetting | undefined, device: Lang = deviceLang()): Lang {
  return setting === 'cs' || setting === 'en' ? setting : device;
}

export function setLang(lang: Lang): void {
  current = lang;
}

export function getLang(): Lang {
  return current;
}

/** Slovník aktuálního jazyka. */
export function t(): Dict {
  return DICTS[current];
}

/** Slovník konkrétního jazyka, pro testy a pro texty, které se nesmí řídit aktuálním jazykem. */
export function dict(lang: Lang): Dict {
  return DICTS[lang];
}

/** Locale pro `Intl` a `toLocaleString`. */
export function locale(): string {
  return current === 'cs' ? 'cs-CZ' : 'en-US';
}

export { csPlural, enPlural } from './plural';
