jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { startWidgetSync } from '@/lib/useWidgetSync';
import { WidgetSnapshot } from '@/lib/widgetSnapshot';
import { useStore } from '@/store/useStore';

const s = () => useStore.getState();
const DEBOUNCE = 100;

let writes: WidgetSnapshot[];
let stop: () => void;

beforeEach(() => {
  jest.useFakeTimers();
  s().wipeAll();
  writes = [];
  stop = startWidgetSync((json) => writes.push(JSON.parse(json)), DEBOUNCE);
});

afterEach(() => {
  stop();
  jest.useRealTimers();
});

const settle = () => jest.advanceTimersByTime(DEBOUNCE + 50);
const last = () => writes[writes.length - 1];

describe('snímek pro widgety drží krok se store', () => {
  it('zapíše se hned po startu, bez čekání na první změnu', () => {
    expect(writes).toHaveLength(1);
    expect(last().last).toBeNull();
    expect(last().routines).toEqual([]);
  });

  it('obnoví se po změně plánu, dokončení tréninku, změně cíle i novém vážení', () => {
    const rid = s().addRoutine({ name: 'Nohy', exercises: [{ exerciseId: 'squat', targetSets: 2, targetReps: 5 }] });
    settle();
    expect(last().routines.map((r) => r.name)).toEqual(['Nohy']);
    expect(last().next).toBe(rid);

    s().startWorkout(rid);
    s().updateSet(0, 0, { weight: 100, reps: 5, done: true });
    s().finishWorkout();
    settle();
    expect(last().recent).toHaveLength(1);
    expect(last().recent[0].volume).toBe(500);
    expect(last().last?.name).toBe('Nohy');
    expect(last().routines[0].lastAt).toBe(last().recent[0].at);

    s().setSetting('weeklyGoal', 3);
    settle();
    expect(last().goal).toBe(3);

    const weighedAt = Date.now() - 1000;
    s().setBodyweightLog([{ at: weighedAt, kg: 82.4 }]);
    settle();
    expect(last().weight).toEqual([{ at: weighedAt, value: 82.4 }]);
  });

  it('víc změn rychle za sebou je jeden zápis', () => {
    const rid = s().addRoutine({ name: 'Nohy', exercises: [] });
    settle();
    const before = writes.length;
    // každé přejmenování snímek mění, takže bez odkládání by vznikly tři zápisy
    s().updateRoutine(rid, { name: 'A' });
    jest.advanceTimersByTime(DEBOUNCE / 2);
    s().updateRoutine(rid, { name: 'B' });
    jest.advanceTimersByTime(DEBOUNCE / 2);
    s().updateRoutine(rid, { name: 'C' });
    settle();
    expect(writes.length).toBe(before + 1);
    expect(last().routines[0].name).toBe('C');
  });

  it('změna, která snímek nemění, nic nezapíše', () => {
    settle();
    const before = writes.length;
    s().toggleFavorite('squat');
    settle();
    expect(writes).toHaveLength(before);
  });

  it('po zastavení už se nezapisuje', () => {
    stop();
    const before = writes.length;
    s().addRoutine({ name: 'Záda', exercises: [] });
    settle();
    expect(writes).toHaveLength(before);
  });
});
