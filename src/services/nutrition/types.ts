import type { MealAnalysis, NutritionSource } from '@/types/models';

export type NutritionErrorCode =
  | 'PERMISSION_DENIED'
  | 'INVALID_IMAGE'
  | 'INVALID_URL'
  | 'BLOCKED_LINK'
  | 'AMBIGUOUS_MEAL'
  | 'RATE_LIMITED'
  | 'OFFLINE'
  | 'PROVIDER_FAILURE'
  | 'NOT_CONFIGURED'
  | 'CLINICAL_APPROVAL_REQUIRED';

export interface MealLinkCandidate {
  id: string;
  restaurant?: string;
  itemName: string;
  size?: string;
  modifiers: string[];
  servings: number;
  confidence: number;
  sources: NutritionSource[];
}

export interface MealLinkResolution {
  sanitizedUrl: string;
  candidates: MealLinkCandidate[];
  needsConfirmation: boolean;
  fallbackMessage?: string;
}

export interface PhotoAnalysisRequest {
  imageDataUrl: string;
  mealName?: string;
}

export interface PhotoAnalysisResponse {
  draftId: string;
  analysis: MealAnalysis;
}

export interface ApiErrorBody {
  error: string;
  code: NutritionErrorCode;
}
