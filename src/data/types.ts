// Domain model for Liftbook - strength tracker.

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
  | 'Předloktí';

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
  defaultBar?: number; // hmotnost tyče pro plate kalkulačku
  note?: string;
}

export interface SetEntry {
  type: SetType;
  weight: number | null;
  reps: number | null;
  rpe?: number | null;
  done: boolean;
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
  onboarded: boolean;
}

export interface PRRecord {
  exerciseId: string;
  e1rm: number;
  weight: number;
  reps: number;
  at: number;
}
