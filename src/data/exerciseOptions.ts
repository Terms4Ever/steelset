import { Equipment, TrackingType } from '@/data/types';
import { t } from '@/i18n';

/** Vybavení a typ měření nabízí na dvou místech: nový cvik a detail cviku ve správě. */
export const EQUIPMENT_OPTIONS: Equipment[] = ['Činka', 'Jednoručky', 'Kladka', 'Stroj', 'Vlastní váha', 'Kettlebell', 'Guma'];

/** Typy měření; popisek se bere ze slovníku v okamžiku čtení, aby seděl s jazykem (#20). */
const TRACKING_VALUES: TrackingType[] = ['weight_reps', 'bodyweight_reps', 'weighted_bw', 'reps', 'time', 'distance_time'];

export const TRACKING_OPTIONS: { value: TrackingType; readonly label: string }[] = TRACKING_VALUES.map((value) => ({
  value,
  get label() {
    return t().exercises.trackingTypes[value];
  },
}));
