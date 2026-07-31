import { apiRequest } from '@/services/http/api-client';
import { resolveExpoApiUrl } from '@/services/http/api-url';
import type { PlantCarePlan, PlantHealthAssessment, PlantIdentity, RoomProfile } from '@/types/models';
import { PlantServiceError } from './client-error';
import { preparePlantImage } from './media';
import type { PlantTaxonSearchResult } from './taxonomy';
import type {
  PlantCareResponse,
  PlantCheckInResponse,
  PlantIdentificationResponse,
  PlantServiceErrorCode,
} from './types';

export function plantApiUrl(path: string): string {
  return resolveExpoApiUrl(path, {
    configuredBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    createNotConfiguredError: () =>
      new PlantServiceError('Plant analysis is not configured for this build.', 'NOT_CONFIGURED'),
  });
}


function createPlantError(
  message: string,
  code?: string,
  status?: number,
): PlantServiceError {
  return new PlantServiceError(
    message,
    (code as PlantServiceErrorCode | undefined) ?? 'PROVIDER_FAILURE',
    status ?? 0,
  );
}

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return apiRequest<T, PlantServiceError>({
    url: plantApiUrl(path),
    method: 'POST',
    body,
    signal,
    offlineMessage: __DEV__
      ? 'Plant analysis needs the Expo server on this Mac. Keep Metro running and make sure the iPhone is on the same network.'
      : 'Unable to connect. Check your internet connection.',
    unavailableMessage: 'Plant analysis is temporarily unavailable.',
    defaultErrorCode: 'PROVIDER_FAILURE',
    createError: createPlantError,
  });
}

export async function searchPlants(query: string, signal?: AbortSignal): Promise<PlantTaxonSearchResult[]> {
  const body = await apiRequest<{ results?: PlantTaxonSearchResult[] }, PlantServiceError>({
    url: plantApiUrl(`/plant-analysis/search?q=${encodeURIComponent(query.trim())}`),
    method: 'GET',
    signal,
    offlineMessage: 'Plant search is unavailable. You can still enter the name manually.',
    unavailableMessage: 'Plant search is temporarily unavailable.',
    defaultErrorCode: 'PROVIDER_FAILURE',
    createError: createPlantError,
  });
  return Array.isArray(body.results) ? body.results : [];
}

export async function identifyPlant(photoUri: string, signal?: AbortSignal) {
  return post<PlantIdentificationResponse>(
    '/plant-analysis/identify',
    { imageDataUrl: await preparePlantImage(photoUri) },
    signal,
  );
}

export async function createPlantCarePlan(input: {
  identity: PlantIdentity;
  health: PlantHealthAssessment;
  room: RoomProfile;
  roomPhotoUri?: string;
}, signal?: AbortSignal) {
  return post<PlantCareResponse>('/plant-analysis/care', {
    identity: input.identity,
    health: input.health,
    room: input.room,
    roomImageDataUrl: input.roomPhotoUri ? await preparePlantImage(input.roomPhotoUri) : undefined,
  }, signal);
}

export async function analyzePlantCheckIn(input: {
  photoUri: string;
  identity: PlantIdentity;
  previousHealth: PlantHealthAssessment;
  currentCarePlan: PlantCarePlan;
  room: RoomProfile;
}, signal?: AbortSignal) {
  return post<PlantCheckInResponse>('/plant-analysis/check-in', {
    imageDataUrl: await preparePlantImage(input.photoUri),
    identity: input.identity,
    previousHealth: input.previousHealth,
    currentCarePlan: input.currentCarePlan,
    room: input.room,
  }, signal);
}
