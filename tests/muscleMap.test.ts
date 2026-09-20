import { MUSCLE_REGIONS } from '@/components/MuscleMapChart';
import { SEED_EXERCISES } from '@/data/exercises';
import { Exercise, MUSCLE_GROUP_OPTIONS, Workout } from '@/data/types';
import { detailedMuscle, muscleSetsDetailed } from '@/lib/calc';

const byId = (ids: string[]): Record<string, Exercise> =>
  Object.fromEntries(SEED_EXERCISES.filter((e) => ids.includes(e.id)).map((e) => [e.id, e]));

const workout = (exerciseId: string, sets: number): Workout =>
  ({
    id: 'w1',
    name: 't',
    startedAt: 1000,
    finishedAt: 2000,
    exercises: [{ exerciseId, sets: Array.from({ length: sets }, () => ({ type: 'R', weight: 20, reps: 12, done: true })) }],
  }) as any as Workout;

describe('svalová mapa · šikmé břišní', () => {
  it('šikmé břišní jsou vlastní oblast na mapě', () => {
    expect(MUSCLE_REGIONS).toContain('Šikmé břišní');
  });

  it('každou oblast mapy jde u cviku vybrat', () => {
    for (const m of MUSCLE_REGIONS) expect(MUSCLE_GROUP_OPTIONS).toContain(m);
  });

  it('cvik s partií Šikmé břišní zůstane na šikmých', () => {
    expect(detailedMuscle('side-bend-db', 'Šikmé břišní', 'Úklony s jednoručkou')).toBe('Šikmé břišní');
  });

  it('vlastní cvik pozná podle názvu, že patří na šikmé', () => {
    expect(detailedMuscle('custom_1', 'Břicho', 'Ruský twist s kotoučem')).toBe('Šikmé břišní');
    expect(detailedMuscle('custom_2', 'Břicho', 'Dřevorubec na kladce')).toBe('Šikmé břišní');
    expect(detailedMuscle('custom_3', 'Břicho', 'Úklony s kettlebellem')).toBe('Šikmé břišní');
    expect(detailedMuscle('custom_4', 'Břicho', 'Boční prkno')).toBe('Šikmé břišní');
    expect(detailedMuscle('custom_5', 'Břicho', 'Woodchop')).toBe('Šikmé břišní');
  });

  it('stará data s partií Břicho zůstanou na břiše', () => {
    expect(detailedMuscle('plank', 'Břicho', 'Plank')).toBe('Břicho');
    expect(detailedMuscle('cable-crunch', 'Břicho', 'Crunch na kladce')).toBe('Břicho');
    expect(detailedMuscle('hanging-leg-raise', 'Břicho', 'Přednožování ve visu')).toBe('Břicho');
    expect(detailedMuscle('custom_6', 'Břicho', 'Sklapovačky')).toBe('Břicho');
  });

  it('objem z úklonů padá na šikmé, ne na břicho', () => {
    const sets = muscleSetsDetailed([workout('side-bend-db', 3)], byId(['side-bend-db']));
    expect(sets['Šikmé břišní']).toBe(6); // jednostranný cvik se počítá 2×
    expect(sets['Břicho']).toBeUndefined();
  });

  it('dřevorubec přidá břichu půlku jako vedlejší partii', () => {
    const sets = muscleSetsDetailed([workout('cable-woodchop', 2)], byId(['cable-woodchop']));
    expect(sets['Šikmé břišní']).toBe(4);
    expect(sets['Břicho']).toBe(2);
  });

  it('crunch na kladce zůstane celý na břiše', () => {
    const sets = muscleSetsDetailed([workout('cable-crunch', 3)], byId(['cable-crunch']));
    expect(sets['Břicho']).toBe(3);
    expect(sets['Šikmé břišní']).toBeUndefined();
  });

  it('každá partie ze seznamu cviků má na mapě své místo', () => {
    for (const ex of SEED_EXERCISES) {
      for (const m of [ex.primary, ...(ex.secondary ?? [])]) {
        expect(MUSCLE_REGIONS).toContain(detailedMuscle(ex.id, m, ex.name));
      }
    }
  });
});
