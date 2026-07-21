import { hasConfidentPlantIdentity, validatePlantCarePlan, validatePlantHealth, validatePlantIdentity } from './validate';
import type { PlantCarePlan, PlantHealthAssessment, PlantIdentity, RoomProfile } from '@/types/models';
import type { PlantServiceErrorCode } from './types';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const MAX_IMAGE_LENGTH = 5_500_000;
type PlantAIProvider = 'ollama' | 'openai';

const LOCAL_CARE_SOURCES = [
  { title: 'University of Minnesota Extension — Houseplants', url: 'https://extension.umn.edu/houseplants' },
  { title: 'Royal Horticultural Society — Houseplants', url: 'https://www.rhs.org.uk/plants/types/houseplants' },
];

function plantAIProvider(): PlantAIProvider {
  const configured = process.env.PLANT_AI_PROVIDER ?? process.env.MEAL_AI_PROVIDER;
  return configured === 'openai' ? 'openai' : 'ollama';
}

export const plantCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
};

export function plantOptionsResponse() {
  return new Response(null, { status: 204, headers: plantCorsHeaders });
}

export function plantError(error: string, code: PlantServiceErrorCode, status: number) {
  return Response.json({ error, code }, { status, headers: plantCorsHeaders });
}

export function assertPlantAnalysisEnabled() {
  if (plantAIProvider() === 'ollama') {
    if (process.env.LOCAL_PLANT_AI_ENABLED !== 'true' && process.env.LOCAL_MEAL_AI_ENABLED !== 'true') {
      return plantError(
        'Local plant analysis is disabled. Set LOCAL_PLANT_AI_ENABLED=true or enable the existing local meal analyzer.',
        'NOT_CONFIGURED',
        503,
      );
    }
    return undefined;
  }
  if (process.env.PLANT_AI_ENABLED !== 'true') {
    return plantError('Cloud plant analysis is disabled for this environment.', 'NOT_CONFIGURED', 503);
  }
  if (!process.env.OPENAI_API_KEY) {
    return plantError('OpenAI is not configured.', 'NOT_CONFIGURED', 503);
  }
  return undefined;
}

export function validImageDataUrl(value: unknown): value is string {
  return typeof value === 'string' &&
    /^data:image\/(jpeg|png|webp);base64,/.test(value) &&
    value.length <= MAX_IMAGE_LENGTH;
}

export function validRoomProfile(value: unknown): value is RoomProfile {
  if (typeof value !== 'object' || value === null) return false;
  const room = value as Record<string, unknown>;
  return typeof room.potDiameterCm === 'number' && Number.isFinite(room.potDiameterCm) && room.potDiameterCm > 0 &&
    ['yes', 'no', 'unknown'].includes(String(room.drainage)) &&
    ['north', 'east', 'south', 'west', 'unknown'].includes(String(room.windowDirection)) &&
    typeof room.windowDistanceM === 'number' && Number.isFinite(room.windowDistanceM) && room.windowDistanceM >= 0 &&
    typeof room.directSunHours === 'number' && Number.isFinite(room.directSunHours) && room.directSunHours >= 0 && room.directSunHours <= 24;
}

const HEALTH_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['status', 'summary', 'visibleSigns', 'possibleCauses', 'actions', 'confidence'],
  properties: {
    status: { type: 'string', enum: ['healthy', 'watch', 'urgent'] },
    summary: { type: 'string' },
    visibleSigns: { type: 'array', maxItems: 6, items: { type: 'string' } },
    possibleCauses: { type: 'array', maxItems: 5, items: { type: 'string' } },
    actions: { type: 'array', maxItems: 6, items: { type: 'string' } },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
  },
} as const;

const CARE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['watering', 'pruning', 'placement', 'sources', 'disclaimer'],
  properties: {
    watering: {
      type: 'object', additionalProperties: false,
      required: ['minMl', 'maxMl', 'intervalDays', 'soilCheck', 'notes'],
      properties: {
        minMl: { type: 'number', minimum: 1, maximum: 20000 },
        maxMl: { type: 'number', minimum: 1, maximum: 20000 },
        intervalDays: { type: 'number', minimum: 1, maximum: 365 },
        soilCheck: { type: 'string' }, notes: { type: 'string' },
      },
    },
    pruning: {
      type: 'object', additionalProperties: false,
      required: ['urgency', 'reason', 'steps'],
      properties: {
        urgency: { type: 'string', enum: ['not-needed', 'soon', 'now'] },
        reason: { type: 'string' },
        steps: { type: 'array', maxItems: 6, items: { type: 'string' } },
      },
    },
    placement: {
      type: 'object', additionalProperties: false,
      required: ['light', 'location', 'windowDistance', 'avoid'],
      properties: {
        light: { type: 'string' }, location: { type: 'string' }, windowDistance: { type: 'string' },
        avoid: { type: 'array', maxItems: 6, items: { type: 'string' } },
      },
    },
    sources: {
      type: 'array', minItems: 1, maxItems: 6,
      items: {
        type: 'object', additionalProperties: false, required: ['title', 'url'],
        properties: { title: { type: 'string' }, url: { type: 'string' } },
      },
    },
    disclaimer: { type: 'string' },
  },
} as const;

