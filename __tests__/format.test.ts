import { fmtBwWeight, fmtClock, fmtGrouped, fmtNum, fmtWeight, fromDisplayWeight, NBSP, relativeDay, toDisplayWeight } from '@/lib/format';

describe('fmtBwWeight (weighted bodyweight, stored as total)', () => {
  it('plain bodyweight shows BW', () => {
    expect(fmtBwWeight(91, 91, 'kg')).toBe('BW');
  });
  it('added plates show BW +N', () => {
    expect(fmtBwWeight(101, 91, 'kg')).toBe(`BW${NBSP}+10${NBSP}kg`);
    expect(fmtBwWeight(93.5, 91, 'kg')).toBe(`BW${NBSP}+2,5${NBSP}kg`);
  });
  it('assisted shows BW -N', () => {
    expect(fmtBwWeight(71, 91, 'kg')).toBe(`BW${NBSP}-20${NBSP}kg`);
  });
  it('nezalomí se mezi číslem a jednotkou', () => {
    expect(fmtBwWeight(101, 91, 'kg')).not.toContain(' ');
  });
});

describe('fmtNum (Czech)', () => {
  it('uses comma decimals and trims trailing zeros', () => {
    expect(fmtNum(102.5)).toBe('102,5');
    expect(fmtNum(100)).toBe('100');
    expect(fmtNum(2.0)).toBe('2');
  });
});

describe('fmtGrouped (oddělovač tisíců)', () => {
  it('malá čísla nechává být', () => {
    expect(fmtGrouped(999)).toBe('999');
    expect(fmtGrouped(0)).toBe('0');
  });
  it('dělí tisíce nezlomitelnou mezerou', () => {
    expect(fmtGrouped(1000)).toBe(`1${NBSP}000`);
    expect(fmtGrouped(1234567)).toBe(`1${NBSP}234${NBSP}567`);
  });
  it('desetinná část zůstává vcelku', () => {
    expect(fmtGrouped(12345.5)).toBe(`12${NBSP}345,5`);
  });
  it('záporné číslo dělí stejně', () => {
    expect(fmtGrouped(-12345)).toBe(`-12${NBSP}345`);
  });
});

describe('unit conversion', () => {
  it('round-trips kg<->lb', () => {
    const lb = toDisplayWeight(100, 'lb');
    expect(lb).toBeCloseTo(220.462, 2);
    expect(fromDisplayWeight(lb, 'lb')).toBeCloseTo(100, 6);
  });
  it('is identity for kg', () => {
    expect(toDisplayWeight(100, 'kg')).toBe(100);
  });
  it('formats with unit suffix', () => {
    expect(fmtWeight(102.5, 'kg')).toBe(`102,5${NBSP}kg`);
  });
  it('mezi číslem a jednotkou je nezlomitelná mezera', () => {
    expect(fmtWeight(102.5, 'kg')).not.toContain(' ');
  });
  it('velké objemy dělí tisíce nezlomitelnou mezerou', () => {
    expect(fmtWeight(12345, 'kg')).toBe(`12${NBSP}345${NBSP}kg`);
  });
});

describe('fmtClock', () => {
  it('formats m:ss', () => {
    expect(fmtClock(90)).toBe('1:30');
    expect(fmtClock(5)).toBe('0:05');
    expect(fmtClock(0)).toBe('0:00');
    expect(fmtClock(-10)).toBe('0:00');
  });
});

describe('relativeDay', () => {
  const now = new Date('2026-06-29T12:00:00').getTime();
  it('labels today / yesterday / N days', () => {
    expect(relativeDay(now, now)).toBe('dnes');
    expect(relativeDay(now - 86_400_000, now)).toBe('včera');
    expect(relativeDay(now - 3 * 86_400_000, now)).toBe('před 3 dny');
  });
});
