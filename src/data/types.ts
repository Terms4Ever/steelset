// Domain model for Steelset - strength tracker.

export type TrackingType =
  | 'weight_reps' // činka/jednoručky: váha × opakování
  | 'bodyweight_reps' // vlastní váha × opakování
  | 'weighted_bw' // přidaná váha (dipy, shyby s váhou)
  | 'distance_time' // kardio
  | 'time' // výdrž
  | 'reps'; // jen opakování

export type SetType = 'W' | 'R' | 'D' | 'F'; // warmup / working / drop / failure

export type MuscleGroup =
  | 'Hrudník'
  | 'Záda'
  | 'Nohy'
  | 'Ramena'
  | 'Biceps'
  | 'Triceps'
  | 'Břicho'
  | 'Hýždě'
  | 'Lýtka'
  | 'Předloktí'
  // detailní partie (pokrývají celou svalovou mapu; Záda/Nohy zůstávají jako obecné)
  | 'Trapézy'
  | 'Horní záda'
  | 'Spodní záda'
  | 'Kvadricepsy'
  | 'Hamstringy';

/** Nabídka partií pro výběr u cviku (obecné + detailní). */
export const MUSCLE_GROUP_OPTIONS: MuscleGroup[] = [
  'Hrudník',
  'Horní záda',
  'Spodní záda',
  'Trapézy',
  'Ramena',
  'Biceps',
  'Triceps',
  'Předloktí',
  'Břicho',
  'Kvadricepsy',
  'Hamstringy',
  'Hýždě',
  'Lýtka',
  'Záda',
  'Nohy',
];

export type Equipment =
  | 'Činka'
  | 'Jednoručky'
  | 'Kladka'
  | 'Stroj'
  | 'Vlastní váha'
  | 'Kettlebell'
  | 'Guma';

export interface Exercise {
  id: string;
  name: string;
  primary: MuscleGroup;
  secondary?: MuscleGroup[];
  equipment: Equipment;
  tracking: TrackingType;
  custom?: boolean;
  unilateral?: boolean; // jednostranný cvik (jedna ruka/noha) - objem se počítá 2×
  defaultBar?: number; // hmotnost tyče pro plate kalkulačku
  note?: string;
}

export interface SetEntry {
  type: SetType;
  weight: number | null;
  reps: number | null;
  rpe?: number | null;
  done: boolean;
  doneAt?: number; // epoch ms kdy byla série dokončena (pro značky v grafu tepu)
}

export interface HrSample {
  t: number; // epoch ms
  bpm: number;
}

export interface LoggedExercise {
  exerciseId: string;
  sets: SetEntry[];
  note?: string;
  supersetGroup?: string; // exercises sharing this id are performed as a superset
}

export interface Workout {
  id: string;
  routineId?: string;
  name: string;
  startedAt: number; // epoch ms (u manuálního zápisu = zvolené datum tréninku)
  finishedAt?: number; // epoch ms; undefined = probíhá
  manual?: boolean; // true = zpětný zápis (bez živého časovače)
  avgHr?: number; // průměrný tep z Apple Health (z hodinek)
  maxHr?: number; // maximální tep z Apple Health
  kcal?: number; // aktivní kalorie z Apple Health (z hodinek)
  bodyweightKg?: number; // snapshot tělesné váhy při tréninku (pro +KG u cviků s vlastní vahou)
  hrSeries?: HrSample[]; // časová řada tepu během tréninku (pro graf)
  healthUuid?: string; // uuid HKWorkout z Apple Health (dedup importu)
  source?: 'health'; // původ záznamu (import z Apple Health / Kondice)
  editEndAt?: number; // dočasné: při úpravě zachovává původní konec (drží trvání + okno tepu)
  exercises: LoggedExercise[];
}

export interface RoutineExercise {
  exerciseId: string;
  targetSets: number;
  targetReps: number;
  targetRpe?: number | null;
}

export interface Routine {
  id: string;
  name: string;
  folder?: string;
  autoProgress?: boolean;
  exercises: RoutineExercise[];
}

export type Unit = 'kg' | 'lb';

export interface Settings {
  unit: Unit;
  restDefaultSec: number;
  increment: number; // přírůstek pro steppery v kg
  incrementLb: number; // přírůstek pro steppery v lb
  healthEnabled: boolean; // propojení s Apple Health
  bodyweightKg: number; // tělesná váha (pro cviky s vlastní vahou – shyby, kliky, dipy)
  onboarded: boolean;
}

export interface PRRecord {
  exerciseId: string;
  e1rm: number;
  weight: number;
  reps: number;
  at: number;
}
