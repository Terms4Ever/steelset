import { Platform } from 'react-native';

/** Export a CSV string: web triggers a download, native writes to cache + share sheet. */
export async function exportCsv(csv: string, filename = 'setly-export.csv'): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return;
  }
  // native
  const FileSystem = require('expo-file-system/legacy');
  const Sharing = require('expo-sharing');
  const uri = (FileSystem.cacheDirectory ?? '') + filename;
  await FileSystem.writeAsStringAsync(uri, '﻿' + csv, { encoding: 'utf8' });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Export Setly' });
  }
}
