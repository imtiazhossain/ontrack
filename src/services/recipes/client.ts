import Constants from 'expo-constants';
import { fetch } from 'expo/fetch';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { authHeader } from '@/services/cloud/access-token';
import type {
  RecipeImportApiError,
  RecipeImportDraft,
  RecipeImportErrorCode,
  RecipeImportRequest,
} from './types';

export class RecipeImportError extends Error {
  constructor(
    message: string,
    readonly code: RecipeImportErrorCode,
    readonly status = 0,
  ) {
    super(message);
    this.name = 'RecipeImportError';
  }
}

function apiUrl(path: string) {
  const configured = (
    process.env.EXPO_PUBLIC_RECIPE_API_URL ??
    process.env.EXPO_PUBLIC_NUTRITION_API_URL
  )?.replace(/\/$/, '');
  if (configured) return `${configured}${path}`;
  if (Platform.OS === 'web') return path;
  const developmentHost = __DEV__ ? Constants.expoConfig?.hostUri : undefined;
  if (developmentHost) return `http://${developmentHost}${path}`;
  throw new RecipeImportError(
    'Recipe import is not configured for this build.',
    'NOT_CONFIGURED',
  );
}

export async function analyzeRecipe(
  request: RecipeImportRequest,
  signal?: AbortSignal,
) {
  let response: Response;
  try {
    response = await fetch(apiUrl('/recipe-imports/analyze'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify(request),
      signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    if (error instanceof RecipeImportError) throw error;
    throw new RecipeImportError(
      'Unable to connect. Check your internet connection.',
      'OFFLINE',
    );
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as
      | RecipeImportApiError
      | undefined;
    throw new RecipeImportError(
      body?.error ?? 'Recipe analysis is temporarily unavailable.',
      body?.code ?? 'PROVIDER_FAILURE',
      response.status,
    );
  }
  return response.json() as Promise<RecipeImportDraft>;
}

/** Re-encoding removes metadata while keeping enough detail for recipe text. */
export async function prepareRecipeImage(photoUri: string) {
  const result = await ImageManipulator.manipulateAsync(
    photoUri,
    [{ resize: { width: 2_048 } }],
    {
      compress: 0.82,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    },
  );
  if (!result.base64) {
    throw new RecipeImportError(
      'The selected image could not be prepared.',
      'INVALID_IMAGE',
    );
  }
  const imageDataUrl = `data:image/jpeg;base64,${result.base64}`;
  if (imageDataUrl.length > 8_000_000) {
    throw new RecipeImportError(
      'The selected image is too large.',
      'INVALID_IMAGE',
    );
  }
  return imageDataUrl;
}

/** Picker files may be temporary, so copy the sanitized thumbnail to documents. */
export async function persistRecipeImage(photoUri: string, key: string) {
  if (Platform.OS === 'web' || !photoUri.startsWith('file://')) return photoUri;
  const result = await ImageManipulator.manipulateAsync(
    photoUri,
    [{ resize: { width: 1_280 } }],
    { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
  );
  const directory = new Directory(Paths.document, 'recipe-images');
  directory.create({ idempotent: true, intermediates: true });
  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '-');
  const source = new File(result.uri);
  const destination = new File(directory, `${safeKey}-${Date.now()}.jpg`);
  await source.copy(destination);
  return destination.uri;
}

export function deletePersistedRecipeImage(uri?: string) {
  if (
    Platform.OS === 'web' ||
    !uri?.startsWith('file://') ||
    !uri.includes('/recipe-images/')
  ) {
    return;
  }
  const file = new File(uri);
  if (file.exists) file.delete();
}
