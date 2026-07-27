import Constants from 'expo-constants';
import { fetch } from 'expo/fetch';
import { Directory, EncodingType, File, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

import type { MealAnalysis } from '@/types/models';
import type {
  ApiErrorBody,
  MealLinkResolution,
  MealImageEnhancementResponse,
  NutritionErrorCode,
  PhotoAnalysisRequest,
  PhotoAnalysisResponse,
  MealLinkCandidate,
} from './types';

export const CURRENT_MEAL_PHOTO_PROCESSING_VERSION = 1;

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
  const [analysis, enhancement] = await Promise.all([
    post<PhotoAnalysisResponse>('/meal-analysis/photo', request, signal),
    requestMealImageEnhancement(request, signal).catch(() => undefined),
  ]);
  if (!enhancement) return analysis;
  const processedPhotoUri = await persistEnhancedMealImage(
    enhancement.imageDataUrl,
    `meal-${analysis.draftId}`,
  );
  return { ...analysis, processedPhotoUri, photoProcessingVersion: enhancement.version };
}

async function requestMealImageEnhancement(request: PhotoAnalysisRequest, signal?: AbortSignal) {
  return post<MealImageEnhancementResponse>('/meal-images/enhance', request, signal);
}

async function persistEnhancedMealImage(imageDataUrl: string, key: string): Promise<string> {
  if (Platform.OS === 'web') return imageDataUrl;
  const match = /^data:image\/png;base64,(.+)$/.exec(imageDataUrl);
  if (!match) throw new NutritionServiceError('The cleaned meal image is invalid.', 'INVALID_IMAGE');
  const directory = new Directory(Paths.document, 'meal-images');
  directory.create({ idempotent: true, intermediates: true });
  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '-');
  const file = new File(directory, `${safeKey}.png`);
  file.create({ overwrite: true, intermediates: true });
  file.write(match[1], { encoding: EncodingType.Base64 });
  return file.uri;
}

export async function enhanceMealPhoto(
  photoUri: string,
  mealName: string,
  fileKey: string,
  signal?: AbortSignal,
): Promise<{ photoUri: string; version: number }> {
  const enhancement = await requestMealImageEnhancement({
    imageDataUrl: await prepareMealImage(photoUri),
    mealName: mealName.trim() || undefined,
  }, signal);
  return {
    photoUri: await persistEnhancedMealImage(enhancement.imageDataUrl, fileKey),
    version: enhancement.version,
  };
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
