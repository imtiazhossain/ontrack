import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { persistJpegToDocumentsWithSize } from '@/utils/image-persist';

const DIRECTORY_NAME = 'vision-board';

export async function persistVisionBoardImage(uri: string, id: string) {
  return persistJpegToDocumentsWithSize(uri, {
    width: 1_600,
    compress: 0.82,
    directorySegments: [DIRECTORY_NAME],
    fileStem: id,
  });
}

export function isOwnedVisionBoardImage(uri: string) {
  return uri.startsWith('file://') && uri.includes(`/${DIRECTORY_NAME}/`);
}

export async function cleanupOrphanedVisionBoardImages(referencedUris: readonly string[]) {
  if (Platform.OS === 'web') return;
  const directory = new Directory(Paths.document, DIRECTORY_NAME);
  if (!directory.exists) return;
  const referenced = new Set(referencedUris.filter(isOwnedVisionBoardImage));
  for (const entry of directory.list()) {
    if (entry instanceof File && !referenced.has(entry.uri)) {
      try {
        entry.delete();
      } catch {
        // Best-effort cleanup must not block navigation or account reset.
      }
    }
  }
}

export async function deleteAllVisionBoardImages() {
  if (Platform.OS === 'web') return;
  const directory = new Directory(Paths.document, DIRECTORY_NAME);
  if (!directory.exists) return;
  try {
    directory.delete();
  } catch {
    // Store reset still succeeds if the OS has already removed a file.
  }
}
