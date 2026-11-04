import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { backupFileName } from './backup'

export async function shareBackupFile(args: { json: string; exportedAt: number }): Promise<void> {
  const directory = FileSystem.cacheDirectory
  if (!directory) throw new Error('share_unavailable')
  const path = `${directory}${backupFileName(args.exportedAt)}`
  await FileSystem.writeAsStringAsync(path, args.json)
  const available = await Sharing.isAvailableAsync()
  if (!available) throw new Error('share_unavailable')
  await Sharing.shareAsync(path, {
    mimeType: 'application/json',
    dialogTitle: backupFileName(args.exportedAt),
    UTI: 'public.json',
  })
}

export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  })
  if (result.canceled) return null
  const uri = result.assets[0]?.uri
  if (!uri) return null
  return FileSystem.readAsStringAsync(uri)
}
