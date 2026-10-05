import { exportBackup, importBackup, parseBackup, summarizeBackup, type Backup, type BackupSummary } from '../db/backup';
import { getDb } from '../db/client';
import { toLocalTimestamp } from '../domain/dates';
import { fixCourseCodes, runReconcile } from './actions';
import { getNow, getToday } from './clock';

/**
 * Export to a JSON file through the share sheet (Dosyalar, AirDrop, Drive…) and
 * import from a file the user picks. Native modules are loaded lazily so tests and
 * screens that never back up don't touch them.
 */

export async function exportToFile(): Promise<'shared' | 'unavailable'> {
  const Sharing = await import('expo-sharing');
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  const { File, Paths } = await import('expo-file-system');
  const backup = exportBackup(getDb(), toLocalTimestamp(getNow()));
  const file = new File(Paths.cache, `tavinda-yedek-${getToday()}.json`);
  file.create({ overwrite: true });
  file.write(JSON.stringify(backup));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Tavında yedeği' });
  return 'shared';
}

/** Lets the user pick a backup file. Null when they cancel; throws BackupError for a bad file. */
export async function pickBackup(): Promise<{ backup: Backup; summary: BackupSummary } | null> {
  const Picker = await import('expo-document-picker');
  const res = await Picker.getDocumentAsync({
    type: ['application/json', 'public.json', 'public.text'],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.length) return null;
  const { File } = await import('expo-file-system');
  const backup = parseBackup(new File(res.assets[0].uri).textSync());
  return { backup, summary: summarizeBackup(backup) };
}

/** Replaces all data with the backup, then brings it up to today. */
export function restoreBackup(backup: Backup): void {
  importBackup(getDb(), backup);
  fixCourseCodes();
  runReconcile();
}
