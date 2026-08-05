import * as DocumentPicker from 'expo-document-picker';

import { pickLibraryImages } from '@/utils/pick-image';
import TravelDocumentReader from '../../../modules/travel-document-reader';

import { persistConfirmationAssets } from './confirmation-attachments';
import {
    runConfirmationPicker,
    type ConfirmationImportOptions,
} from './confirmation-import-options';
import { parseFlightConfirmationWithFallback } from './flight-confirmation-enrichment';
import {
    type ParsedFlightConfirmation,
} from './flight-confirmation-parser';

const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_SCREENSHOTS = 6;

export type FlightConfirmationImportSource = 'document' | 'screenshots';

interface FlightConfirmationImportOptions extends ConfirmationImportOptions {
  /** Draft-only imports can skip copying the selected file into app storage. */
  persistAttachments?: boolean;
}

interface ConfirmationAsset {
  uri: string;
  fileName: string;
  size?: number;
}

export interface ImportedFlightConfirmation extends ParsedFlightConfirmation {
  fileName: string;
  confirmationUris: string[];
}

async function readFlightConfirmationUris(
  uris: string[],
  tripRange?: { startDate: string; endDate: string },
): Promise<ParsedFlightConfirmation> {
  if (!TravelDocumentReader) {
    throw new Error('Confirmation document import is not available in this app build.');
  }
  const recognizedPages: string[] = [];
  for (const uri of uris) {
    recognizedPages.push(await TravelDocumentReader.recognizeTextAsync(uri));
  }
  return parseFlightConfirmationWithFallback(
    recognizedPages.join('\n\n'),
    tripRange,
  );
}

export async function importFlightConfirmation(
  tripRange?: { startDate: string; endDate: string },
  source: FlightConfirmationImportSource = 'document',
  options?: FlightConfirmationImportOptions,
): Promise<ImportedFlightConfirmation | undefined> {
  if (!TravelDocumentReader) {
    throw new Error(
      'Confirmation document import is not available in this app build. Enter the flight details manually.',
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
  const parsed = await readFlightConfirmationUris(
    assets.map((asset) => asset.uri),
    tripRange,
  );
  if (parsed.detectedFieldCount === 0) {
    throw new Error(
      'No flight details were recognized. Try a clearer image or enter the details manually.',
    );
  }
  const confirmationUris =
    options?.persistAttachments === false
      ? []
      : await persistConfirmationAssets(assets, 'flight', {
          nameHint: parsed.flight.confirmationCode || parsed.segments[0]?.flight.confirmationCode,
        });
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
        'Photo library access is required to choose flight confirmation screenshots.',
      );
    },
  });
  if (!assets?.length) return undefined;
  return assets.map((asset, index) => ({
    uri: asset.uri,
    fileName: asset.fileName ?? `Flight confirmation screenshot ${index + 1}`,
    size: asset.fileSize,
  }));
}
