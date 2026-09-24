import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { exportBackup, importBackup, validateBackup } from '@/db/repositories';
import type { BackupPayload } from '@/types';

function backupName(): string {
  const date = new Date();
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return `calis-backup-${stamp}.json`;
}

export async function shareBackup(): Promise<string> {
  const payload = await exportBackup();
  const uri = `${FileSystem.cacheDirectory ?? ''}${backupName()}`;
  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2), { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Export Calis backup', UTI: 'public.json' });
  }
  return uri;
}

export async function pickAndImportBackup(): Promise<{ imported: boolean; payload?: BackupPayload }> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true, multiple: false });
  if (result.canceled || !result.assets?.[0]) return { imported: false };
  if (result.assets[0].size && result.assets[0].size > 20 * 1024 * 1024) throw new Error('That backup is larger than 20 MB and was not imported.');
  const raw = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (!validateBackup(parsed)) throw new Error('That file is not a valid Calis backup.');
  await importBackup(parsed);
  return { imported: true, payload: parsed };
}
