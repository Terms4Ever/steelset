import { INCREMENT_OPTIONS_KG, INCREMENT_OPTIONS_LB, stepNumber, stepOption } from '@/lib/stepper';

const walk = (start: number, dirs: (1 | -1)[], next: (v: number, d: 1 | -1) => number) => dirs.reduce(next, start);

describe('stepper · přírůstek se vrátí na 2,5 kg (#21)', () => {
  const kg = (v: number, d: 1 | -1) => stepOption(INCREMENT_OPTIONS_KG, v, d);
  const lb = (v: number, d: 1 | -1) => stepOption(INCREMENT_OPTIONS_LB, v, d);

  it('nahlášený případ: třikrát minus a zpátky plus', () => {
    expect(walk(2.5, [-1, -1, -1], kg)).toBe(0.5);
    expect(walk(0.5, [1, 1, 1], kg)).toBe(2.5);
    expect(walk(5, [-1, -1, -1], lb)).toBe(1);
    expect(walk(1, [1, 1], lb)).toBe(5);
  });

  it('z každé hodnoty seznamu se jde dostat na výchozí', () => {
    for (const v of INCREMENT_OPTIONS_KG) {
      let x = v;
      for (let i = 0; i < 10 && x !== 2.5; i++) x = kg(x, x < 2.5 ? 1 : -1);
      expect(x).toBe(2.5);
    }
  });

  it('stará hodnota mimo seznam jde k nejbližší v daném směru', () => {
    expect(kg(1.75, 1)).toBe(2.5);
    expect(kg(1.75, -1)).toBe(1.25);
    expect(kg(3, -1)).toBe(2.5);
    expect(lb(3.5, 1)).toBe(5);
  });

  it('na krajích seznamu zůstane stát', () => {
    expect(kg(0.5, -1)).toBe(0.5);
    expect(kg(5, 1)).toBe(5);
  });
});

describe('stepper · krok po mřížce nesjede mimo ni', () => {
  // nastavení steppery v Profilu: [výchozí, krok, minimum, maximum]
  const PROFIL: [string, number, number, number, number][] = [
    ['tělesná váha kg', 80, 0.5, 30, Infinity],
    ['tělesná váha lb', 176, 1, 66, Infinity],
    ['odpočinek', 90, 15, 15, Infinity],
    ['série', 3, 1, 1, 10],
    ['týdenní cíl', 0, 1, 0, 7],
    // původní konfigurace přírůstku, na které se chyba ukázala
    ['přírůstek kg dřív', 2.5, 1.25, 0.5, Infinity],
    ['přírůstek lb dřív', 5, 2.5, 1, Infinity],
  ];

  it.each(PROFIL)('%s: dolů na minimum a stejně kroků nahoru vrátí výchozí', (_n, start, step, min, max) => {
    const next = (v: number, d: 1 | -1) => stepNumber(v, step, d, min, max);
    let v = start;
    let down = 0;
    while (v > min && down < 500) {
      v = next(v, -1);
      down++;
    }
    expect(v).toBe(min);
    let up = 0;
    while (v < start && up < 500) {
      v = next(v, 1);
      up++;
    }
    expect(v).toBe(start);
  });

  it('hodnota mimo mřížku se zarovná k nejbližšímu bodu ve směru kroku', () => {
    expect(stepNumber(176.4, 1, 1, 66)).toBe(177);
    expect(stepNumber(176.4, 1, -1, 66)).toBe(176);
    expect(stepNumber(0.5, 1.25, 1, 0.5)).toBe(1.25);
  });

  it('desetinná nepřesnost bod mřížky nepřeskočí', () => {
    expect(stepNumber(0.1 + 0.2, 0.1, 1, 0)).toBe(0.4);
    expect(stepNumber(2.5, 1.25, -1, 0.5)).toBe(1.25);
  });
});
