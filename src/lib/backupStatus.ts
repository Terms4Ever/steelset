/**
 * Stav zálohy do iCloudu pro řádek v Profilu (#19).
 *
 * Přenos dat na nový telefon dělá záloha v iCloudu, ne přihlášení. Řádek proto musí říct pravdu:
 * kdy se naposledy zálohovalo, nebo že iCloud není k dispozici. Dřív tam stálo pevné „Automatická",
 * i když byl iCloud vypnutý.
 */
import { t } from '@/i18n';

export type BackupStatus =
  | { kind: 'unsupported' } // web, Android
  | { kind: 'unavailable' } // iCloud vypnutý nebo nepřihlášený
  | { kind: 'never' } // iCloud jde, ale záloha ještě neproběhla
  | { kind: 'done'; at: number };

export type BackupTone = 'ok' | 'warn' | 'mute';

/** Krátký text vpravo v řádku a jeho barva. */
export function backupLabel(status: BackupStatus, now: number): { text: string; tone: BackupTone } {
  const b = t().backup;
  switch (status.kind) {
    case 'unsupported':
      return { text: b.unsupported, tone: 'mute' };
    case 'unavailable':
      return { text: b.unavailable, tone: 'warn' };
    case 'never':
      return { text: b.never, tone: 'mute' };
    case 'done':
      return { text: backupAgo(status.at, now), tone: 'ok' };
  }
}

function backupAgo(at: number, now: number): string {
  const b = t().backup;
  const min = Math.floor(Math.max(0, now - at) / 60_000);
  if (min < 1) return b.justNow;
  if (min < 60) return b.minAgo(min);
  const h = Math.floor(min / 60);
  if (h < 24) return b.hoursAgo(h);
  const days = Math.floor(h / 24);
  if (days === 1) return b.yesterday;
  if (days <= 30) return b.daysAgo(days);
  const d = new Date(at);
  return b.date(d.getDate(), d.getMonth() + 1, d.getFullYear());
}

/** Vysvětlení pod řádkem: co záloha dělá, nebo co s ní udělat. */
export function backupHint(status: BackupStatus): string {
  const b = t().backup;
  switch (status.kind) {
    case 'unsupported':
      return b.hintUnsupported;
    case 'unavailable':
      return b.hintUnavailable;
    default:
      return b.hintOk;
  }
}
