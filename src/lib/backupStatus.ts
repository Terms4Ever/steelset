/**
 * Stav zálohy do iCloudu pro řádek v Profilu (#19).
 *
 * Přenos dat na nový telefon dělá záloha v iCloudu, ne přihlášení. Řádek proto musí říct pravdu:
 * kdy se naposledy zálohovalo, nebo že iCloud není k dispozici. Dřív tam stálo pevné „Automatická",
 * i když byl iCloud vypnutý.
 */
export type BackupStatus =
  | { kind: 'unsupported' } // web, Android
  | { kind: 'unavailable' } // iCloud vypnutý nebo nepřihlášený
  | { kind: 'never' } // iCloud jde, ale záloha ještě neproběhla
  | { kind: 'done'; at: number };

export type BackupTone = 'ok' | 'warn' | 'mute';

/** Krátký text vpravo v řádku a jeho barva. */
export function backupLabel(status: BackupStatus, now: number): { text: string; tone: BackupTone } {
  switch (status.kind) {
    case 'unsupported':
      return { text: 'Jen na iPhonu', tone: 'mute' };
    case 'unavailable':
      return { text: 'iCloud vypnutý', tone: 'warn' };
    case 'never':
      return { text: 'Zatím ne', tone: 'mute' };
    case 'done':
      return { text: backupAgo(status.at, now), tone: 'ok' };
  }
}

function backupAgo(at: number, now: number): string {
  const min = Math.floor(Math.max(0, now - at) / 60_000);
  if (min < 1) return 'právě teď';
  if (min < 60) return `před ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `před ${h} h`;
  const days = Math.floor(h / 24);
  if (days === 1) return 'včera';
  if (days <= 30) return `před ${days} dny`;
  const d = new Date(at);
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
}

/** Vysvětlení pod řádkem: co záloha dělá, nebo co s ní udělat. */
export function backupHint(status: BackupStatus): string {
  switch (status.kind) {
    case 'unsupported':
      return 'Záloha do iCloudu běží jen v aplikaci na iPhonu.';
    case 'unavailable':
      return 'Zapni iCloud Drive v Nastavení iPhonu, jinak se data na nový telefon nepřenesou.';
    default:
      return 'Na novém iPhonu se stejným Apple ID se tréninky načtou samy.';
  }
}
