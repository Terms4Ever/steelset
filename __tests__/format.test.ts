import { fmtClock, fmtNum, fmtWeight, fromDisplayWeight, relativeDay, toDisplayWeight } from '@/lib/format';

describe('fmtNum (Czech)', () => {
  it('uses comma decimals and trims trailing zeros', () => {
    expect(fmtNum(102.5)).toBe('102,5');
    expect(fmtNum(100)).toBe('100');
    expect(fmtNum(2.0)).toBe('2');
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
    expect(fmtWeight(102.5, 'kg')).toBe('102,5 kg');
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
