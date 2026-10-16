import { dict, resolveLang, setLang } from '@/i18n';
import { fmtGrouped, fmtHeaderDate, fmtNum, relativeDay } from '@/lib/format';

const CZECH = /[ěščřžýáíéůúťďňĚŠČŘŽÝÁÍÉŮÚ]/;

/** Všechny texty slovníku: řetězce a výsledky funkcí pro 1, 2 a 5 (jednotné, malé a velké číslo). */
function leaves(node: unknown, path = ''): { path: string; text: string }[] {
  if (typeof node === 'string') return [{ path, text: node }];
  if (typeof node === 'function') {
    const fn = node as (...a: any[]) => string;
    return [1, 2, 5].map((n) => {
      // parametry jsou čísla, řetězce nebo seznamy; řetězec s číslem poslouží prvním dvěma, seznam třetím
      let text: string;
      try {
        text = fn(String(n), String(n), String(n));
      } catch {
        text = fn([String(n)], [String(n)], [String(n)]);
      }
      return { path: `${path}(${n})`, text };
    });
  }
  if (Array.isArray(node)) return node.flatMap((v, i) => leaves(v, `${path}[${i}]`));
  if (node && typeof node === 'object') return Object.entries(node).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  return [];
}

afterEach(() => setLang('cs'));

describe('i18n · slovníky (#20)', () => {
  it('angličtina nemá žádný text s českými znaky, tedy nic nepřeloženého', () => {
    const czech = leaves(dict('en')).filter((l) => CZECH.test(l.text));
    expect(czech).toEqual([]);
  });

  it('žádný text není prázdný, v žádném jazyce', () => {
    for (const lang of ['cs', 'en'] as const) {
      expect(leaves(dict(lang)).filter((l) => !l.text.trim())).toEqual([]);
    }
  });

  it('oba slovníky mají stejné klíče', () => {
    const keys = (lang: 'cs' | 'en') => leaves(dict(lang)).map((l) => l.path).sort();
    expect(keys('en')).toEqual(keys('cs'));
  });

  it('jen krátké pomlčky', () => {
    for (const lang of ['cs', 'en'] as const) {
      expect(leaves(dict(lang)).filter((l) => /[–—]/.test(l.text))).toEqual([]);
    }
  });

  it('české skloňování podle počtu', () => {
    const c = dict('cs').common;
    expect([c.sets(1), c.sets(3), c.sets(5)]).toEqual(['1 série', '3 série', '5 sérií']);
    expect([c.exercises(1), c.exercises(2), c.exercises(7)]).toEqual(['1 cvik', '2 cviky', '7 cviků']);
    const e = dict('en').common;
    expect([e.sets(1), e.sets(3)]).toEqual(['1 set', '3 sets']);
  });
});

describe('i18n · výběr jazyka', () => {
  it('auto bere jazyk telefonu, volba v Profilu ho přebije', () => {
    expect(resolveLang('auto', 'en')).toBe('en');
    expect(resolveLang(undefined, 'cs')).toBe('cs');
    expect(resolveLang('cs', 'en')).toBe('cs');
    expect(resolveLang('en', 'cs')).toBe('en');
  });
});

describe('i18n · čísla a data podle jazyka', () => {
  const day = new Date(2026, 9, 16, 12).getTime();

  it('česky čárka a mezera, anglicky tečka a čárka', () => {
    setLang('cs');
    expect(fmtNum(102.5)).toBe('102,5');
    expect(fmtGrouped(12345.5)).toBe('12 345,5');
    setLang('en');
    expect(fmtNum(102.5)).toBe('102.5');
    expect(fmtGrouped(12345.5)).toBe('12,345.5');
  });

  it('datum a relativní den', () => {
    setLang('cs');
    expect(fmtHeaderDate(day)).toBe('PÁTEK · 16. říj');
    expect(relativeDay(day - 3 * 86_400_000, day)).toBe('před 3 dny');
    setLang('en');
    expect(fmtHeaderDate(day)).toBe('FRIDAY · Oct 16');
    expect(relativeDay(day - 86_400_000, day)).toBe('yesterday');
    expect(relativeDay(day - 3 * 86_400_000, day)).toBe('3 days ago');
  });
});

describe('i18n · obrazovky nemají české texty natvrdo (#20)', () => {
  const { readdirSync, readFileSync, statSync } = require('fs');
  const { join } = require('path');
  const { MUSCLE_GROUP_OPTIONS } = require('@/data/types');
  const { EQUIPMENT_OPTIONS } = require('@/data/exerciseOptions');
  // hodnoty uložených dat (klíče partií a vybavení) a název češtiny ve volbě jazyka
  const ALLOWED = new Set<string>([...MUSCLE_GROUP_OPTIONS, ...EQUIPMENT_OPTIONS, 'Čeština']);

  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((f: string) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [];
    });

  it('každý český text v src/app a src/components jde přes slovník', () => {
    const root = join(__dirname, '../src');
    const found: string[] = [];
    for (const file of [...files(join(root, 'app')), ...files(join(root, 'components'))]) {
      const lines: string[] = readFileSync(file, 'utf8').split(/\r?\n/);
      lines.forEach((line, i) => {
        const code = line.replace(/\/\/.*$/, '').replace(/\{\/\*.*?\*\/\}/g, '');
        if (/^\s*(\*|\/\*)/.test(code)) return;
        const literals = [...code.matchAll(/(['"`])((?:(?!\1).)*)\1/g)].map((m) => m[2]);
        // text mezi značkami JSX: řádek bez kódu (přiřazení, volání, podmínky)
        const bare = /^\s*[^\s{<'"`/*][^<>{}=();?]*$/.test(code) ? [code.trim()] : [];
        for (const text of [...literals, ...bare]) {
          if (CZECH.test(text) && !ALLOWED.has(text)) found.push(`${file.slice(root.length + 1)}:${i + 1} ${text}`);
        }
      });
    }
    expect(found).toEqual([]);
  });
});
