jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { readFileSync } from 'fs';
import { join } from 'path';

import type { Workout } from '@/data/types';
import { endedState, nextSetLabel, runningState, startsWatch, type WatchState } from '@/lib/watchState';
import { finishFromWatch, startWatchSync } from '@/lib/watchSync';
import { useStore } from '@/store/useStore';

const s = () => useStore.getState();
const HOUR = 60 * 60 * 1000;

function fakeWatch() {
  const calls: { op: 'start' | 'end'; state: WatchState }[] = [];
  return {
    calls,
    forgotten: [] as string[],
    startFor: (state: WatchState) => calls.push({ op: 'start', state }),
    end: (state: WatchState) => calls.push({ op: 'end', state }),
    forget(id: string) {
      this.forgotten.push(id);
    },
  };
}

const routine = () => s().addRoutine({ name: 'Push', exercises: [{ exerciseId: 'bench', targetSets: 2, targetReps: 5 }] });

beforeEach(() => {
  s().wipeAll();
  s().completeOnboarding([]);
});

describe('watchState · co dostanou hodinky (#15)', () => {
  const w = (extra: Partial<Workout> = {}): Workout => ({
    id: 'w1',
    name: 'Push',
    startedAt: 1_000,
    exercises: [
      { exerciseId: 'bench', sets: [{ done: true } as any, { done: false } as any, { done: false } as any] },
      { exerciseId: 'squat', sets: [{ done: false } as any] },
    ],
    ...extra,
  });
  const ex = { bench: { name: 'Bench press' } as any, squat: { name: 'Dřep' } as any };

  it('další série je první nedokončená, s pořadím', () => {
    expect(nextSetLabel(w(), ex)).toBe('Bench press 2/3');
    const done = w({ exercises: [{ exerciseId: 'bench', sets: [{ done: true } as any] }] });
    expect(nextSetLabel(done, ex)).toBe('');
  });

  it('odpočinek jde hodinkám jen dokud běží', () => {
    expect(runningState(w(), 5_000, ex, 4_000).restEndAt).toBe(5_000);
    expect(runningState(w(), 3_000, ex, 4_000).restEndAt).toBe(0);
    expect(runningState(w(), null, ex, 4_000)).toMatchObject({ active: true, workoutId: 'w1', name: 'Push', at: 4_000 });
  });

  it('hodinky se spouští jen u živého tréninku', () => {
    expect(startsWatch(w(), 2_000)).toBe(true);
    expect(startsWatch(w({ manual: true }), 2_000)).toBe(false);
    expect(startsWatch(w({ finishedAt: 1_500 }), 2_000)).toBe(false);
    expect(startsWatch(w({ editEndAt: 1_500 }), 2_000)).toBe(false);
    expect(startsWatch(w(), 1_000 + 13 * HOUR)).toBe(false);
    expect(startsWatch(undefined, 2_000)).toBe(false);
  });

  it('klíče stavu čtou hodinky ve Swiftu a žádný nechybí', () => {
    const swift = readFileSync(join(__dirname, '../targets/watch/WorkoutManager.swift'), 'utf8');
    const fn = swift.slice(swift.indexOf('func applyPhoneState'), swift.indexOf('private func scheduleRestHaptic'));
    const read = new Set([...fn.matchAll(/state\["(\w+)"\]/g)].map((m) => m[1]));
    expect([...read].sort()).toEqual(Object.keys(endedState('x', false, 0)).sort());
  });
});

describe('watchSync · start a konec podle tréninku v telefonu', () => {
  it('živý trénink hodinky spustí, dokončený je ukončí s uložením', () => {
    const api = fakeWatch();
    const stop = startWatchSync(api);
    const wid = s().startWorkout(routine());
    expect(api.calls).toEqual([{ op: 'start', state: expect.objectContaining({ active: true, workoutId: wid, name: 'Push', next: expect.stringMatching(/1\/2$/) }) }]);

    s().toggleSetDone(0, 0);
    s().finishWorkout();
    expect(api.calls[1]).toEqual({ op: 'end', state: expect.objectContaining({ active: false, workoutId: wid, discard: false }) });
    stop();
  });

  it('zahozený trénink hodinky ukončí bez uložení', () => {
    const api = fakeWatch();
    const stop = startWatchSync(api);
    const wid = s().startWorkout(routine());
    s().discardWorkout();
    expect(api.calls[1]).toEqual({ op: 'end', state: expect.objectContaining({ workoutId: wid, discard: true }) });
    stop();
  });

  it('vypnutý přepínač, zpětný zápis ani úprava starého tréninku hodinky nespustí', () => {
    const api = fakeWatch();
    const stop = startWatchSync(api);
    s().setSetting('watchAutoStart', false);
    s().startWorkout(routine());
    s().discardWorkout();
    s().setSetting('watchAutoStart', true);
    s().startWorkout(null, true);
    s().discardWorkout();
    expect(api.calls.filter((c) => c.op === 'start')).toHaveLength(0);
    stop();
  });

  it('trénink běžící před spuštěním aplikace hodinky probudí znovu', () => {
    const wid = s().startWorkout(routine());
    const api = fakeWatch();
    const stop = startWatchSync(api);
    expect(api.calls).toEqual([{ op: 'start', state: expect.objectContaining({ workoutId: wid }) }]);
    stop();
  });

  it('výchozí nastavení hodinky spouští', () => {
    expect(s().settings.watchAutoStart).toBe(true);
  });
});

describe('watchSync · konec z hodinek ukončí telefon', () => {
  it('s hotovou sérií trénink v telefonu skončí a uloží se', () => {
    const api = fakeWatch();
    const wid = s().startWorkout(routine());
    s().toggleSetDone(0, 0);
    expect(finishFromWatch(wid, api)).toBe(true);
    expect(s().activeWorkoutId).toBeNull();
    expect(s().workouts.find((w) => w.id === wid)?.finishedAt).toBeDefined();
    expect(api.forgotten).toEqual([wid]);
  });

  it('bez hotové série zůstane otevřený, nic se potichu nezahodí', () => {
    const wid = s().startWorkout(routine());
    expect(finishFromWatch(wid, fakeWatch())).toBe(false);
    expect(s().activeWorkoutId).toBe(wid);
  });

  it('konec cizího tréninku telefon neukončí', () => {
    const wid = s().startWorkout(routine());
    s().toggleSetDone(0, 0);
    expect(finishFromWatch('jiny', fakeWatch())).toBe(false);
    expect(s().activeWorkoutId).toBe(wid);
  });
});
