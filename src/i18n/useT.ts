import { useStore } from '@/store/useStore';

import { Dict, resolveLang, setLang, t } from './index';

/**
 * Slovník pro komponentu. Odebírá jazyk ze store, takže se komponenta po přepnutí jazyka
 * v Profilu překreslí sama; zároveň nastaví jazyk modulu pro `t()` a formátování (#20).
 */
export function useT(): Dict {
  const setting = useStore((s) => s.settings.language);
  setLang(resolveLang(setting));
  return t();
}
