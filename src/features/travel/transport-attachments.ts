import * as DocumentPicker from 'expo-document-picker';

import { persistConfirmationAssets } from '@/features/travel/confirmation-attachments';
import { pickLibraryImages } from '@/utils/pick-image';

export async function pickTransportDocument(): Promise<string[] | undefined> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*', 'text/plain'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return undefined;
  const asset = result.assets[0];
  if (!asset) return undefined;
  if (asset.size && asset.size > 20 * 1024 * 1024) {
    throw new Error('Tickets must be smaller than 20 MB.');
  }
  return persistConfirmationAssets(
    [{ uri: asset.uri, fileName: asset.name }],
    'transport',
  );
}

export async function pickTransportScreenshots(): Promise<string[] | undefined> {
  const assets = await pickLibraryImages({
    quality: 1,
    allowsEditing: false,
    allowsMultipleSelection: true,
    orderedSelection: true,
    selectionLimit: 6,
    onDenied: () => {
      throw new Error('Photo library access is required to choose ticket screenshots.');
    },
  });
  if (!assets?.length) return undefined;
  return persistConfirmationAssets(
    assets.map((asset, index) => ({
      uri: asset.uri,
      fileName: asset.fileName ?? `Transport ticket ${index + 1}.jpg`,
    })),
    'transport',
  );
}
