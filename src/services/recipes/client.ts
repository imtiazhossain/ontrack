import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { apiRequest } from '@/services/http/api-client';
import { resolveExpoApiUrl } from '@/services/http/api-url';
import { prepareJpegDataUrl, persistJpegToDocuments } from '@/utils/image-persist';
import type {
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
  return resolveExpoApiUrl(path, {
    configuredBaseUrl:
      process.env.EXPO_PUBLIC_RECIPE_API_URL ?? process.env.EXPO_PUBLIC_NUTRITION_API_URL,
    preferConfiguredFirst: true,
    createNotConfiguredError: () =>
      new RecipeImportError(
        'Recipe import is not configured for this build.',
        'NOT_CONFIGURED',
      ),
  });
}


export async function analyzeRecipe(
  request: RecipeImportRequest,
  signal?: AbortSignal,
) {
  return apiRequest<RecipeImportDraft, RecipeImportError>({
    url: apiUrl('/recipe-imports/analyze'),
    method: 'POST',
    body: request,
    signal,
    offlineMessage: 'Unable to connect. Check your internet connection.',
    unavailableMessage: 'Recipe analysis is temporarily unavailable.',
    defaultErrorCode: 'PROVIDER_FAILURE',
    createError: (message, code, status) =>
      new RecipeImportError(
        message,
        (code as RecipeImportErrorCode | undefined) ?? 'PROVIDER_FAILURE',
        status ?? 0,
      ),
  });
}

/** Re-encoding removes metadata while keeping enough detail for recipe text. */
export async function prepareRecipeImage(photoUri: string) {
  return prepareJpegDataUrl(photoUri, {
    width: 2_048,
    compress: 0.82,
    maxDataUrlLength: 8_000_000,
    onInvalid: (reason) => {
      throw new RecipeImportError(
        reason === 'too_large'
          ? 'The selected image is too large.'
          : 'The selected image could not be prepared.',
        'INVALID_IMAGE',
      );
    },
  });
}

/** Picker files may be temporary, so copy the sanitized thumbnail to documents. */
export async function persistRecipeImage(photoUri: string, key: string) {
  return persistJpegToDocuments(photoUri, {
    width: 1_280,
    compress: 0.82,
    directorySegments: ['recipe-images'],
    fileStem: key,
  });
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
