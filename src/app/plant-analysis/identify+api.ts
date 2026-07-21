import {
  assertPlantAnalysisEnabled,
  identifyPlantImage,
  plantCorsHeaders,
  plantError,
  plantOptionsResponse,
  validImageDataUrl,
} from '@/services/plants/server';

export function OPTIONS() { return plantOptionsResponse(); }

export async function POST(request: Request) {
  const disabled = assertPlantAnalysisEnabled();
  if (disabled) return disabled;
  const input = await request.json().catch(() => undefined) as { imageDataUrl?: unknown } | undefined;
  if (!validImageDataUrl(input?.imageDataUrl)) return plantError('A valid plant image is required.', 'INVALID_IMAGE', 400);
  try {
    return Response.json(await identifyPlantImage(input.imageDataUrl), { headers: plantCorsHeaders });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNCLEAR_IMAGE') {
      return plantError('The plant could not be identified confidently. Retake a clear whole-plant or leaf photo.', 'UNCLEAR_IMAGE', 422);
    }
    if (error instanceof Error && error.message === 'OLLAMA_UNAVAILABLE') {
      return plantError(
        'The local plant model is unavailable. Start Ollama and install the configured vision model.',
        'PROVIDER_FAILURE',
        503,
      );
    }
    return plantError('Plant identification is temporarily unavailable.', 'PROVIDER_FAILURE', 502);
  }
}
