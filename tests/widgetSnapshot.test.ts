import { SEED_EXERCISES } from '@/data/exercises';
import { Exercise, Routine, SetEntry, Workout } from '@/data/types';
import { MS, weeklyVolume, weekStreak } from '@/lib/calc';
import { toDisplayWeight } from '@/lib/format';
import { buildWidgetSnapshot, nextRoutine, streakFromWeeks, weekFromRecent, WIDGET_SNAPSHOT_VERSION } from '@/lib/widgetSnapshot';

const exById: Record<string, Exercise> = Object.fromEntries(SEED_EXERCISES.map((e) => [e.id, e]));
const set = (weight: number, reps: number): SetEntry => ({ type: 'R', weight, reps, done: true });

// pevné „teď" uprostřed týdne, ať testy nezávisí na tom, kdy běží
const NOW = Math.floor(1_790_000_000_000 / MS.WEEK) * MS.WEEK + 3 * MS.DAY + 12 * 3600_000;

let n = 0;
const done = (daysAgo: number, opts: Partial<Workout> = {}): Workout => {
  const finishedAt = NOW - daysAgo * MS.DAY;
  return {
    id: `w${n++}`,
    name: 'Trénink',
    startedAt: finishedAt - 3600_000,
    finishedAt,
    exercises: [{ exerciseId: 'squat', sets: [set(100, 5), set(100, 5)] }],
    ...opts,
  };
};
const routine = (id: string, name = id): Routine => ({ id, name, exercises: [{ exerciseId: 'squat', targetSets: 3, targetReps: 5 }] });

const snap = (workouts: Workout[], extra: Partial<Parameters<typeof buildWidgetSnapshot>[0]> = {}) =>
  buildWidgetSnapshot({ workouts, routines: [], activeWorkoutId: null, unit: 'kg', exercisesById: exById, ...extra }, NOW);

describe('nextRoutine', () => {
  it('bez plánů nevrací nic', () => {
    expect(nextRoutine([], [done(1)])).toBeNull();
  });

  it('nikdy necvičený plán má přednost, mezi nimi rozhoduje pořadí', () => {
    const r = nextRoutine([routine('a'), routine('b'), routine('c')], [done(1, { routineId: 'a' })]);
    expect(r?.routine.id).toBe('b');
    expect(r?.lastAt).toBeNull();
  });

  it('když se cvičily všechny, vyhraje ten, který čeká nejdéle', () => {
    const r = nextRoutine(
      [routine('a'), routine('b'), routine('c')],
      [done(1, { routineId: 'a' }), done(5, { routineId: 'b' }), done(3, { routineId: 'c' }), done(9, { routineId: 'a' })],
    );
    expect(r?.routine.id).toBe('b');
    expect(r?.lastAt).toBe(NOW - 5 * MS.DAY);
  });

  it('rozdělaný trénink se nepočítá jako odcvičený', () => {
    const running: Workout = { ...done(0, { routineId: 'a' }), finishedAt: undefined };
    const r = nextRoutine([routine('a'), routine('b')], [running, done(2, { routineId: 'b' })]);
    expect(r?.routine.id).toBe('a');
  });
});

