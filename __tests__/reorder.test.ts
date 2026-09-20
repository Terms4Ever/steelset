import { blockAt, canMove, moveBlock, remapIndex, stableKeys } from '@/lib/reorder';

type Item = { exerciseId: string; supersetGroup?: string };

const items = (...spec: string[]): Item[] =>
  spec.map((s) => {
    const [exerciseId, supersetGroup] = s.split(':');
    return supersetGroup ? { exerciseId, supersetGroup } : { exerciseId };
  });

const ids = (list: Item[]) => list.map((i) => i.exerciseId);

describe('reorder · blockAt', () => {
  it('bere samostatný cvik jako blok o jednom', () => {
    expect(blockAt(items('a', 'b', 'c'), 1)).toEqual([1, 1]);
  });

  it('bere supersérii jako celý souvislý úsek', () => {
    const list = items('a', 'b:g1', 'c:g1', 'd');
    expect(blockAt(list, 1)).toEqual([1, 2]);
    expect(blockAt(list, 2)).toEqual([1, 2]);
  });

  it('zvládne i trojčlennou supersérii', () => {
    expect(blockAt(items('a:g1', 'b:g1', 'c:g1'), 1)).toEqual([0, 2]);
  });
});

describe('reorder · canMove', () => {
  it('na krajích nepustí ven', () => {
    const list = items('a', 'b', 'c');
    expect(canMove(list, 0, -1)).toBe(false);
    expect(canMove(list, 2, 1)).toBe(false);
    expect(canMove(list, 1, -1)).toBe(true);
    expect(canMove(list, 1, 1)).toBe(true);
  });

  it('bere kraj celé supersérie, ne jednotlivého cviku', () => {
    const list = items('a:g1', 'b:g1', 'c');
    expect(canMove(list, 1, -1)).toBe(false); // blok už je nahoře
    expect(canMove(list, 0, 1)).toBe(true);
  });

  it('mimo rozsah je false', () => {
    expect(canMove(items('a'), 5, 1)).toBe(false);
  });
});

describe('reorder · moveBlock', () => {
  it('posune cvik nahoru i dolů', () => {
    expect(ids(moveBlock(items('a', 'b', 'c'), 1, -1).items)).toEqual(['b', 'a', 'c']);
    expect(ids(moveBlock(items('a', 'b', 'c'), 1, 1).items)).toEqual(['a', 'c', 'b']);
  });

  it('na kraji nic nedělá', () => {
    const list = items('a', 'b');
    expect(moveBlock(list, 0, -1).items).toBe(list);
    expect(moveBlock(list, 1, 1).items).toBe(list);
  });

  it('supersérii přesune celou a nerozdělí ji', () => {
    const list = items('a', 'b:g1', 'c:g1', 'd');
    expect(ids(moveBlock(list, 1, -1).items)).toEqual(['b', 'c', 'a', 'd']);
    expect(ids(moveBlock(list, 2, 1).items)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('přeskočí celou sousední supersérii, ne jen její první cvik', () => {
    const list = items('a', 'b:g1', 'c:g1');
    expect(ids(moveBlock(list, 0, 1).items)).toEqual(['b', 'c', 'a']);
  });

  it('prohodí dvě supersérie jako dva bloky', () => {
    const list = items('a:g1', 'b:g1', 'c:g2', 'd:g2');
    const moved = moveBlock(list, 0, 1).items;
    expect(ids(moved)).toEqual(['c', 'd', 'a', 'b']);
    expect(moved.map((i) => i.supersetGroup)).toEqual(['g2', 'g2', 'g1', 'g1']);
  });
});

describe('reorder · remapIndex', () => {
  it('posune index cviku spolu s ním', () => {
    const { order } = moveBlock(items('a', 'b', 'c'), 1, -1);
    expect(remapIndex(order, 1)).toBe(0); // b šlo nahoru
    expect(remapIndex(order, 0)).toBe(1); // a se posunulo dolů
    expect(remapIndex(order, 2)).toBe(2); // c se nehnulo
  });

  it('neznámý index nechá být', () => {
    expect(remapIndex([0, 1, 2], 9)).toBe(9);
  });
});

describe('reorder · stableKeys', () => {
  it('rozliší dva stejné cviky v jednom tréninku', () => {
    expect(stableKeys(items('a', 'b', 'a'))).toEqual(['a#1', 'b#1', 'a#2']);
  });

  it('klíč cviku se přesunem nemění', () => {
    const list = items('a', 'b', 'c');
    const before = stableKeys(list);
    const after = stableKeys(moveBlock(list, 2, -1).items);
    expect(after).toEqual([before[0], before[2], before[1]]);
  });
});
