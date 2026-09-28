import { SEED_EXERCISES } from '@/data/exercises';
import { Exercise, Routine, SetEntry, Workout } from '@/data/types';
import { MS, muscleSetsDetailed, setZone, weeklyVolume, weekStreak } from '@/lib/calc';
import { toDisplayWeight } from '@/lib/format';
import {
  buildWidgetSnapshot,
  goalDone,
  muscleZone,
  nextRoutine,
  streakFromWeeks,
  topMuscles,
  trainedDaysThisMonth,
  weekFromRecent,
  weekStartMonday,
  weightTrend,
  WIDGET_APP_GROUP,
  WIDGET_SNAPSHOT_KEY,
  WIDGET_SNAPSHOT_VERSION,
  workoutsThisMonth,
} from '@/lib/widgetSnapshot';

const exById: Record<string, Exercise> = Object.fromEntries(SEED_EXERCISES.map((e) => [e.id, e]));
const set = (weight: number, reps: number): SetEntry => ({ type: 'R', weight, reps, done: true });

// pevné „teď": středa 16. 9. 2026 ve 12:00 místního času, ať testy nezávisí na tom, kdy běží
const NOW = new Date(2026, 8, 16, 12, 0, 0).getTime();

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

type Input = Parameters<typeof buildWidgetSnapshot>[0];
const snap = (workouts: Workout[], extra: Partial<Input> = {}, now = NOW) =>
  buildWidgetSnapshot({ workouts, routines: [], unit: 'kg', weeklyGoal: 0, bodyweightLog: [], exercisesById: exById, ...extra }, now);

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
  it('nese verzi, jednotku a tréninky za 42 dní od nejnovějšího', () => {
    const s = snap([done(50), done(2), done(41), done(6)]);
    expect(s.v).toBe(WIDGET_SNAPSHOT_VERSION);
    expect(s.unit).toBe('kg');
    expect(s.recent.map((r) => r.at)).toEqual([NOW - 2 * MS.DAY, NOW - 6 * MS.DAY, NOW - 41 * MS.DAY]);
  });

  it('objem je v jednotce uživatele', () => {
    expect(snap([done(1)]).recent[0].volume).toBe(1000);
    expect(snap([done(1)], { unit: 'lb' }).recent[0].volume).toBeCloseTo(toDisplayWeight(1000, 'lb'), 1);
  });

  it('série po partiích u tréninku sedí se svalovou mapou', () => {
    const w = done(1, { exercises: [{ exerciseId: 'bench-barbell', sets: [set(80, 8), set(80, 8), set(80, 8)] }] });
    expect(snap([w]).recent[0].sets).toEqual(muscleSetsDetailed([w], exById));
  });

  it('poslední trénink nese jméno, objem, délku a průměrný tep', () => {
    const w = done(1, { name: 'Hrudník', avgHr: 127.6 });
    const s = snap([done(3), w]);
    expect(s.last).toEqual({ id: w.id, name: 'Hrudník', at: w.finishedAt, volume: 1000, minutes: 60, avgHr: 128 });
    expect(snap([done(1)]).last?.avgHr).toBeNull();
    expect(snap([]).last).toBeNull();
  });

  it('plánů je nejvýš čtyři a ten na řadě mezi nimi nechybí', () => {
    const routines = ['a', 'b', 'c', 'd', 'e'].map((id) => routine(id));
    const workouts = ['a', 'b', 'c', 'd'].map((id, i) => done(i + 1, { routineId: id }));
    const s = snap(workouts, { routines });
    expect(s.next).toBe('e');
    expect(s.routines.map((r) => r.id)).toEqual(['a', 'b', 'c', 'e']);
    expect(s.routines[0].lastAt).toBe(NOW - MS.DAY);
    expect(s.routines[3].lastAt).toBeNull();
  });

  it('cíl se jen předá, nesmysl je nula', () => {
    expect(snap([], { weeklyGoal: 4 }).goal).toBe(4);
    expect(snap([], { weeklyGoal: -2 }).goal).toBe(0);
    expect(snap([], { weeklyGoal: NaN }).goal).toBe(0);
  });

  it('váha je za 30 dní, od nejstarší a v jednotce uživatele', () => {
    const log = [
      { at: NOW - 40 * MS.DAY, kg: 84 },
      { at: NOW - 2 * MS.DAY, kg: 82.4 },
      { at: NOW - 20 * MS.DAY, kg: 83.2 },
    ];
    expect(snap([], { bodyweightLog: log }).weight).toEqual([
      { at: NOW - 20 * MS.DAY, value: 83.2 },
      { at: NOW - 2 * MS.DAY, value: 82.4 },
    ]);
    expect(snap([], { bodyweightLog: log, unit: 'lb' }).weight[1].value).toBeCloseTo(toDisplayWeight(82.4, 'lb'), 1);
  });

  it('bez dat je snímek prázdný, ne rozbitý', () => {
    const s = snap([]);
    expect(s).toMatchObject({ recent: [], streakWeeks: [], goal: 0, last: null, routines: [], next: null, weight: [] });
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

describe('widget ukáže stejná čísla jako aplikace', () => {
  const history = [done(0.5), done(2), done(6.5), done(8), done(15), done(22), done(40)];

  it('série v řadě sedí s Dneškem, i ze zastaralého snímku', () => {
    const s = snap(history);
    for (const later of [0, 1, 2, 3].map((w) => NOW + w * MS.WEEK)) {
      expect(streakFromWeeks(s.streakWeeks, later)).toBe(weekStreak(history, later));
    }
  });

  it('tréninky a objem za sedm dní sedí s Pokrokem, i když okno odjede', () => {
    const s = snap(history);
    for (const later of [0, 1, 3, 6].map((d) => NOW + d * MS.DAY)) {
      const w = weekFromRecent(s.recent, later);
      expect(w.count).toBe(history.filter((h) => h.finishedAt! >= later - MS.WEEK && h.finishedAt! <= later).length);
      expect(w.volume).toBe(Math.round(weeklyVolume(history, later, exById)));
    }
  });

  it('série po partiích za sedm dní sedí se svalovou mapou', () => {
    const mixed = [
      done(1, { exercises: [{ exerciseId: 'bench-barbell', sets: [set(80, 8), set(80, 8)] }] }),
      done(3),
      done(9, { exercises: [{ exerciseId: 'bench-barbell', sets: [set(80, 8)] }] }),
    ];
    const top = topMuscles(snap(mixed).recent, NOW);
    const map = muscleSetsDetailed(mixed, exById, NOW - MS.WEEK, NOW);
    expect(Object.fromEntries(top.map((m) => [m.name, m.sets]))).toEqual(
      Object.fromEntries(Object.entries(map).map(([k, v]) => [k, Math.round(v * 10) / 10])),
    );
    for (let i = 1; i < top.length; i++) expect(top[i - 1].sets).toBeGreaterThanOrEqual(top[i].sets);
  });

  it('zóny sérií jsou stejné jako na svalové mapě', () => {
    for (const s of [0.5, 4, 5, 12, 19.5, 20, 25, 26, 40]) expect(muscleZone(s)).toBe(setZone(s));
  });
});

describe('týdenní cíl a kalendář', () => {
  it('týden začíná v pondělí o půlnoci', () => {
    for (const day of [14, 15, 16, 19, 20]) {
      const t = new Date(2026, 8, day, 18, 30).getTime();
      const start = new Date(weekStartMonday(t));
      expect(start.getDay()).toBe(1);
      expect([start.getHours(), start.getMinutes()]).toEqual([0, 0]);
      expect(t - start.getTime()).toBeLessThan(7 * MS.DAY + 3600_000);
      expect(t).toBeGreaterThanOrEqual(start.getTime());
    }
  });

  it('cíl počítá jen tréninky od pondělí a v pondělí začne od nuly', () => {
    // NOW je středa: pondělí a úterý se počítají, minulá neděle ne
    const s = snap([done(0.1), done(1), done(2), done(3)]);
    expect(goalDone(s.recent, NOW)).toBe(3);
    const nextMonday = new Date(2026, 8, 21, 8, 0).getTime();
    expect(goalDone(s.recent, nextMonday)).toBe(0);
  });

  it('kalendář bere jen dny tohoto měsíce, i kolem jeho konce', () => {
    const endOfMonth = new Date(2026, 8, 30, 20, 0).getTime();
    const ws = [new Date(2026, 8, 30, 7).getTime(), new Date(2026, 8, 2, 7).getTime(), new Date(2026, 7, 31, 7).getTime()].map(
      (at, i) => ({ ...done(0), id: `k${i}`, startedAt: at - 3600_000, finishedAt: at }),
    );
    const s = snap(ws, {}, endOfMonth);
    expect(trainedDaysThisMonth(s.recent, endOfMonth)).toEqual([2, 30]);
    expect(workoutsThisMonth(s.recent, endOfMonth)).toBe(2);
    const october = new Date(2026, 9, 1, 9).getTime();
    expect(trainedDaysThisMonth(s.recent, october)).toEqual([]);
  });

  it('trend váhy je změna proti prvnímu vážení v okně', () => {
    expect(weightTrend([])).toBeNull();
    expect(weightTrend([{ at: 1, value: 82.4 }])).toEqual({ value: 82.4, change: null });
    expect(weightTrend([{ at: 1, value: 83.2 }, { at: 2, value: 82.9 }, { at: 3, value: 82.4 }])).toEqual({ value: 82.4, change: -0.8 });
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
    const swiftFields = new Set([...swift.slice(start, end).matchAll(/\blet (\w+):/g)].map((m) => m[1]));

    const full = snap([done(1, { routineId: 'a', avgHr: 120 })], {
      routines: [routine('a')],
      weeklyGoal: 3,
      bodyweightLog: [{ at: NOW - MS.DAY, kg: 82 }],
    });
    const keys = new Set<string>();
    const walk = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object')
        for (const [k, x] of Object.entries(v)) {
          keys.add(k);
          // `sets` je slovník partie -> série, jeho klíče jsou data, ne pole struktury
          if (k !== 'sets') walk(x);
        }
    };
    walk(full);

    expect([...swiftFields].sort()).toEqual([...keys].sort());
  });
});

describe('App Group je stejná všude', () => {
  // Build 29 měl oprávnění k App Group jen v aplikaci, rozšíření s widgety ne: aplikace
  // zapisovala, widget nesměl číst a na telefonu hlásil „Otevři Steelset". Z Windows se to
  // nepozná, proto se hlídá konfigurace, ze které EAS a Xcode oprávnění skládají.
  const fs = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');
  const root = path.join(__dirname, '..');
  const KEY = 'com.apple.security.application-groups';

  it('aplikace i rozšíření s widgety mají v konfiguraci stejnou App Group', () => {
    const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
    const target = JSON.parse(fs.readFileSync(path.join(root, 'targets', 'widgets', 'expo-target.config.json'), 'utf8'));
    expect(app.expo.ios.entitlements[KEY]).toEqual([WIDGET_APP_GROUP]);
    // plugin @bacons/apple-targets App Group od aplikace převezme, jen když má target
    // vlastní klíč `entitlements`; bez něj rozšíření nedostane nic, proto výslovně
    expect(target.entitlements?.[KEY]).toEqual([WIDGET_APP_GROUP]);
  });

  it('Swift čte ze stejné App Group a pod stejným klíčem, kam aplikace zapisuje', () => {
    const swift = fs.readFileSync(path.join(root, 'targets', 'widgets', 'HomeWidgets.swift'), 'utf8');
    expect(swift).toContain(`private let steelsetAppGroup = "${WIDGET_APP_GROUP}"`);
    expect(swift).toContain(`private let steelsetSnapshotKey = "${WIDGET_SNAPSHOT_KEY}"`);
  });
});
