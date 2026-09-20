import { Equipment, TrackingType } from '@/data/types';

/** Vybavení a typ měření nabízí na dvou místech: nový cvik a detail cviku ve správě. */
export const EQUIPMENT_OPTIONS: Equipment[] = ['Činka', 'Jednoručky', 'Kladka', 'Stroj', 'Vlastní váha', 'Kettlebell', 'Guma'];

export const TRACKING_OPTIONS: { value: TrackingType; label: string }[] = [
  { value: 'weight_reps', label: 'Váha × opak.' },
  { value: 'bodyweight_reps', label: 'Vlastní váha × opak.' },
  { value: 'weighted_bw', label: 'Přidaná váha' },
  { value: 'reps', label: 'Jen opakování' },
  { value: 'time', label: 'Jen čas' },
  { value: 'distance_time', label: 'Vzdálenost × čas' },
];
