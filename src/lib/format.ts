import { Unit } from '@/data/types';

const KG_TO_LB = 2.20462;

export function toDisplayWeight(kg: number, unit: Unit): number {
  return unit === 'lb' ? kg * KG_TO_LB : kg;
}
export function fromDisplayWeight(value: number, unit: Unit): number {
  return unit === 'lb' ? value / KG_TO_LB : value;
}

/** Czech number: comma decimal, trims trailing .0 */
export function fmtNum(n: number, maxDecimals = 1): string {
  const rounded = Math.round(n * 10 ** maxDecimals) / 10 ** maxDecimals;
  return rounded
    .toFixed(maxDecimals)
    .replace(/\.?0+$/, '')
    .replace('.', ',');
}

export function fmtWeight(kg: number, unit: Unit): string {
  return `${fmtNum(toDisplayWeight(kg, unit))} ${unit}`;
}

/** Stepper increments in the user's display unit (kg uses the user setting, lb fixed 5/2.5). */
export function unitIncrement(unit: Unit, kgIncrement: number): { full: number; half: number } {
  if (unit === 'lb') return { full: 5, half: 2.5 };
  return { full: kgIncrement, half: kgIncrement / 2 };
}

export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

export function fmtDateShort(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()}. ${d.getMonth() + 1}.`;
}

const DAYS = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota'];
const MON = ['led', 'úno', 'bře', 'dub', 'kvě', 'čer', 'čvc', 'srp', 'zář', 'říj', 'lis', 'pro'];

export function dayName(ms: number): string {
  return DAYS[new Date(ms).getDay()];
}
export function fmtHeaderDate(ms: number): string {
  const d = new Date(ms);
  return `${DAYS[d.getDay()].toUpperCase()} · ${d.getDate()}. ${MON[d.getMonth()]}`;
}

/** "před 3 dny", "včera", "dnes" */
export function relativeDay(ms: number, now: number): string {
  const days = Math.floor((startOfDay(now) - startOfDay(ms)) / 86_400_000);
  if (days <= 0) return 'dnes';
  if (days === 1) return 'včera';
  if (days < 5) return `před ${days} dny`;
  return `před ${days} dny`;
}

export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