describe('buildWidgetSnapshot', () => {
  it('nese verzi, jednotku a tréninky za 14 dní od nejnovějšího', () => {
    const s = snap([done(20), done(2), done(13), done(6)]);
    expect(s.v).toBe(WIDGET_SNAPSHOT_VERSION);
    expect(s.unit).toBe('kg');
    expect(s.recent.map((r) => r.at)).toEqual([NOW - 2 * MS.DAY, NOW - 6 * MS.DAY, NOW - 13 * MS.DAY]);
  });

  it('objem je v jednotce uživatele', () => {
    const kg = snap([done(1)]).recent[0].volume;
    const lb = snap([done(1)], { unit: 'lb' }).recent[0].volume;
    expect(kg).toBe(1000);
    expect(lb).toBeCloseTo(toDisplayWeight(1000, 'lb'), 1);
  });

  it('rozdělaný živý trénink je v active, zpětný zápis ani dokončený ne', () => {
    const live: Workout = { ...done(0), id: 'live', finishedAt: undefined, name: 'Nohy' };
    expect(snap([live], { activeWorkoutId: 'live' }).active).toEqual({ name: 'Nohy', startedAt: live.startedAt });

    const manual: Workout = { ...live, id: 'm', manual: true };
    expect(snap([manual], { activeWorkoutId: 'm' }).active).toBeNull();

    const finished = done(0, { id: 'f' });
    expect(snap([finished], { activeWorkoutId: 'f' }).active).toBeNull();
  });

  it('další plán nese jméno, počet cviků a kdy se cvičil naposledy', () => {
    const s = snap([done(4, { routineId: 'a' })], { routines: [routine('a', 'Nohy')] });
    expect(s.next).toEqual({ id: 'a', name: 'Nohy', exercises: 1, lastAt: NOW - 4 * MS.DAY });
  });

  it('bez tréninků je snímek prázdný, ne rozbitý', () => {
    const s = snap([]);
    expect(s.recent).toEqual([]);
    expect(s.streakWeeks).toEqual([]);
    expect(s.active).toBeNull();
    expect(s.next).toBeNull();
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

describe('widget ukáže stejná čísla jako aplikace', () => {
  const history = [done(0.5), done(2), done(6.5), done(8), done(15), done(22), done(40)];

  it('série v řadě sedí s weekStreak na Dnešku', () => {
    const s = snap(history);
    expect(streakFromWeeks(s.streakWeeks, NOW)).toBe(weekStreak(history, NOW));
  });

  it('série v řadě sedí i ze zastaralého snímku', () => {
    const s = snap(history);
    for (const weeksLater of [1, 2, 3]) {
      const later = NOW + weeksLater * MS.WEEK;
      expect(streakFromWeeks(s.streakWeeks, later)).toBe(weekStreak(history, later));
    }
  });

  it('tréninky a objem za týden sedí s Pokrokem', () => {
    const s = snap(history);
    const w = weekFromRecent(s.recent, NOW);
    expect(w.count).toBe(history.filter((h) => h.finishedAt! >= NOW - MS.WEEK).length);
    expect(w.volume).toBe(Math.round(weeklyVolume(history, NOW, exById)));
  });

  it('okno se posouvá i bez nového snímku', () => {
    const s = snap(history);
    for (const daysLater of [1, 3, 6]) {
      const later = NOW + daysLater * MS.DAY;
      const w = weekFromRecent(s.recent, later);
      expect(w.count).toBe(history.filter((h) => h.finishedAt! >= later - MS.WEEK && h.finishedAt! <= later).length);
      expect(w.volume).toBe(Math.round(weeklyVolume(history, later, exById)));
    }
  });
});

describe('tvar snímku sedí se Swiftem', () => {
  // Swift snímek dekóduje přes Codable. Rozejdou-li se jména polí, widget na zařízení
  // tiše zčerná a z Windows se to nepozná, proto se porovnává přímo zdroják.
  it('pole v struct WidgetSnapshot jsou přesně klíče snímku', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const swift: string = fs.readFileSync(path.join(__dirname, '..', 'targets', 'widgets', 'HomeWidgets.swift'), 'utf8');
    const start = swift.indexOf('struct WidgetSnapshot: Codable {');
    expect(start).toBeGreaterThan(-1);
    // blok struktury až po její párovou uzavírací závorku (konce řádků mohou být CRLF)
    let depth = 0;
    let end = start;
    for (let i = swift.indexOf('{', start); i < swift.length; i++) {
      if (swift[i] === '{') depth++;
      else if (swift[i] === '}' && --depth === 0) {
        end = i;
        break;
      }
    }
    const block = swift.slice(start, end);
    const swiftFields = new Set([...block.matchAll(/\blet (\w+):/g)].map((m) => m[1]));

    const live: Workout = { ...done(0), id: 'live', finishedAt: undefined };
    const full = buildWidgetSnapshot(
      { workouts: [done(1, { routineId: 'a' }), live], routines: [routine('a')], activeWorkoutId: 'live', unit: 'kg', exercisesById: exById },
      NOW,
    );
    const keys = new Set<string>();
    const walk = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object')
        for (const [k, x] of Object.entries(v)) {
          keys.add(k);
          walk(x);
        }
    };
    walk(full);

    expect([...swiftFields].sort()).toEqual([...keys].sort());
  });
});
