import { Exercise } from './types';

// Seed exercise library (Czech). id stable so history survives.
export const SEED_EXERCISES: Exercise[] = [
  // Hrudník
  { id: 'bench-barbell', name: 'Bench press', primary: 'Hrudník', secondary: ['Triceps', 'Ramena'], equipment: 'Činka', tracking: 'weight_reps', defaultBar: 20 },
  { id: 'bench-incline-barbell', name: 'Bench press na šikmé', primary: 'Hrudník', secondary: ['Ramena', 'Triceps'], equipment: 'Činka', tracking: 'weight_reps', defaultBar: 20 },
  { id: 'bench-db', name: 'Bench press s jednoručkami', primary: 'Hrudník', secondary: ['Triceps', 'Ramena'], equipment: 'Jednoručky', tracking: 'weight_reps' },
  { id: 'fly-db', name: 'Rozpažky s jednoručkami', primary: 'Hrudník', equipment: 'Jednoručky', tracking: 'weight_reps' },
  { id: 'pushup', name: 'Kliky', primary: 'Hrudník', secondary: ['Triceps'], equipment: 'Vlastní váha', tracking: 'bodyweight_reps' },
  { id: 'dips', name: 'Dipy', primary: 'Hrudník', secondary: ['Triceps'], equipment: 'Vlastní váha', tracking: 'weighted_bw' },
  { id: 'cable-fly', name: 'Stahování kladek (fly)', primary: 'Hrudník', equipment: 'Kladka', tracking: 'weight_reps' },

  // Záda
  { id: 'deadlift', name: 'Mrtvý tah', primary: 'Záda', secondary: ['Nohy', 'Hýždě', 'Předloktí'], equipment: 'Činka', tracking: 'weight_reps', defaultBar: 20 },
  { id: 'pullup', name: 'Shyby', primary: 'Záda', secondary: ['Biceps'], equipment: 'Vlastní váha', tracking: 'weighted_bw' },
  { id: 'row-barbell', name: 'Veslování s činkou', primary: 'Záda', secondary: ['Biceps'], equipment: 'Činka', tracking: 'weight_reps', defaultBar: 20 },
  { id: 'row-db', name: 'Veslování jednoručkou', primary: 'Záda', secondary: ['Biceps'], equipment: 'Jednoručky', tracking: 'weight_reps' },
  { id: 'lat-pulldown', name: 'Stahování horní kladky', primary: 'Záda', secondary: ['Biceps'], equipment: 'Kladka', tracking: 'weight_reps' },
  { id: 'row-cable', name: 'Veslování na spodní kladce', primary: 'Záda', secondary: ['Biceps'], equipment: 'Kladka', tracking: 'weight_reps' },

  // Nohy
  { id: 'squat', name: 'Dřep s činkou', primary: 'Nohy', secondary: ['Hýždě'], equipment: 'Činka', tracking: 'weight_reps', defaultBar: 20 },
  { id: 'front-squat', name: 'Přední dřep', primary: 'Nohy', secondary: ['Hýždě'], equipment: 'Činka', tracking: 'weight_reps', defaultBar: 20 },
  { id: 'leg-press', name: 'Leg press', primary: 'Nohy', secondary: ['Hýždě'], equipment: 'Stroj', tracking: 'weight_reps' },
  { id: 'rdl', name: 'Rumunský mrtvý tah', primary: 'Nohy', secondary: ['Hýždě', 'Záda'], equipment: 'Činka', tracking: 'weight_reps', defaultBar: 20 },
  { id: 'leg-curl', name: 'Zakopávání (leg curl)', primary: 'Nohy', equipment: 'Stroj', tracking: 'weight_reps' },
  { id: 'leg-extension', name: 'Předkopávání', primary: 'Nohy', equipment: 'Stroj', tracking: 'weight_reps' },
  { id: 'lunge-db', name: 'Výpady s jednoručkami', primary: 'Nohy', secondary: ['Hýždě'], equipment: 'Jednoručky', tracking: 'weight_reps' },
  { id: 'calf-raise', name: 'Výpony na lýtka', primary: 'Lýtka', equipment: 'Stroj', tracking: 'weight_reps' },

  // Ramena
  { id: 'ohp', name: 'Tlak nad hlavu (OHP)', primary: 'Ramena', secondary: ['Triceps'], equipment: 'Činka', tracking: 'weight_reps', defaultBar: 20 },
  { id: 'shoulder-press-db', name: 'Tlak s jednoručkami nad hlavu', primary: 'Ramena', secondary: ['Triceps'], equipment: 'Jednoručky', tracking: 'weight_reps' },
  { id: 'lateral-raise', name: 'Upažování', primary: 'Ramena', equipment: 'Jednoručky', tracking: 'weight_reps' },
  { id: 'rear-delt-fly', name: 'Rozpažky v předklonu', primary: 'Ramena', equipment: 'Jednoručky', tracking: 'weight_reps' },
  { id: 'face-pull', name: 'Face pull', primary: 'Ramena', secondary: ['Záda'], equipment: 'Kladka', tracking: 'weight_reps' },

  // Biceps / Triceps
  { id: 'curl-barbell', name: 'Biceps s velkou činkou', primary: 'Biceps', equipment: 'Činka', tracking: 'weight_reps', defaultBar: 20 },
  { id: 'curl-db', name: 'Biceps s jednoručkami', primary: 'Biceps', equipment: 'Jednoručky', tracking: 'weight_reps' },
  { id: 'hammer-curl', name: 'Kladivový zdvih', primary: 'Biceps', secondary: ['Předloktí'], equipment: 'Jednoručky', tracking: 'weight_reps' },
  { id: 'triceps-pushdown', name: 'Stahování kladky (triceps)', primary: 'Triceps', equipment: 'Kladka', tracking: 'weight_reps' },
  { id: 'skullcrusher', name: 'Francouzský tlak', primary: 'Triceps', equipment: 'Činka', tracking: 'weight_reps' },
  { id: 'overhead-triceps', name: 'Triceps nad hlavou (kladka)', primary: 'Triceps', equipment: 'Kladka', tracking: 'weight_reps' },

  // Břicho
  { id: 'plank', name: 'Plank', primary: 'Břicho', equipment: 'Vlastní váha', tracking: 'time' },
  { id: 'hanging-leg-raise', name: 'Přednožování ve visu', primary: 'Břicho', equipment: 'Vlastní váha', tracking: 'bodyweight_reps' },
  { id: 'cable-crunch', name: 'Crunch na kladce', primary: 'Břicho', equipment: 'Kladka', tracking: 'weight_reps' },

  // Hýždě
  { id: 'hip-thrust', name: 'Hip thrust', primary: 'Hýždě', secondary: ['Nohy'], equipment: 'Činka', tracking: 'weight_reps', defaultBar: 20 },

  // Kardio
  { id: 'run', name: 'Běh', primary: 'Nohy', equipment: 'Vlastní váha', tracking: 'distance_time' },
];

