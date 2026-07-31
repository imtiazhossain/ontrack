import { Directory, Paths } from 'expo-file-system';
import { prepareJpegDataUrl, persistJpegToDocuments } from '@/utils/image-persist';

import { PlantServiceError } from './client-error';

const MAX_DATA_URL_LENGTH = 5_500_000;

/** Re-encoding strips EXIF metadata before any image leaves the device. */
export async function preparePlantImage(uri: string): Promise<string> {
  return prepareJpegDataUrl(uri, {
    width: 1280,
    compress: 0.78,
    maxDataUrlLength: MAX_DATA_URL_LENGTH,
    onInvalid: (reason) => {
      throw new PlantServiceError(
        reason === 'too_large'
          ? 'The image is too large. Try a lower-resolution photo.'
          : 'The image could not be prepared.',
        'INVALID_IMAGE',
      );
    },
  });
}

/** Copies a normalized plant photo into durable app document storage. */
export async function persistPlantPhoto(uri: string, plantId: string, suffix = 'profile'): Promise<string> {
  return persistJpegToDocuments(uri, {
    width: 1280,
    compress: 0.78,
    directorySegments: ['plants', plantId],
    fileStem: suffix,
  });
}

export async function deletePlantPhotos(plantId: string): Promise<void> {
  const directory = new Directory(Paths.document, 'plants', plantId);
  if (directory.exists) await directory.delete();
}
