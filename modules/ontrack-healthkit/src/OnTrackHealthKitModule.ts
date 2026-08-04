import { NativeModule, requireOptionalNativeModule } from 'expo';

import type { OnTrackHealthKitApi } from './OnTrackHealthKit.types';

declare class OnTrackHealthKitModule extends NativeModule<Record<string, never>> implements OnTrackHealthKitApi {
  isAvailableAsync(): Promise<boolean>;
  isStateOfMindAvailableAsync(): Promise<boolean>;
  requestAuthorizationAsync(options: Parameters<OnTrackHealthKitApi['requestAuthorizationAsync']>[0]): Promise<boolean>;
  queryHealthSummaryAsync(options: Parameters<OnTrackHealthKitApi['queryHealthSummaryAsync']>[0]): ReturnType<OnTrackHealthKitApi['queryHealthSummaryAsync']>;
  queryStateOfMindAsync(options: Parameters<OnTrackHealthKitApi['queryStateOfMindAsync']>[0]): ReturnType<OnTrackHealthKitApi['queryStateOfMindAsync']>;
  saveStateOfMindAsync(input: Parameters<OnTrackHealthKitApi['saveStateOfMindAsync']>[0]): ReturnType<OnTrackHealthKitApi['saveStateOfMindAsync']>;
  deleteOwnedStateOfMindAsync(uuid: string): Promise<void>;
}

export default requireOptionalNativeModule<OnTrackHealthKitModule>('OnTrackHealthKit');
