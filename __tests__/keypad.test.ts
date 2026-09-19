import { focusAfterSetRemoved, KeypadFocus } from '@/lib/keypad';

const F = (ex: number, set: number, field: 'weight' | 'reps' = 'weight'): KeypadFocus => ({ ex, set, field });

describe('focusAfterSetRemoved', () => {
  it('zavřená klávesnice zůstane zavřená', () => {
    expect(focusAfterSetRemoved(null, 0, 1)).toBeNull();
  });

  it('smazání série, do které se právě psalo, fokus zruší', () => {
    expect(focusAfterSetRemoved(F(0, 1), 0, 1)).toBeNull();
  });

  it('smazání dřívější série posune index, aby fokus zůstal u stejné série', () => {
    expect(focusAfterSetRemoved(F(0, 2, 'reps'), 0, 0)).toEqual({ ex: 0, set: 1, field: 'reps' });
  });

  it('smazání pozdější série fokus nemění', () => {
    expect(focusAfterSetRemoved(F(0, 1), 0, 2)).toEqual({ ex: 0, set: 1, field: 'weight' });
  });

  it('smazání u jiného cviku fokus nemění', () => {
    expect(focusAfterSetRemoved(F(1, 0), 0, 0)).toEqual({ ex: 1, set: 0, field: 'weight' });
  });
});
