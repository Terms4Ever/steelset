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
    expect(last().active).toBeNull();
    expect(last().next).toBeNull();
  });

  it('obnoví se po změně plánu, startu, dopsání série i ukončení tréninku', () => {
    const rid = s().addRoutine({ name: 'Nohy', exercises: [{ exerciseId: 'squat', targetSets: 2, targetReps: 5 }] });
    settle();
    expect(last().next?.name).toBe('Nohy');

    s().startWorkout(rid);
    settle();
    expect(last().active?.name).toBe('Nohy');

    s().updateSet(0, 0, { weight: 100, reps: 5, done: true });
    s().finishWorkout();
    settle();
    expect(last().active).toBeNull();
    expect(last().recent).toHaveLength(1);
    expect(last().recent[0].volume).toBe(500);
    expect(last().next?.lastAt).toBe(last().recent[0].at);
  });

  it('víc změn rychle za sebou je jeden zápis', () => {
    const id = s().startWorkout(null);
    settle();
    const before = writes.length;
    // každé přejmenování snímek mění, takže bez odkládání by vznikly tři zápisy
    s().renameWorkout(id, 'A');
    jest.advanceTimersByTime(DEBOUNCE / 2);
    s().renameWorkout(id, 'B');
    jest.advanceTimersByTime(DEBOUNCE / 2);
    s().renameWorkout(id, 'C');
    settle();
    expect(writes.length).toBe(before + 1);
    expect(last().active?.name).toBe('C');
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
