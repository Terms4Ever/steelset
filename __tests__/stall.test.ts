import { SetEntry, Workout } from '@/data/types';
import { detectStall, STALL_SESSIONS } from '@/lib/stall';

const set = (weight: number | null, reps: number, extra: Partial<SetEntry> = {}): SetEntry => ({
  type: 'R',
  weight,
  reps,
  done: true,
  ...extra,
});

/** Tréninky se stavějí od nejstaršího; finishedAt roste, aby šlo pořadí poznat. */
function history(exId: string, sessions: SetEntry[][]): Workout[] {
  return sessions.map((sets, i) => ({
    id: `w${i}`,
    name: 't',
    startedAt: (i + 1) * 1000,
    finishedAt: (i + 1) * 1000 + 500,
    exercises: [{ exerciseId: exId, sets }],
  }));
}

describe('stall · detectStall', () => {
  it('pozná tři tréninky na stejné váze bez přidaných opakování', () => {
    const ws = history('squat', [
      [set(100, 5), set(100, 5)],
      [set(100, 5), set(100, 4)],
      [set(100, 5), set(100, 5)],
    ]);
    expect(detectStall(ws, 'squat', 2.5)).toEqual({ weightKg: 100, sessions: 3, nextKg: 102.5 });
  });

  it('mlčí, když opakování přibyla', () => {
    const ws = history('squat', [
      [set(100, 5)],
      [set(100, 5)],
      [set(100, 7)], // nejnovější je lepší než nejstarší ze sledovaných
    ]);
    expect(detectStall(ws, 'squat', 2.5)).toBeNull();
  });

  it('mlčí, když se váha mezitím změnila', () => {
    const ws = history('squat', [[set(100, 5)], [set(105, 5)], [set(100, 5)]]);
    expect(detectStall(ws, 'squat', 2.5)).toBeNull();
  });

  it('mlčí, dokud není dost tréninků', () => {
    const ws = history('squat', [[set(100, 5)], [set(100, 5)]]);
    expect(detectStall(ws, 'squat', 2.5)).toBeNull();
  });

  it('jeden slabší den mezitím nabídku nezdrží', () => {
    const ws = history('squat', [[set(100, 6)], [set(100, 3)], [set(100, 6)]]);
    expect(detectStall(ws, 'squat', 2.5)).not.toBeNull();
  });

  it('počítá jen nejtěžší pracovní sérii, zahřívací ignoruje', () => {
    const warm = set(60, 10, { type: 'W' });
    const ws = history('squat', [
      [warm, set(100, 5)],
      [warm, set(100, 5)],
      [warm, set(100, 5)],
    ]);
    expect(detectStall(ws, 'squat', 2.5)?.weightKg).toBe(100);
  });

  it('nedokončené série se nepočítají', () => {
    const ws = history('squat', [
      [set(100, 5), set(120, 5, { done: false })],
      [set(100, 5)],
      [set(100, 5)],
    ]);
    expect(detectStall(ws, 'squat', 2.5)?.weightKg).toBe(100);
  });

  it('cvik s vlastní vahou bez zátěže nic nenabízí', () => {
    const ws = history('pushup', [[set(null, 20)], [set(null, 20)], [set(null, 20)]]);
    expect(detectStall(ws, 'pushup', 2.5)).toBeNull();
  });

  it('nedokončený trénink se do historie nepočítá', () => {
    const ws = history('squat', [[set(100, 5)], [set(100, 5)], [set(100, 5)]]);
    ws.push({ id: 'live', name: 'běží', startedAt: 9000, exercises: [{ exerciseId: 'squat', sets: [set(100, 5)] }] });
    expect(detectStall(ws, 'squat', 2.5)).not.toBeNull();
  });

  it('umí vynechat konkrétní trénink (ten právě běžící)', () => {
    const ws = history('squat', [[set(100, 5)], [set(100, 5)], [set(100, 5)]]);
    expect(detectStall(ws, 'squat', 2.5, { excludeWorkoutId: 'w2' })).toBeNull();
  });

  it('přeskočí tréninky, ve kterých cvik není', () => {
    const ws = history('squat', [[set(100, 5)], [set(100, 5)], [set(100, 5)]]);
    ws.splice(1, 0, { id: 'jiny', name: 'jiný', startedAt: 1200, finishedAt: 1400, exercises: [{ exerciseId: 'bench-barbell', sets: [set(80, 8)] }] });
    expect(detectStall(ws, 'squat', 2.5)).not.toBeNull();
  });

  it('bez přírůstku nic nenabízí', () => {
    const ws = history('squat', [[set(100, 5)], [set(100, 5)], [set(100, 5)]]);
    expect(detectStall(ws, 'squat', 0)).toBeNull();
  });

  it('počet sledovaných tréninků jde nastavit', () => {
    const ws = history('squat', [[set(100, 5)], [set(100, 5)]]);
    expect(detectStall(ws, 'squat', 2.5, { sessions: 2 })).toMatchObject({ sessions: 2 });
    expect(STALL_SESSIONS).toBe(3);
  });
});
