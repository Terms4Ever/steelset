import { SetEntry } from '@/data/types';
import { canCopy, dropIndex, ROW_HEIGHT_FALLBACK, valueToCopy } from '@/lib/copyValue';

const set = (weight: number | null, reps: number | null): SetEntry => ({ type: 'R', weight, reps, done: false });

describe('copyValue · dropIndex', () => {
  // rovnoměrné řádky po 65 px: středy 32, 97, 162, 227
  const even = [32, 97, 162, 227];

  it('bez posunu míří na zdroj', () => {
    expect(dropIndex(1, 0, even, 4)).toBe(1);
  });

  it('posun o řádek dolů míří o sérii níž', () => {
    expect(dropIndex(0, 65, even, 4)).toBe(1);
    expect(dropIndex(0, 130, even, 4)).toBe(2);
  });

  it('posun nahoru míří výš', () => {
    expect(dropIndex(3, -65, even, 4)).toBe(2);
  });

  it('půlka řádku ještě nepřepne, přes půlku ano', () => {
    expect(dropIndex(0, 31, even, 4)).toBe(0);
    expect(dropIndex(0, 34, even, 4)).toBe(1);
  });

  it('za krajem se drží na krajní sérii', () => {
    expect(dropIndex(0, -500, even, 4)).toBe(0);
    expect(dropIndex(0, 500, even, 4)).toBe(3);
  });

  it('počítá s tím, že dokončená série je vyšší', () => {
    // 2. série je dokončená a nese rozdíl proti minule, takže je o 11 px vyšší
    const mixed = [32, 100, 176, 241];
    expect(dropIndex(0, 68, mixed, 4)).toBe(1);
    expect(dropIndex(0, 144, mixed, 4)).toBe(2);
    // se starým dělením jednou výškou by 144 px spadlo ještě na druhou sérii
    expect(dropIndex(0, 144, even, 4)).toBe(2);
  });

  it('nezměřené pozice spadnou na náhradní výšku', () => {
    expect(dropIndex(0, ROW_HEIGHT_FALLBACK, [], 3)).toBe(1);
    expect(dropIndex(0, ROW_HEIGHT_FALLBACK, [32, 97], 3)).toBe(1); // neúplné měření
  });

  it('cvik bez sérií vrátí zdroj', () => {
    expect(dropIndex(0, 200, [], 0)).toBe(0);
  });
});

describe('copyValue · valueToCopy', () => {
  const sets = [set(60, 10), set(50, 8), set(null, null)];

  it('zkopíruje váhu z jedné série do druhé', () => {
    expect(valueToCopy(sets, 0, 1, 'weight')).toBe(60);
  });

  it('zkopíruje opakování', () => {
    expect(valueToCopy(sets, 0, 1, 'reps')).toBe(10);
  });

  it('do sebe se nekopíruje', () => {
    expect(valueToCopy(sets, 1, 1, 'weight')).toBeNull();
  });

  it('prázdný zdroj nemá co dát', () => {
    expect(valueToCopy(sets, 2, 0, 'weight')).toBeNull();
    expect(valueToCopy(sets, 2, 0, 'reps')).toBeNull();
  });

  it('do prázdné série se kopírovat dá', () => {
    expect(valueToCopy(sets, 0, 2, 'weight')).toBe(60);
  });

  it('mimo rozsah nic', () => {
    expect(valueToCopy(sets, 0, 9, 'weight')).toBeNull();
    expect(valueToCopy(sets, 9, 0, 'weight')).toBeNull();
  });

  it('kopíruje uloženou hodnotu, tedy celkové kilogramy', () => {
    // cvik s vlastní vahou: uložená váha je BW + přídavek, bodyweightKg je pro celý
    // trénink stejný, takže se přídavek u cíle shoduje se zdrojem
    const bw = [set(91 + 10, 8), set(91 + 5, 8)];
    expect(valueToCopy(bw, 0, 1, 'weight')).toBe(101);
  });

  it('canCopy jen shrnuje valueToCopy', () => {
    expect(canCopy(sets, 0, 1, 'weight')).toBe(true);
    expect(canCopy(sets, 2, 1, 'weight')).toBe(false);
  });
});
