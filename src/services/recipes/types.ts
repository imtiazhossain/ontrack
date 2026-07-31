export type RecipeImportErrorCode =
  | 'INVALID_URL'
  | 'BLOCKED_URL'
  | 'INVALID_IMAGE'
  | 'NO_RECIPE_FOUND'
  | 'OFFLINE'
  | 'PROVIDER_FAILURE'
  | 'NOT_CONFIGURED';

export type RecipeImportRequest =
  | { kind: 'url'; url: string }
  | { kind: 'image'; imageDataUrl: string };

export interface RecipeImportIngredient {
  name: string;
  canonicalKey: string;
  quantityValue: number | null;
  quantityText: string | null;
  unit: string | null;
  preparation: string | null;
  originalText: string;
  confidence: number;
}

export interface RecipeImportDraft {
  name: string;
  sourceKind: 'url' | 'image';
  sourceUrl?: string;
  originalServings: number | null;
  targetServings: number | null;
  ingredients: RecipeImportIngredient[];
  warnings: string[];
  confidence: number;
}

export interface RecipeImportApiError {
  error: string;
  code: RecipeImportErrorCode;
}

