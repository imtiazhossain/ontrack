import TravelDocumentReader from '../../modules/travel-document-reader';

export async function recognizeDocumentText(uri: string): Promise<string> {
  if (!TravelDocumentReader) {
    throw new Error(
      'Screenshot text recognition is not available in this app build. Install the latest native build and try again.',
    );
  }
  return TravelDocumentReader.recognizeTextAsync(uri);
}
