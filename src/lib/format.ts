import { Unit } from '@/data/types';
import { getLang, t } from '@/i18n';

const KG_TO_LB = 2.20462;

export function toDisplayWeight(kg: number, unit: Unit): number {
  return unit === 'lb' ? kg * KG_TO_LB : kg;
}
export function fromDisplayWeight(value: number, unit: Unit): number {
  return unit === 'lb' ? value / KG_TO_LB : value;
}

/** Czech plural: 1 série · 2-4 série · 5+ sérií (n must be a whole count). */
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  return n >= 2 && n <= 4 ? few : many;
}

/**
 * Nezlomitelná mezera. Drží pohromadě číslo a jednotku ("102,5 kg") i řády v objemu
 * ("12 345 kg") - React Native by je jinak na úzkém místě zalomil na dva řádky.
 */
export const NBSP = '\u00A0';

/** Číslo podle jazyka: česky desetinná čárka, anglicky tečka; ořízne koncové nuly (#20). */
export function fmtNum(n: number, maxDecimals = 1): string {
  const rounded = Math.round(n * 10 ** maxDecimals) / 10 ** maxDecimals;
  const plain = maxDecimals > 0 ? rounded.toFixed(maxDecimals).replace(/\.?0+$/, '') : rounded.toFixed(0);
  return plain.replace('.', t().format.decimal);
}

/** Jako fmtNum, ale s oddělenými tisíci: česky nezlomitelná mezera (12 345,5), anglicky čárka (12,345.5). */
export function fmtGrouped(n: number, maxDecimals = 1): string {
  const dot = t().format.decimal;
  const [int, dec] = fmtNum(n, maxDecimals).split(dot);
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, getLang() === 'cs' ? NBSP : ',');
  return dec ? `${grouped}${dot}${dec}` : grouped;
}

export function fmtWeight(kg: number, unit: Unit): string {
  return `${fmtGrouped(toDisplayWeight(kg, unit))}${NBSP}${unit}`;
}

/**
 * Weighted-bodyweight display: weight is stored as TOTAL kg (bodyweight + added), the user sees the ADDED
 * part — "BW" (no extra), "BW +10 kg" (plates), "BW −20 kg" (assisted). Spaces are non-breaking so the
 * whole value stays on one line.
 */
export function fmtBwWeight(totalKg: number, bwKg: number, unit: Unit): string {
  const added = toDisplayWeight(totalKg - bwKg, unit);
  if (Math.abs(added) < 0.005) return 'BW';
  return `BW${NBSP}${added > 0 ? '+' : '-'}${fmtNum(Math.abs(added), 2)}${NBSP}${unit}`;
}

/** Stepper increments in the user's display unit (separate setting per unit). */
export function unitIncrement(unit: Unit, kgIncrement: number, lbIncrement: number): { full: number; half: number } {
  const inc = unit === 'lb' ? lbIncrement : kgIncrement;
  return { full: inc, half: inc / 2 };
}

export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

export function fmtDateShort(ms: number): string {
  const d = new Date(ms);
  return t().format.dateShort(d.getDate(), d.getMonth() + 1);
}

export function dayName(ms: number): string {
  return t().format.days[new Date(ms).getDay()];
}
export function fmtHeaderDate(ms: number): string {
  const d = new Date(ms);
  const f = t().format;
  return f.headerDate(f.days[d.getDay()], d.getDate(), f.monthsShort[d.getMonth()]);
}

/** "před 3 dny", "včera", "dnes" podle jazyka */
export function relativeDay(ms: number, now: number): string {
  const days = Math.floor((startOfDay(now) - startOfDay(ms)) / 86_400_000);
  const f = t().format;
  if (days <= 0) return f.today;
  if (days === 1) return f.yesterday;
  return f.daysAgo(days);
}

export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
