import { defaultOpenAIModel, fetchOpenAIResponses, parseOpenAIJsonResponse } from '@/services/ai';
import { apiRateLimitSubject, authenticateApiRequest, isApiRequestBlocked } from '@/services/http/api-auth';
import { checkApiRateLimit } from '@/services/http/api-rate-limit';

export interface MoodSuggestionInput {
  emotions: { label: string; intensity: number }[];
  factorNames: string[];
  desiredEmotions: string[];
}

export interface MoodActionSuggestion {
  title: string;
  why: string;
  durationMinutes?: number;
  steps: string[];
}

const INPUT_KEYS = new Set(['emotions', 'factorNames', 'desiredEmotions']);
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['suggestions'],
  properties: {
    suggestions: {
      type: 'array', minItems: 1, maxItems: 3,
      items: {
        type: 'object', additionalProperties: false,
        required: ['title', 'why', 'steps'],
        properties: {
          title: { type: 'string', maxLength: 80 },
          why: { type: 'string', maxLength: 240 },
          durationMinutes: { type: ['integer', 'null'], minimum: 1, maximum: 120 },
          steps: { type: 'array', minItems: 1, maxItems: 5, items: { type: 'string', maxLength: 160 } },
        },
      },
    },
  },
} as const;

export function parseMoodSuggestionInput(value: unknown): MoodSuggestionInput | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const object = value as Record<string, unknown>;
  if (Object.keys(object).some((key) => !INPUT_KEYS.has(key))) return undefined;
  if (!Array.isArray(object.emotions) || object.emotions.length < 1 || object.emotions.length > 8) return undefined;
  const emotions = object.emotions.map((item) => {
    if (!item || typeof item !== 'object') return undefined;
    const label = typeof (item as Record<string, unknown>).label === 'string' ? String((item as Record<string, unknown>).label).trim() : '';
    const intensity = Number((item as Record<string, unknown>).intensity);
    return label && label.length <= 60 && Number.isInteger(intensity) && intensity >= 1 && intensity <= 5 ? { label, intensity } : undefined;
  });
  if (emotions.some((item) => !item)) return undefined;
  const factorNames = Array.isArray(object.factorNames) ? object.factorNames.filter((item): item is string => typeof item === 'string' && item.trim().length > 0 && item.length <= 80).slice(0, 8) : [];
  const desiredEmotions = Array.isArray(object.desiredEmotions) ? object.desiredEmotions.filter((item): item is string => typeof item === 'string' && item.trim().length > 0 && item.length <= 60).slice(0, 5) : [];
  return { emotions: emotions as MoodSuggestionInput['emotions'], factorNames, desiredEmotions };
}

function validateSuggestions(value: unknown): MoodActionSuggestion[] {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { suggestions?: unknown }).suggestions)) throw new Error('INVALID_SUGGESTIONS');
  return (value as { suggestions: unknown[] }).suggestions.slice(0, 3).map((item) => {
    const value = item as Partial<MoodActionSuggestion>;
    if (typeof value.title !== 'string' || typeof value.why !== 'string' || !Array.isArray(value.steps)) throw new Error('INVALID_SUGGESTIONS');
    const steps = value.steps.filter((step): step is string => typeof step === 'string' && step.trim().length > 0).slice(0, 5);
    if (!steps.length) throw new Error('INVALID_SUGGESTIONS');
    return { title: value.title.slice(0, 80), why: value.why.slice(0, 240), durationMinutes: typeof value.durationMinutes === 'number' ? Math.min(120, Math.max(1, Math.round(value.durationMinutes))) : undefined, steps };
  });
}

export async function authorizeMoodSuggestions(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (isApiRequestBlocked(auth)) return { response: Response.json({ error: 'Sign in is required for AI suggestions.', code: 'PERMISSION_DENIED' }, { status: 401 }) };
  if (checkApiRateLimit('health', apiRateLimitSubject(request, auth)) === 'limited') return { response: Response.json({ error: 'AI suggestion limit reached. Try again later.', code: 'RATE_LIMITED' }, { status: 429 }) };
  return { auth };
}

export async function createMoodSuggestions(input: MoodSuggestionInput, safetyIdentifier: string) {
  if (!process.env.OPENAI_API_KEY) throw new Error('NOT_CONFIGURED');
  const body = await fetchOpenAIResponses({
    model: defaultOpenAIModel(process.env.OPENAI_HEALTH_MODEL),
    safetyIdentifier,
    payload: {
      input: [{
        role: 'user',
        content: [{
          type: 'input_text',
          text: `Suggest 1-3 small, practical, low-risk self-support action plans. Feelings: ${input.emotions.map((item) => `${item.label} ${item.intensity}/5`).join(', ')}. Factors: ${input.factorNames.join(', ') || 'none selected'}. Desired direction: ${input.desiredEmotions.join(', ') || 'a steadier state'}. Do not diagnose, mention medication, claim treatment, guarantee a mood change, or provide crisis counseling. Keep steps concrete and editable.`,
        }],
      }],
      text: { format: { type: 'json_schema', name: 'mood_action_suggestions', strict: true, schema: SCHEMA } },
    },
  });
  return validateSuggestions(parseOpenAIJsonResponse(body));
}
