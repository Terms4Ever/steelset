import { Platform } from 'react-native';

import { WIDGET_APP_GROUP, WIDGET_SNAPSHOT_KEY } from '@/lib/widgetSnapshot';

// Zápis snímku pro widgety do App Group. Nativní stranu nese `ExtensionStorage`
// z @bacons/apple-targets, který je v buildu kvůli widgetu tak jako tak. Mimo iOS
// a bez nativního modulu (Expo Go) je všechno no-op.

let storage: { set(key: string, value: string): void } | null = null;
let reload: (() => void) | null = null;
if (Platform.OS === 'ios') {
  try {
    const { ExtensionStorage } = require('@bacons/apple-targets');
    storage = new ExtensionStorage(WIDGET_APP_GROUP);
    reload = () => ExtensionStorage.reloadWidget();
  } catch {
    storage = null;
    reload = null;
  }
}

/** Zapíše snímek a řekne widgetům, ať se překreslí. Chyba nikdy nesmí shodit aplikaci. */
export function writeWidgetSnapshot(json: string): void {
  if (!storage) return;
  try {
    storage.set(WIDGET_SNAPSHOT_KEY, json);
    reload?.();
  } catch {
    /* widget je bonus, aplikace kvůli němu nesmí spadnout */
  }
}
