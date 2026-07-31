import { Directory, File, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

export type PrepareJpegDataUrlOptions = {
  width: number;
  compress: number;
  maxDataUrlLength: number;
  onInvalid: (reason: 'prepare' | 'too_large') => never;
};

/** Resize/re-encode to JPEG data URL (strips EXIF) for guarded API uploads. */
export async function prepareJpegDataUrl(
  photoUri: string,
  options: PrepareJpegDataUrlOptions,
): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    photoUri,
    [{ resize: { width: options.width } }],
    {
      compress: options.compress,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    },
  );
  if (!result.base64) options.onInvalid('prepare');
  const dataUrl = `data:image/jpeg;base64,${result.base64}`;
  if (dataUrl.length > options.maxDataUrlLength) options.onInvalid('too_large');
  return dataUrl;
}

export type PersistJpegOptions = {
  width: number;
  compress: number;
  /** Path segments under Paths.document, e.g. ['meal-images'] or ['plants', id]. */
  directorySegments: string[];
  fileStem: string;
};

/**
 * Re-encode a picker/camera file into durable app documents storage.
 * Temporary OS cache URIs must not be persisted in store state.
 */
export async function persistJpegToDocuments(
  photoUri: string,
  options: PersistJpegOptions,
): Promise<string> {
  if (Platform.OS === 'web' || !photoUri.startsWith('file://')) return photoUri;
  const result = await ImageManipulator.manipulateAsync(
    photoUri,
    [{ resize: { width: options.width } }],
    {
      compress: options.compress,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );
  const directory = new Directory(Paths.document, ...options.directorySegments);
  directory.create({ idempotent: true, intermediates: true });
  const safeStem = options.fileStem.replace(/[^a-zA-Z0-9_-]/g, '-');
  const source = new File(result.uri);
  const destination = new File(directory, `${safeStem}-${Date.now()}.jpg`);
  await source.copy(destination);
  return destination.uri;
}

export async function persistJpegToDocumentsWithSize(
  photoUri: string,
  options: PersistJpegOptions,
): Promise<{ uri: string; width: number; height: number }> {
  if (Platform.OS === 'web' || !photoUri.startsWith('file://')) {
    return { uri: photoUri, width: 1, height: 1 };
  }
  const result = await ImageManipulator.manipulateAsync(
    photoUri,
    [{ resize: { width: options.width } }],
    {
      compress: options.compress,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );
  const directory = new Directory(Paths.document, ...options.directorySegments);
  directory.create({ idempotent: true, intermediates: true });
  const safeStem = options.fileStem.replace(/[^a-zA-Z0-9_-]/g, '-');
  const source = new File(result.uri);
  const destination = new File(directory, `${safeStem}-${Date.now()}.jpg`);
  await source.copy(destination);
  return { uri: destination.uri, width: result.width, height: result.height };
}
