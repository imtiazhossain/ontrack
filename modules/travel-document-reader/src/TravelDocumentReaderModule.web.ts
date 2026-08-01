import { registerWebModule, NativeModule } from 'expo';

// TravelDocumentReaderModule is not available on the web platform.
class TravelDocumentReaderModule extends NativeModule<{}> {
  async recognizeTextAsync(): Promise<string> {
    throw new Error('Flight confirmation OCR is available in the iOS and Android apps.');
  }

  async previewDocumentsAsync(): Promise<void> {
    throw new Error('Confirmation preview is available in the iOS and Android apps.');
  }
}

export default registerWebModule(TravelDocumentReaderModule, 'TravelDocumentReaderModule');
