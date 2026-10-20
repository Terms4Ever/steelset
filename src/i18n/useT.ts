import { useStore } from '@/store/useStore';

import { Dict, dict, Lang, resolveLang, setLang } from './index';

/**
 * Jazyk aplikace podle nastavení v Profilu. Odebírá ho ze store, takže se komponenta po
 * přepnutí překreslí sama.
 */
export function useLang(): Lang {
  const setting = useStore((s) => s.settings.language);
  return resolveLang(setting);
}

/**
 * Slovník pro komponentu; zároveň nastaví jazyk modulu pro `t()` a formátování (#20).
 *
 * Slovník se bere podle `lang`, ne přes `t()`. Aplikace běží s React Compilerem a ten si
 * volání bez reaktivních vstupů zapamatuje při prvním vykreslení, takže `t()` by po přepnutí
 * jazyka vracelo pořád starý slovník (build 40, hlídá `tests/i18nCompiler.test.ts`).
 */
export function useT(): Dict {
  const lang = useLang();
  setLang(lang);
  return dict(lang);
}
