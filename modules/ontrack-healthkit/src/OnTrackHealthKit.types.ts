import type {
  AppleStateOfMindInput,
  AppleStateOfMindSample,
  HealthImport,
} from '@/features/health/types';

export interface HealthAuthorizationOptions {
  stateOfMindWrite: boolean;
}

export interface HealthQueryOptions {
  startDate: string;
  endDate: string;
  timeZone: string;
}

export interface StateOfMindQueryOptions {
  startDate: string;
  endDate: string;
}

export interface OnTrackHealthKitApi {
  isAvailableAsync(): Promise<boolean>;
  isStateOfMindAvailableAsync(): Promise<boolean>;
  requestAuthorizationAsync(options: HealthAuthorizationOptions): Promise<boolean>;
  queryHealthSummaryAsync(options: HealthQueryOptions): Promise<HealthImport>;
  queryStateOfMindAsync(options: StateOfMindQueryOptions): Promise<AppleStateOfMindSample[]>;
  saveStateOfMindAsync(input: AppleStateOfMindInput): Promise<{ uuid: string }>;
  deleteOwnedStateOfMindAsync(uuid: string): Promise<void>;
}
