import * as DocumentPicker from 'expo-document-picker';

import TravelDocumentReader from '../../../modules/travel-document-reader';
import { pickLibraryImages } from '@/utils/pick-image';

import { persistConfirmationAssets } from './confirmation-attachments';
import {
  runConfirmationPicker,
  type ConfirmationImportOptions,
} from './confirmation-import-options';
import {
  parseRentalConfirmation,
  type ParsedRentalConfirmation,
} from './rental-confirmation-parser';

const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_SCREENSHOTS = 6;

export type RentalConfirmationImportSource = 'document' | 'screenshots';

interface ConfirmationAsset {
  uri: string;
  fileName: string;
  size?: number;
}

export interface ImportedRentalConfirmation extends ParsedRentalConfirmation {
  fileName: string;
  confirmationUris: string[];
}

export async function importRentalConfirmation(
  tripRange: { startDate: string; endDate: string },
  source: RentalConfirmationImportSource = 'document',
  options?: ConfirmationImportOptions,
): Promise<ImportedRentalConfirmation | undefined> {
  if (!TravelDocumentReader) {
    throw new Error(
      'Confirmation document import is not available in this app build. Enter the rental details manually.',
    );
  }
  const assets = await runConfirmationPicker(options, () =>
    source === 'screenshots'
      ? pickConfirmationScreenshots()
      : pickConfirmationDocument(),
  );
  if (!assets?.length) return undefined;
  if (assets.some((asset) => asset.size && asset.size > MAX_DOCUMENT_SIZE_BYTES)) {
    throw new Error('Each confirmation file must be smaller than 20 MB.');
  }
  options?.onPhase?.('reading');
  const recognizedPages: string[] = [];
  for (const asset of assets) {
    recognizedPages.push(await TravelDocumentReader.recognizeTextAsync(asset.uri));
  }
  const text = recognizedPages.join('\n\n');
  const parsed = parseRentalConfirmation(text, tripRange);
  if (parsed.detectedFieldCount === 0) {
    throw new Error(
      'No rental details were recognized. Try a clearer image or enter the details manually.',
    );
  }
  const confirmationUris = await persistConfirmationAssets(assets, 'rental');
  const fileName =
    assets.length === 1
      ? assets[0].fileName
      : `${assets.length} confirmation screenshots`;
  return { ...parsed, fileName, confirmationUris };
}

async function pickConfirmationDocument(): Promise<ConfirmationAsset[] | undefined> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*', 'text/plain', 'message/rfc822'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return undefined;
  const asset = result.assets[0];
  if (!asset) return undefined;
  return [{ uri: asset.uri, fileName: asset.name, size: asset.size }];
}

async function pickConfirmationScreenshots(): Promise<ConfirmationAsset[] | undefined> {
  const assets = await pickLibraryImages({
    quality: 1,
    allowsEditing: false,
    allowsMultipleSelection: true,
    orderedSelection: true,
    selectionLimit: MAX_SCREENSHOTS,
    onDenied: () => {
      throw new Error(
        'Photo library access is required to choose rental confirmation screenshots.',
      );
    },
  });
  if (!assets?.length) return undefined;
  return assets.map((asset, index) => ({
    uri: asset.uri,
    fileName: asset.fileName ?? `Rental confirmation screenshot ${index + 1}`,
    size: asset.fileSize,
  }));
}