const IDENTIFY_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['identity', 'health'],
  properties: {
    identity: {
      type: 'object', additionalProperties: false,
      required: ['commonName', 'scientificName', 'confidence'],
      properties: {
        commonName: { type: 'string' }, scientificName: { type: 'string' },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      },
    },
    health: HEALTH_SCHEMA,
  },
} as const;

const CHECK_IN_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['health', 'careShouldChange', 'carePlan'],
  properties: {
    health: HEALTH_SCHEMA,
    careShouldChange: { type: 'boolean' },
    carePlan: { anyOf: [CARE_SCHEMA, { type: 'null' }] },
  },
} as const;

function responseText(body: Record<string, unknown>): string | undefined {
  if (typeof body.output_text === 'string') return body.output_text;
  const output = Array.isArray(body.output) ? body.output : [];
  for (const item of output) {
    if (typeof item !== 'object' || item === null) continue;
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? (item as { content: unknown[] }).content : [];
    for (const part of content) {
      if (typeof part === 'object' && part !== null && typeof (part as Record<string, unknown>).text === 'string') {
        return (part as Record<string, unknown>).text as string;
      }
    }
  }
  return undefined;
}

async function openAIResponse(payload: Record<string, unknown>) {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_PLANT_MODEL ?? 'gpt-5.6-terra',
      store: false,
      safety_identifier: 'ontrack-plant-analysis',
      reasoning: { effort: 'low' },
      ...payload,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`OpenAI request failed (${response.status})`);
  return response.json() as Promise<Record<string, unknown>>;
}

