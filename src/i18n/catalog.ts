import type { Equipment, MuscleGroup } from '@/data/types';

import { getLang } from './index';

/**
 * Anglické názvy katalogu (#20, S45). Uložená data drží české hodnoty (partie, vybavení) a id
 * cviků; tady se jen mění, co se zobrazí. Vlastní cviky a přejmenované cviky se nepřekládají.
 */
export const EXERCISE_NAMES_EN: Record<string, string> = {
  'bench-barbell': 'Bench press',
  'bench-incline-barbell': 'Incline bench press',
  'bench-db': 'Dumbbell bench press',
  'fly-db': 'Dumbbell fly',
  pushup: 'Push-ups',
  dips: 'Dips',
  'cable-fly': 'Cable fly',
  deadlift: 'Deadlift',
  pullup: 'Pull-ups',
  'row-barbell': 'Barbell row',
  'row-db': 'Dumbbell row',
  'lat-pulldown': 'Lat pulldown',
  'row-cable': 'Seated cable row',
  squat: 'Barbell back squat',
  'front-squat': 'Front squat',
  'leg-press': 'Leg press',
  rdl: 'Romanian deadlift',
  'leg-curl': 'Leg curl',
  'leg-extension': 'Leg extension',
  'lunge-db': 'Dumbbell lunges',
  'calf-raise': 'Calf raises',
  ohp: 'Overhead press (OHP)',
  'shoulder-press-db': 'Dumbbell shoulder press',
  'lateral-raise': 'Lateral raise',
  'rear-delt-fly': 'Rear delt fly',
  'face-pull': 'Face pull',
  'curl-barbell': 'Barbell curl',
  'curl-db': 'Dumbbell curl',
  'hammer-curl': 'Hammer curl',
  'triceps-pushdown': 'Triceps pushdown',
  skullcrusher: 'Skull crusher',
  'overhead-triceps': 'Overhead cable triceps extension',
  plank: 'Plank',
  'hanging-leg-raise': 'Hanging leg raise',
  'cable-crunch': 'Cable crunch',
  'russian-twist': 'Russian twist',
  'cable-woodchop': 'Cable woodchop',
  'side-bend-db': 'Dumbbell side bend',
  'side-plank': 'Side plank',
  'hip-thrust': 'Hip thrust',
  run: 'Run',
};

const MUSCLES_EN: Record<MuscleGroup, string> = {
  Hrudník: 'Chest',
  Záda: 'Back',
  Nohy: 'Legs',
  Ramena: 'Shoulders',
  Biceps: 'Biceps',
  Triceps: 'Triceps',
  Břicho: 'Abs',
  Hýždě: 'Glutes',
  Lýtka: 'Calves',
  Předloktí: 'Forearms',
  Trapézy: 'Traps',
  'Horní záda': 'Upper back',
  'Spodní záda': 'Lower back',
  Kvadricepsy: 'Quads',
  Hamstringy: 'Hamstrings',
  'Šikmé břišní': 'Obliques',
};

const EQUIPMENT_EN: Record<Equipment, string> = {
  Činka: 'Barbell',
  Jednoručky: 'Dumbbells',
  Kladka: 'Cable',
  Stroj: 'Machine',
  'Vlastní váha': 'Bodyweight',
  Kettlebell: 'Kettlebell',
  Guma: 'Band',
};

const FOLDERS_EN: Record<string, string> = { Začátečník: 'Beginner', PPL: 'PPL' };

/** Název partie k zobrazení. Neznámá hodnota (stará data) se ukáže, jak je. */
export function muscleName(m: MuscleGroup | string): string {
  return getLang() === 'en' ? (MUSCLES_EN[m as MuscleGroup] ?? m) : m;
}

export function equipmentName(e: Equipment | string): string {
  return getLang() === 'en' ? (EQUIPMENT_EN[e as Equipment] ?? e) : e;
}

/** Název vestavěného cviku v aktuálním jazyce; vlastní cvik dostane svůj název beze změny. */
export function seedExerciseName(id: string, czech: string): string {
  return getLang() === 'en' ? (EXERCISE_NAMES_EN[id] ?? czech) : czech;
}

export function folderName(folder: string): string {
  return getLang() === 'en' ? (FOLDERS_EN[folder] ?? folder) : folder;
}

export const ALL_MUSCLES_EN = MUSCLES_EN;
export const ALL_EQUIPMENT_EN = EQUIPMENT_EN;
