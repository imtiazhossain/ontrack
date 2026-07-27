import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { PlantServiceError } from './client-error';

const MAX_DATA_URL_LENGTH = 5_500_000;

async function normalizedImage(uri: string, includeBase64: boolean) {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: 1280, height: null });
  const rendered = await context.renderAsync();
  return rendered.saveAsync({
    compress: 0.78,
    format: SaveFormat.JPEG,
    base64: includeBase64,
  });
}

/** Re-encoding strips EXIF metadata before any image leaves the device. */
export async function preparePlantImage(uri: string): Promise<string> {
  const result = await normalizedImage(uri, true);
  if (!result.base64) throw new PlantServiceError('The image could not be prepared.', 'INVALID_IMAGE');
  const dataUrl = `data:image/jpeg;base64,${result.base64}`;
  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    throw new PlantServiceError('The image is too large. Try a lower-resolution photo.', 'INVALID_IMAGE');
  }
  return dataUrl;
}

/** Copies a normalized plant photo into durable app document storage. */
export async function persistPlantPhoto(uri: string, plantId: string, suffix = 'profile'): Promise<string> {
  const result = await normalizedImage(uri, false);
  const directory = new Directory(Paths.document, 'plants', plantId);
  directory.create({ idempotent: true, intermediates: true });
  const source = new File(result.uri);
  const destination = new File(directory, `${suffix}-${Date.now()}.jpg`);
  await source.copy(destination);
  return destination.uri;
}

export async function deletePlantPhotos(plantId: string): Promise<void> {
  const directory = new Directory(Paths.document, 'plants', plantId);
  if (directory.exists) await directory.delete();
}
