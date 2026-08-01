import { NativeModule, requireOptionalNativeModule } from 'expo';

declare class TravelDocumentReaderModule extends NativeModule<{}> {
  recognizeTextAsync(uri: string): Promise<string>;
  previewDocumentsAsync(uris: string[]): Promise<void>;
}

// Keep screens that offer document import usable in binaries that were built
// before this optional native module was linked. The caller can then show an
// actionable message instead of crashing while the screen bundle is evaluated.
export default requireOptionalNativeModule<TravelDocumentReaderModule>(
  'TravelDocumentReader',
);
