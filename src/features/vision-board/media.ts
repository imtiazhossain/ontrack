import { Directory, File, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

const DIRECTORY_NAME = 'vision-board';

export async function persistVisionBoardImage(uri: string, id: string) {
  if (Platform.OS === 'web' || !uri.startsWith('file://')) {
    return { uri, width: 1, height: 1 };
  }
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1_600 } }],
    { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
  );
  const directory = new Directory(Paths.document, DIRECTORY_NAME);
  directory.create({ idempotent: true, intermediates: true });
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '-');
  const source = new File(result.uri);
  const destination = new File(directory, `${safeId}-${Date.now()}.jpg`);
  await source.copy(destination);
  return { uri: destination.uri, width: result.width, height: result.height };
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
