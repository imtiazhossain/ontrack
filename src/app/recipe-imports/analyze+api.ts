import { compressResponse } from '@/services/http/compression';
import {
  analyzeRecipeImport,
  assertRecipeAnalysisEnabled,
  assertRecipeAuthenticated,
  recipeCorsHeaders,
  recipeError,
  recipeOptionsResponse,
} from '@/services/recipes/server';
import type { RecipeImportRequest } from '@/services/recipes/types';

export function OPTIONS() {
  return recipeOptionsResponse();
}

export async function POST(request: Request) {
  const disabled = assertRecipeAnalysisEnabled();
  if (disabled) return disabled;
  const unauthorized = await assertRecipeAuthenticated(request);
  if (unauthorized) return unauthorized;
  const input = (await request.json().catch(() => undefined)) as
    | Partial<RecipeImportRequest>
    | undefined;
  if (
    !input ||
    (input.kind !== 'url' && input.kind !== 'image') ||
    (input.kind === 'url' &&
      (typeof input.url !== 'string' || input.url.length > 2_000)) ||
    (input.kind === 'image' && typeof input.imageDataUrl !== 'string')
  ) {
    return recipeError(
      input?.kind === 'image'
        ? 'Select a valid recipe image.'
        : 'Enter a valid recipe URL.',
      input?.kind === 'image' ? 'INVALID_IMAGE' : 'INVALID_URL',
      400,
    );
  }

  try {
    const draft = await analyzeRecipeImport(input as RecipeImportRequest);
    return compressResponse(
      request,
      Response.json(draft, { headers: recipeCorsHeaders }),
    );
  } catch (error) {
    const code = error instanceof Error ? error.message : 'PROVIDER_FAILURE';
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Recipe import failure:', code);
    }
    if (code === 'INVALID_URL') {
      return recipeError('Enter a complete public HTTPS URL.', 'INVALID_URL', 400);
    }
    if (code === 'BLOCKED_URL') {
      return recipeError(
        'This URL could not be read safely.',
        'BLOCKED_URL',
        422,
      );
    }
    if (code === 'INVALID_IMAGE') {
      return recipeError(
        'The image is invalid or too large.',
        'INVALID_IMAGE',
        400,
      );
    }
    if (code === 'NO_RECIPE_FOUND') {
      return recipeError(
        'No complete recipe was found in that source.',
        'NO_RECIPE_FOUND',
        422,
      );
    }
    if (code === 'OLLAMA_UNAVAILABLE') {
      return recipeError(
        'The local recipe model is unavailable. Start Ollama and install the configured vision model.',
        'PROVIDER_FAILURE',
        503,
      );
    }
    return recipeError(
      'Recipe analysis is temporarily unavailable.',
      'PROVIDER_FAILURE',
      502,
    );
  }
}
