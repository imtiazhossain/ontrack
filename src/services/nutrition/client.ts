import Constants from 'expo-constants';
import { fetch } from 'expo/fetch';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

import type { MealAnalysis } from '@/types/models';
import type {
  ApiErrorBody,
  MealLinkResolution,
  NutritionErrorCode,
  PhotoAnalysisRequest,
  PhotoAnalysisResponse,
  MealLinkCandidate,
} from './types';

export class NutritionServiceError extends Error {
  constructor(
    message: string,
    readonly code: NutritionErrorCode,
    readonly status = 0,
  ) {
    super(message);
    this.name = 'NutritionServiceError';
  }
}

function apiUrl(path: string): string {
  const configured = process.env.EXPO_PUBLIC_NUTRITION_API_URL?.replace(/\/$/, '');
  if (configured) return `${configured}${path}`;
  if (Platform.OS === 'web') return path;
  const developmentHost = __DEV__ ? Constants.expoConfig?.hostUri : undefined;
  if (developmentHost) return `http://${developmentHost}${path}`;
  throw new NutritionServiceError(
    'Nutrition analysis is not configured for this build.',
    'NOT_CONFIGURED',
  );
}

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    if (error instanceof NutritionServiceError) throw error;
    throw new NutritionServiceError('Unable to connect. Check your internet connection.', 'OFFLINE');
  }
  if (!response.ok) {
    const parsed = (await response.json().catch(() => undefined)) as ApiErrorBody | undefined;
    throw new NutritionServiceError(
      parsed?.error ?? 'Nutrition analysis is temporarily unavailable.',
      parsed?.code ?? 'PROVIDER_FAILURE',
      response.status,
    );
  }
  return response.json() as Promise<T>;
}

/** Resizes and re-encodes the image, which removes EXIF metadata before upload. */
export async function prepareMealImage(photoUri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    photoUri,
    [{ resize: { width: 1280 } }],
    { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );
  if (!result.base64) {
    throw new NutritionServiceError('The selected image could not be prepared.', 'INVALID_IMAGE');
  }
  const dataUrl = `data:image/jpeg;base64,${result.base64}`;
  if (dataUrl.length > 5_500_000) {
    throw new NutritionServiceError('The selected image is too large.', 'INVALID_IMAGE');
  }
  return dataUrl;
}

export async function analyzeMealPhoto(
  photoUri: string,
  mealName?: string,
  signal?: AbortSignal,
): Promise<PhotoAnalysisResponse> {
  const request: PhotoAnalysisRequest = {
    imageDataUrl: await prepareMealImage(photoUri),
    mealName: mealName?.trim() || undefined,
  };
  return post('/meal-analysis/photo', request, signal);
}

export function resolveMealLink(url: string, signal?: AbortSignal) {
  return post<MealLinkResolution>('/meal-links/resolve', { url: url.trim() }, signal);
}

export function analyzeMealLink(candidate: MealLinkCandidate, signal?: AbortSignal) {
  return post<PhotoAnalysisResponse>('/meal-analysis/link', { candidate }, signal);
}

export function confirmMealAnalysis(draftId: string, analysis: MealAnalysis, signal?: AbortSignal) {
  return post<{ analysis: MealAnalysis }>('/meal-analysis/confirm', { draftId, analysis }, signal);
}
