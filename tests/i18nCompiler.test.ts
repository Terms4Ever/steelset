import { transformSync } from '@babel/core';
import fs from 'fs';
import path from 'path';

import * as i18n from '@/i18n';
import { cs } from '@/i18n/cs';
import { en } from '@/i18n/en';

/**
 * Přepnutí jazyka v Profilu nesmí nechat obrazovku ve starém jazyce (#20). Aplikace běží
 * s React Compilerem (`experiments.reactCompiler` v app.json) a ten si výsledek volání bez
 * reaktivních vstupů, jako je `t()`, zapamatuje při prvním vykreslení. V buildu 40 tak Profil
 * po volbě English zůstal česky, jen texty z pomocných funkcí mimo komponenty se přepnuly.
 *
 * Test proto `useT` přeloží stejným kompilátorem a volá ho opakovaně jako jednu a tutéž
 * komponentu: paměť kompilátoru (`c(n)`) zůstává mezi voláními, mění se jen nastavení jazyka.
 */
function compiledUseT(getSetting: () => string): () => typeof cs {
  const file = path.join(__dirname, '../src/i18n/useT.ts');
  const out = transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file,
    babelrc: false,
    configFile: false,
    presets: ['@babel/preset-typescript'],
    plugins: ['babel-plugin-react-compiler', '@babel/plugin-transform-modules-commonjs'],
  });
  // React dává každému volání `c(n)` v komponentě vlastní paměť a drží ji mezi vykresleními
  // podle pořadí volání; tady stejně, pořadí se vynuluje s každým vykreslením.
  const caches: unknown[][] = [];
  let slot = 0;
  const fakeRequire = (id: string) => {
    if (id === 'react/compiler-runtime') {
      return {
        c: (n: number) => {
          const cache = (caches[slot] ??= Array.from({ length: n }, () => Symbol.for('react.memo_cache_sentinel')));
          slot += 1;
          return cache;
        },
      };
    }
    if (id === '@/store/useStore') {
      return { useStore: (sel: (s: unknown) => unknown) => sel({ settings: { language: getSetting() } }) };
    }
    if (id === './index') return i18n;
    throw new Error(`nečekaný import ${id}`);
  };
  const mod: { exports: Record<string, unknown> } = { exports: {} };
  new Function('require', 'module', 'exports', out!.code!)(fakeRequire, mod, mod.exports);
  const useT = mod.exports.useT as () => typeof cs;
  return () => {
    slot = 0;
    return useT();
  };
}

describe('useT pod React Compilerem', () => {
  it('kompilátor useT opravdu překládá, jinak by test nic nedokazoval', () => {
    const file = path.join(__dirname, '../src/i18n/useT.ts');
    const out = transformSync(fs.readFileSync(file, 'utf8'), {
      filename: file,
      babelrc: false,
      configFile: false,
      presets: ['@babel/preset-typescript'],
      plugins: ['babel-plugin-react-compiler'],
    });
    expect(out!.code).toContain('react/compiler-runtime');
  });

  it('po přepnutí jazyka vrátí stejná komponenta nový slovník', () => {
    let setting = 'cs';
    const useT = compiledUseT(() => setting);
    expect(useT().profile.backup).toBe(cs.profile.backup);
    setting = 'en';
    expect(useT().profile.backup).toBe(en.profile.backup);
    setting = 'cs';
    expect(useT().profile.backup).toBe(cs.profile.backup);
  });

  it('nastaví jazyk i pro t() mimo komponenty', () => {
    let setting = 'en';
    const useT = compiledUseT(() => setting);
    useT();
    expect(i18n.getLang()).toBe('en');
    setting = 'cs';
    useT();
    expect(i18n.getLang()).toBe('cs');
  });
});
