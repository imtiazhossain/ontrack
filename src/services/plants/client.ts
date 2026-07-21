import Constants from 'expo-constants';
import { fetch } from 'expo/fetch';
import { Platform } from 'react-native';

import type { PlantCarePlan, PlantHealthAssessment, PlantIdentity, RoomProfile } from '@/types/models';
import { PlantServiceError } from './client-error';
import { preparePlantImage } from './media';
import type {
  PlantApiErrorBody,
  PlantCareResponse,
  PlantCheckInResponse,
  PlantIdentificationResponse,
  PlantServiceErrorCode,
} from './types';
import type { PlantTaxonSearchResult } from './taxonomy';

export function plantApiUrl(path: string): string {
  if (Platform.OS === 'web') return path;
  const developmentHost = __DEV__ ? Constants.expoConfig?.hostUri : undefined;
  const baseUrl = developmentHost
    ? `http://${developmentHost}`
    : process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
  if (baseUrl) return `${baseUrl}${path}`;
  throw new PlantServiceError('Plant analysis is not configured for this build.', 'NOT_CONFIGURED');
}

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(plantApiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    if (error instanceof PlantServiceError) throw error;
    throw new PlantServiceError(
      __DEV__
        ? 'Plant analysis needs the Expo server on this Mac. Keep Metro running and make sure the iPhone is on the same network.'
        : 'Unable to connect. Check your internet connection.',
      'OFFLINE',
    );
  }
  if (!response.ok) {
    const parsed = await response.json().catch(() => undefined) as PlantApiErrorBody | undefined;
    throw new PlantServiceError(
      parsed?.error ?? 'Plant analysis is temporarily unavailable.',
      parsed?.code ?? 'PROVIDER_FAILURE' as PlantServiceErrorCode,
      response.status,
    );
  }
  return response.json() as Promise<T>;
}

export async function searchPlants(query: string, signal?: AbortSignal): Promise<PlantTaxonSearchResult[]> {
  let response: Response;
  try {
    response = await fetch(plantApiUrl(`/plant-analysis/search?q=${encodeURIComponent(query.trim())}`), { signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new PlantServiceError('Plant search is unavailable. You can still enter the name manually.', 'OFFLINE');
  }
  if (!response.ok) {
    const parsed = await response.json().catch(() => undefined) as PlantApiErrorBody | undefined;
    throw new PlantServiceError(parsed?.error ?? 'Plant search is temporarily unavailable.', parsed?.code ?? 'PROVIDER_FAILURE', response.status);
  }
  const body = await response.json() as { results?: PlantTaxonSearchResult[] };
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