async function ollamaStructuredResponse(
  prompt: string,
  schema: Record<string, unknown>,
  imageDataUrls: string[] = [],
) {
  const baseUrl = new URL(process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434');
  if (!['127.0.0.1', 'localhost', '::1'].includes(baseUrl.hostname)) throw new Error('OLLAMA_UNAVAILABLE');
  let response: Response;
  try {
    response = await fetch(new URL('/api/chat', baseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OLLAMA_PLANT_MODEL ?? process.env.OLLAMA_MEAL_MODEL ?? 'qwen3-vl:2b',
        stream: false,
        think: false,
        format: schema,
        keep_alive: '15m',
        options: { temperature: 0, num_predict: 1800 },
        messages: [{
          role: 'user',
          content: `${prompt} /no_think`,
          ...(imageDataUrls.length
            ? { images: imageDataUrls.map((image) => image.slice(image.indexOf(',') + 1)) }
            : null),
        }],
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    throw new Error('OLLAMA_UNAVAILABLE');
  }
  if (!response.ok) throw new Error('OLLAMA_UNAVAILABLE');
  const body = await response.json() as { message?: { content?: string; thinking?: string } };
  const text = body.message?.content || body.message?.thinking;
  if (!text) throw new Error('INVALID_ANALYSIS');
  try { return JSON.parse(text) as unknown; } catch { throw new Error('INVALID_ANALYSIS'); }
}

function parseBody(body: Record<string, unknown>) {
  const text = responseText(body);
  if (!text) throw new Error('INVALID_ANALYSIS');
  try { return JSON.parse(text) as unknown; } catch { throw new Error('INVALID_ANALYSIS'); }
}

export async function identifyPlantImage(imageDataUrl: string) {
  const prompt = `Identify this houseplant only when multiple visible features agree. First inspect its growth habit
(vining/trailing, upright pseudostems, cane, rosette, or clumping), then leaf shape, arrangement, venation,
attachment, texture, and variegation. Reject any species whose growth habit or leaf shape conflicts with the
photo. In particular, pothos must show a vining or trailing habit with broad heart-shaped leaves; an upright
clump with pseudostems and narrow lance-shaped leaves is not pothos and may belong to the ginger family.
Do not choose an exact ginger species unless diagnostic flowers, rhizomes, or other distinguishing features
are visible. Report confidence of 0.8 or higher only when at least three compatible diagnostic features are
clearly visible; otherwise return a lower confidence so the app requests another photo. Assess visible health,
separating visible signs from possible causes. Do not diagnose disease or invent unseen conditions. Use concise plain language.`;
  const output = plantAIProvider() === 'ollama'
    ? await ollamaStructuredResponse(prompt, IDENTIFY_SCHEMA, [imageDataUrl])
    : parseBody(await openAIResponse({
      input: [{ role: 'user', content: [
      { type: 'input_text', text: prompt },
      { type: 'input_image', image_url: imageDataUrl, detail: 'high' },
    ] }],
    text: { format: { type: 'json_schema', name: 'plant_identification', strict: true, schema: IDENTIFY_SCHEMA } },
  }));
  const parsed = output as Record<string, unknown>;
  const identity = validatePlantIdentity(parsed.identity);
  const health = validatePlantHealth(parsed.health);
  if (!identity || !health) throw new Error('INVALID_ANALYSIS');
  if (!hasConfidentPlantIdentity(identity)) throw new Error('UNCLEAR_IMAGE');
  return { identity, health };
}

function carePrompt(identity: PlantIdentity, health: PlantHealthAssessment, room: RoomProfile) {
  return `Create a conservative indoor care plan for ${identity.commonName} (${identity.scientificName}). ` +
    `Visible health summary: ${health.summary}. Pot diameter: ${room.potDiameterCm} cm; drainage: ${room.drainage}; ` +
    `window: ${room.windowDirection}; distance: ${room.windowDistanceM} m; direct sun: ${room.directSunHours} hours. ` +
    'Watering must be an editable starting range plus a soil check, not a guarantee. Placement must be relative to the supplied window. ' +
    'Do not provide pesticide, medical, or pet-toxicity claims. State that conditions vary.';
}

export function validateLocalCarePlan(value: unknown): PlantCarePlan | null {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;
  const pruning = typeof raw.pruning === 'object' && raw.pruning !== null
    ? raw.pruning as Record<string, unknown>
    : undefined;
  const normalizedPruning = pruning && typeof pruning.reason === 'string' && /\b(no|not)\b.*\b(prun\w*|trim\w*|cut\w*)/i.test(pruning.reason)
    ? { ...pruning, urgency: 'not-needed' }
    : pruning;
  return validatePlantCarePlan({
    ...raw,
    pruning: normalizedPruning,
    sources: LOCAL_CARE_SOURCES,
    disclaimer: 'Generated locally by qwen3-vl as a starting point. Indoor conditions vary; verify uncertain or worsening issues with a qualified horticulturist.',
  });
}

export async function createCarePlan(input: {
  identity: PlantIdentity; health: PlantHealthAssessment; room: RoomProfile; roomImageDataUrl?: string;
}): Promise<PlantCarePlan> {
  if (plantAIProvider() === 'ollama') {
    const prompt = carePrompt(input.identity, input.health, input.room) +
      ' Keep pruning urgency logically consistent: use not-needed whenever the reason says pruning is unnecessary. Complete every schema field. The app will attach general horticultural references after generation; use placeholder HTTPS sources in the required sources field.';
    const raw = await ollamaStructuredResponse(
      prompt,
      CARE_SCHEMA,
      input.roomImageDataUrl ? [input.roomImageDataUrl] : [],
    );
    const plan = validateLocalCarePlan(raw);
    if (!plan) throw new Error('INVALID_ANALYSIS');
    return plan;
  }
  const content: Record<string, unknown>[] = [{ type: 'input_text', text: carePrompt(input.identity, input.health, input.room) }];
  if (input.roomImageDataUrl) content.push({ type: 'input_image', image_url: input.roomImageDataUrl, detail: 'low' });
  const body = await openAIResponse({
    tools: [{ type: 'web_search', search_context_size: 'medium' }],
    input: [{ role: 'user', content: [
      ...content,
      { type: 'input_text', text: 'Use trustworthy university extension, botanical garden, or recognized horticultural sources and return their direct HTTPS URLs.' },
    ] }],
    text: { format: { type: 'json_schema', name: 'plant_care_plan', strict: true, schema: CARE_SCHEMA } },
  });
  const plan = validatePlantCarePlan(parseBody(body));
  if (!plan) throw new Error('INVALID_ANALYSIS');
  return plan;
}

export async function checkPlantHealth(input: {
  imageDataUrl: string; identity: PlantIdentity; previousHealth: PlantHealthAssessment;
  currentCarePlan: PlantCarePlan; room: RoomProfile;
}) {
  const prompt = `Reassess this known ${input.identity.scientificName}. Previous assessment: ${input.previousHealth.summary}. Compare only supported visible changes. Propose a complete replacement care plan only when the visible evidence justifies it. ${carePrompt(input.identity, input.previousHealth, input.room)}`;
  const output = plantAIProvider() === 'ollama'
    ? await ollamaStructuredResponse(
      prompt + ' Complete every schema field. The app will attach general horticultural references to any proposed care plan; use placeholder HTTPS sources in the required sources field.',
      CHECK_IN_SCHEMA,
      [input.imageDataUrl],
    )
    : parseBody(await openAIResponse({
    tools: [{ type: 'web_search', search_context_size: 'low' }],
    input: [{ role: 'user', content: [
      { type: 'input_text', text: prompt + ' Use trustworthy horticultural web sources for any proposed change.' },
      { type: 'input_image', image_url: input.imageDataUrl, detail: 'high' },
    ] }],
    text: { format: { type: 'json_schema', name: 'plant_check_in', strict: true, schema: CHECK_IN_SCHEMA } },
  }));
  const parsed = output as Record<string, unknown>;
  const health = validatePlantHealth(parsed.health);
  const carePlan = parsed.careShouldChange
    ? (plantAIProvider() === 'ollama' ? validateLocalCarePlan(parsed.carePlan) : validatePlantCarePlan(parsed.carePlan))
    : null;
  if (!health || (parsed.careShouldChange === true && !carePlan)) throw new Error('INVALID_ANALYSIS');
  return { health, proposedCarePlan: carePlan ?? undefined };
}
