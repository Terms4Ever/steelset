import { Platform } from 'react-native';

// Thin, defensive iCloud wrapper. Never throws — every call degrades to a no-op
// so the app keeps working even if iCloud is unavailable. iOS only.

const FILE = '/setly-backup.json';

function getCloud(): any | null {
  if (Platform.OS !== 'ios') return null;
  try {
    const mod = require('react-native-cloud-storage');
    return mod?.CloudStorage ?? null;
  } catch {
    return null;
  }
}

export async function cloudAvailable(): Promise<boolean> {
  const cs = getCloud();
  if (!cs) return false;
  try {
    if (typeof cs.isCloudAvailable === 'function') return !!(await cs.isCloudAvailable());
    return true;
  } catch {
    return false;
  }
}

export async function cloudBackup(content: string): Promise<boolean> {
  const cs = getCloud();
  if (!cs) return false;
  try {
    await cs.writeFile(FILE, content);
    return true;
  } catch {
    return false;
  }
}

export async function cloudRestore(): Promise<string | null> {
  const cs = getCloud();
  if (!cs) return null;
  try {
    const exists = typeof cs.exists === 'function' ? await cs.exists(FILE) : false;
    if (!exists) return null;
    return await cs.readFile(FILE);
  } catch {
    return null;
  }
}
