import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import TravelDocumentReader from '../../../modules/travel-document-reader';

import {
  parseFlightConfirmation,
  type ParsedFlightConfirmation,
} from './flight-confirmation-parser';

const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_SCREENSHOTS = 6;

export type FlightConfirmationImportSource = 'document' | 'screenshots';

interface ConfirmationAsset {
  uri: string;
  fileName: string;
  size?: number;
}

export interface ImportedFlightConfirmation extends ParsedFlightConfirmation {
  fileName: string;
}

export async function importFlightConfirmation(
  tripRange: { startDate: string; endDate: string },
  source: FlightConfirmationImportSource = 'document',
): Promise<ImportedFlightConfirmation | undefined> {
  if (!TravelDocumentReader) {
    throw new Error(
      'Confirmation document import is not available in this app build. Enter the flight details manually or install the latest TestFlight build.',
    );
  }
  const assets =
    source === 'screenshots'
      ? await pickConfirmationScreenshots()
      : await pickConfirmationDocument();
  if (!assets?.length) return undefined;
  if (assets.some((asset) => asset.size && asset.size > MAX_DOCUMENT_SIZE_BYTES)) {
    throw new Error('Each confirmation file must be smaller than 20 MB.');
  }
  const recognizedPages: string[] = [];
  for (const asset of assets) {
    recognizedPages.push(await TravelDocumentReader.recognizeTextAsync(asset.uri));
  }
  const text = recognizedPages.join('\n\n');
  const parsed = parseFlightConfirmation(text, tripRange);
  if (parsed.detectedFieldCount === 0) {
    throw new Error(
      'No flight details were recognized. Try a clearer image or enter the details manually.',
    );
  }
  const fileName =
    assets.length === 1
      ? assets[0].fileName
      : `${assets.length} confirmation screenshots`;
  return { ...parsed, fileName };
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
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      'Photo library access is required to choose flight confirmation screenshots.',
    );
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    allowsMultipleSelection: true,
    orderedSelection: true,
    selectionLimit: MAX_SCREENSHOTS,
    quality: 1,
  });
  if (result.canceled) return undefined;
  return result.assets.map((asset, index) => ({
    uri: asset.uri,
    fileName: asset.fileName ?? `Flight confirmation screenshot ${index + 1}`,
    size: asset.fileSize,
  }));
}