export const STARTER_ROUTINES = [
  {
    id: 'starter-fullbody-a',
    name: 'Full Body A',
    folder: 'Začátečník',
    exercises: [
      { exerciseId: 'squat', targetSets: 3, targetReps: 5 },
      { exerciseId: 'bench-barbell', targetSets: 3, targetReps: 5 },
      { exerciseId: 'row-barbell', targetSets: 3, targetReps: 8 },
      { exerciseId: 'ohp', targetSets: 3, targetReps: 8 },
      { exerciseId: 'curl-db', targetSets: 3, targetReps: 12 },
    ],
  },
  {
    id: 'starter-fullbody-b',
    name: 'Full Body B',
    folder: 'Začátečník',
    exercises: [
      { exerciseId: 'deadlift', targetSets: 1, targetReps: 5 },
      { exerciseId: 'bench-incline-barbell', targetSets: 3, targetReps: 8 },
      { exerciseId: 'lat-pulldown', targetSets: 3, targetReps: 10 },
      { exerciseId: 'leg-press', targetSets: 3, targetReps: 12 },
      { exerciseId: 'triceps-pushdown', targetSets: 3, targetReps: 12 },
    ],
  },
  {
    id: 'starter-push',
    name: 'Push A',
    folder: 'PPL',
    autoProgress: true,
    exercises: [
      { exerciseId: 'bench-barbell', targetSets: 4, targetReps: 6 },
      { exerciseId: 'ohp', targetSets: 3, targetReps: 8 },
      { exerciseId: 'bench-incline-barbell', targetSets: 3, targetReps: 10 },
      { exerciseId: 'lateral-raise', targetSets: 3, targetReps: 15 },
      { exerciseId: 'triceps-pushdown', targetSets: 3, targetReps: 12 },
    ],
  },
];
