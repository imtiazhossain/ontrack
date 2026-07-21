import { resolve4, resolve6 } from 'node:dns/promises';

import { AI_DISCLAIMER } from '@/services/ai';
import { validateMealAnalysis } from '@/services/ai/validate';
import type { FoodItem, MealAnalysis, NutrientValue, NutritionSource } from '@/types/models';
import type { MealLinkCandidate, MealLinkResolution, NutritionErrorCode } from './types';
import { isPrivateHostname, sanitizeMealUrl } from './url-safety';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const FDC_URL = 'https://api.nal.usda.gov/fdc/v1';
const MAX_ITEMS = 8;
const MAX_VISION_ITEMS = 4;
type MealAIProvider = 'ollama' | 'openai';

function mealAIProvider(): MealAIProvider {
  return process.env.MEAL_AI_PROVIDER === 'ollama' ? 'ollama' : 'openai';
}

export const nutritionCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store',
};

export function nutritionOptionsResponse() {
  return new Response(null, { status: 204, headers: nutritionCorsHeaders });
}

export function nutritionError(error: string, code: NutritionErrorCode, status: number) {
  return Response.json({ error, code }, { status, headers: nutritionCorsHeaders });
}

export function assertAnalysisEnabled(operation: 'photo' | 'cloud' = 'cloud') {
  if (operation === 'photo' && mealAIProvider() === 'ollama') {
    if (process.env.LOCAL_MEAL_AI_ENABLED !== 'true') {
      return nutritionError(
        'Local meal analysis is disabled. Set LOCAL_MEAL_AI_ENABLED=true for development.',
        'NOT_CONFIGURED',
        503,
      );
    }
    return undefined;
  }
  if (process.env.CLINICAL_AI_ENABLED !== 'true') {
    return nutritionError(
      'Meal AI is disabled until the configured privacy and clinical release gates are complete.',
      'NOT_CONFIGURED',
      503,
    );
  }
  if (!process.env.OPENAI_API_KEY) {
    return nutritionError('OpenAI is not configured.', 'NOT_CONFIGURED', 503);
  }
  return undefined;
}

interface VisionFood {
  name: string;
  portion: string;
  portionGrams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sugarG: number;
  saturatedFatG: number;
  sodiumMg: number;
  confidence: number;
}

interface VisionOutput {
  foods: VisionFood[];
  observations: string[];
  overallConfidence: number;
}

function finiteNumber(value: unknown): number | undefined {
  const number = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function normalizeVisionOutput(value: unknown): VisionOutput {
  if (typeof value !== 'object' || value === null) throw new Error('INVALID_ANALYSIS');
  const output = value as Record<string, unknown>;
  if (!Array.isArray(output.foods)) throw new Error('INVALID_ANALYSIS');

  const foods = output.foods.slice(0, MAX_ITEMS).flatMap((candidate): VisionFood[] => {
    if (typeof candidate !== 'object' || candidate === null) return [];
    const food = candidate as Record<string, unknown>;
    const name = typeof food.name === 'string' ? food.name.trim() : '';
    const portionGrams = finiteNumber(food.portionGrams);
    const calories = finiteNumber(food.calories);
    const proteinG = finiteNumber(food.proteinG);
    const carbsG = finiteNumber(food.carbsG);
    const fatG = finiteNumber(food.fatG);
    const fiberG = finiteNumber(food.fiberG);
    const sugarG = finiteNumber(food.sugarG);
    const saturatedFatG = finiteNumber(food.saturatedFatG);
    const sodiumMg = finiteNumber(food.sodiumMg);
    const confidence = finiteNumber(food.confidence);
    if (
      !name || portionGrams === undefined || calories === undefined || proteinG === undefined ||
      carbsG === undefined || fatG === undefined || fiberG === undefined || sugarG === undefined ||
      saturatedFatG === undefined || sodiumMg === undefined || confidence === undefined
    ) return [];
    const providedPortion = typeof food.portion === 'string' ? food.portion.replace(/[{}]/g, '').trim() : '';
    return [{
      name,
      portion: providedPortion || `${Math.round(portionGrams)} g estimated serving`,
      portionGrams,
      calories,
      proteinG,
      carbsG,
      fatG,
      fiberG,
      sugarG,
      saturatedFatG,
      sodiumMg,
      confidence: Math.min(confidence, 1),
    }];
  });
  if (!foods.length) throw new Error('INVALID_ANALYSIS');

  const observations = Array.isArray(output.observations)
    ? output.observations
      .filter((observation): observation is string => typeof observation === 'string' && observation.trim().length > 0)
      .map((observation) => observation.trim())
      .slice(0, 4)
    : [];
  const reportedConfidence = finiteNumber(output.overallConfidence);
  const averageConfidence = foods.reduce((total, food) => total + food.confidence, 0) / foods.length;
  return {
    foods,
    observations,
    overallConfidence: Math.min(reportedConfidence ?? averageConfidence, 1),
  };
}

const VISION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['foods', 'observations', 'overallConfidence'],
  properties: {
    foods: {
      type: 'array',
      minItems: 1,
      maxItems: MAX_VISION_ITEMS,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'name', 'portion', 'portionGrams', 'calories', 'proteinG', 'carbsG', 'fatG',
          'fiberG', 'sugarG', 'saturatedFatG', 'sodiumMg', 'confidence',
        ],
        properties: {
          name: { type: 'string' },
          portion: { type: 'string' },
          portionGrams: { type: 'number', minimum: 0 },
          calories: { type: 'number', minimum: 0 },
          proteinG: { type: 'number', minimum: 0 },
          carbsG: { type: 'number', minimum: 0 },
          fatG: { type: 'number', minimum: 0 },
          fiberG: { type: 'number', minimum: 0 },
          sugarG: { type: 'number', minimum: 0 },
          saturatedFatG: { type: 'number', minimum: 0 },
          sodiumMg: { type: 'number', minimum: 0 },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
      },
    },
    observations: { type: 'array', maxItems: 4, items: { type: 'string' } },
    overallConfidence: { type: 'number', minimum: 0, maximum: 1 },
  },
} as const;

function responseText(body: Record<string, unknown>): string | undefined {
  if (typeof body.output_text === 'string') return body.output_text;
  const output = Array.isArray(body.output) ? body.output : [];
  for (const item of output) {
    if (typeof item !== 'object' || item === null) continue;
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? ((item as Record<string, unknown>).content as unknown[])
      : [];
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
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MEAL_MODEL ?? 'gpt-5.6-terra',
      store: false,
      safety_identifier: 'ontrack-meal-analysis',
      reasoning: { effort: 'low' },
      ...payload,
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`OpenAI request failed (${response.status})`);
  return response.json() as Promise<Record<string, unknown>>;
}

async function ollamaVisionResponse(imageDataUrl: string, prompt: string): Promise<VisionOutput> {
  const baseUrl = new URL(process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434');
  if (!['127.0.0.1', 'localhost', '::1'].includes(baseUrl.hostname)) {
    throw new Error('OLLAMA_UNAVAILABLE');
  }
  const encodedImage = imageDataUrl.slice(imageDataUrl.indexOf(',') + 1);
  let response: Response;
  try {
    response = await fetch(new URL('/api/chat', baseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.OLLAMA_MEAL_MODEL ?? 'qwen3-vl:2b',
        stream: false,
        think: false,
        format: VISION_SCHEMA,
        keep_alive: '15m',
        options: { temperature: 0, num_predict: 900 },
        messages: [{ role: 'user', content: prompt, images: [encodedImage] }],
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    throw new Error('OLLAMA_UNAVAILABLE');
  }
  if (!response.ok) throw new Error('OLLAMA_UNAVAILABLE');
  const body = await response.json() as { message?: { content?: string; thinking?: string } };
  const structuredText = body.message?.content || body.message?.thinking;
  if (!structuredText) throw new Error('INVALID_ANALYSIS');
  try {
    const output = normalizeVisionOutput(JSON.parse(structuredText));
    return {
      ...output,
      foods: output.foods.map((food) => ({ ...food, confidence: Math.min(food.confidence, 0.75) })),
      overallConfidence: Math.min(output.overallConfidence, 0.75),
    };
  } catch {
    throw new Error('INVALID_ANALYSIS');
  }
}

async function identifyFoods(imageDataUrl: string, mealName?: string): Promise<VisionOutput> {
  const prompt =
    `Identify the visible foods and estimate the served portions. ${mealName ? `The user calls it ${mealName}.` : ''} ` +
    'Return concise nutrition estimates for no more than four primary visible items. ' +
    'Do not include dishes, utensils, or containers. Do not infer diagnoses, allergies, or feeding instructions. /no_think';
  if (mealAIProvider() === 'ollama') {
    return ollamaVisionResponse(imageDataUrl, prompt);
  }
  const body = await openAIResponse({
    input: [{
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: prompt,
        },
        { type: 'input_image', image_url: imageDataUrl, detail: 'low' },
      ],
    }],
    text: { format: { type: 'json_schema', name: 'meal_photo', strict: true, schema: VISION_SCHEMA } },
  });
  const text = responseText(body);
  if (!text) throw new Error('The model did not return an analysis.');
  return normalizeVisionOutput(JSON.parse(text));
}

interface FdcFoodNutrient {
  amount?: number;
  nutrient?: { id?: number; name?: string; unitName?: string };
}

function nutrientAmount(nutrients: NutrientValue[], matcher: RegExp, unit?: string): number | undefined {
  return nutrients.find((value) => matcher.test(value.name) && (!unit || value.unit === unit))?.amount;
}

async function groundFood(food: VisionFood, index: number): Promise<{ item: FoodItem; source?: NutritionSource }> {
  const fallback: FoodItem = {
    id: `ai-${Date.now()}-${index}`,
    name: food.name,
    portion: food.portion,
    calories: Math.round(food.calories),
    proteinG: Math.round(food.proteinG),
    carbsG: Math.round(food.carbsG),
    fatG: Math.round(food.fatG),
    fiberG: Math.round(food.fiberG),
    sugarG: Math.round(food.sugarG),
    saturatedFatG: Math.round(food.saturatedFatG),
    sodiumMg: Math.round(food.sodiumMg),
    nutrients: [],
    confidence: food.confidence,
  };
  const apiKey = process.env.USDA_FDC_API_KEY;
  if (!apiKey || food.portionGrams <= 0) return { item: fallback };

  try {
    const search = await fetch(`${FDC_URL}/foods/search?api_key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: food.name, pageSize: 1, dataType: ['Foundation', 'Survey (FNDDS)', 'Branded'] }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!search.ok) return { item: fallback };
    const searchBody = await search.json() as { foods?: { fdcId?: number; description?: string }[] };
    const match = searchBody.foods?.[0];
    if (!match?.fdcId) return { item: fallback };
    const details = await fetch(`${FDC_URL}/food/${match.fdcId}?api_key=${encodeURIComponent(apiKey)}`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!details.ok) return { item: fallback };
    const detailsBody = await details.json() as { foodNutrients?: FdcFoodNutrient[] };
    const scale = food.portionGrams / 100;
    const sourceId = `usda-${match.fdcId}`;
    const nutrients: NutrientValue[] = (detailsBody.foodNutrients ?? [])
      .filter((value) => typeof value.amount === 'number' && value.nutrient?.name && value.nutrient.unitName)
      .map((value) => ({
        id: String(value.nutrient!.id ?? value.nutrient!.name),
        name: value.nutrient!.name!,
        amount: Math.round(value.amount! * scale * 100) / 100,
        unit: value.nutrient!.unitName!,
        estimated: true,
        confidence: food.confidence,
        sourceRef: sourceId,
      }));
    const energy = nutrientAmount(nutrients, /^Energy$/i, 'KCAL');
    const item: FoodItem = {
      ...fallback,
      calories: Math.round(energy ?? fallback.calories),
      proteinG: Math.round(nutrientAmount(nutrients, /^Protein$/i, 'G') ?? fallback.proteinG),
      carbsG: Math.round(nutrientAmount(nutrients, /Carbohydrate, by difference/i, 'G') ?? fallback.carbsG),
      fatG: Math.round(nutrientAmount(nutrients, /Total lipid \(fat\)/i, 'G') ?? fallback.fatG),
      fiberG: Math.round(nutrientAmount(nutrients, /Fiber, total dietary/i, 'G') ?? fallback.fiberG ?? 0),
      sugarG: Math.round(nutrientAmount(nutrients, /Sugars, total/i, 'G') ?? fallback.sugarG ?? 0),
      saturatedFatG: Math.round(nutrientAmount(nutrients, /Fatty acids, total saturated/i, 'G') ?? fallback.saturatedFatG ?? 0),
      sodiumMg: Math.round(nutrientAmount(nutrients, /^Sodium, Na$/i, 'MG') ?? fallback.sodiumMg ?? 0),
      nutrients,
      sourceRefs: [sourceId],
    };
    return {
      item,
      source: {
        id: sourceId,
        kind: 'usda',
        title: match.description ?? food.name,
        url: `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${match.fdcId}/nutrients`,
        accessedAt: new Date().toISOString(),
      },
    };
  } catch {
    return { item: fallback };
  }
}

function sum(items: FoodItem[], key: keyof FoodItem): number {
  return Math.round(items.reduce((total, item) => total + (typeof item[key] === 'number' ? item[key] : 0), 0));
}

async function assembleAnalysis(vision: VisionOutput, extraSources: NutritionSource[] = []): Promise<MealAnalysis> {
  const grounded = await Promise.all(vision.foods.slice(0, MAX_ITEMS).map(groundFood));
  const items = grounded.map((result) => result.item);
  const sources = [...extraSources, ...grounded.flatMap((result) => result.source ? [result.source] : [])]
    .filter((source, index, all) => all.findIndex((candidate) => candidate.id === source.id) === index);
  if (sources.length < items.length) {
    sources.push({ id: 'ai-estimate', kind: 'ai-estimate', title: 'AI visual estimate' });
  }
  const proteinG = sum(items, 'proteinG');
  const candidate: MealAnalysis = {
    items,
    totalCalories: sum(items, 'calories'),
    proteinG,
    carbsG: sum(items, 'carbsG'),
    fatG: sum(items, 'fatG'),
    fiberG: sum(items, 'fiberG'),
    sugarG: sum(items, 'sugarG'),
    saturatedFatG: sum(items, 'saturatedFatG'),
    sodiumMg: sum(items, 'sodiumMg'),
    nutrients: items.flatMap((item) => item.nutrients ?? []),
    sources,
    recommendations: proteinG >= 25 ? [{
      id: 'protein-balance', title: 'Protein-forward meal',
      body: 'This meal appears to provide a meaningful amount of protein.', kind: 'balance',
    }] : [],
    overallConfidence: vision.overallConfidence,
    reviewRequired: vision.overallConfidence < 0.8 || items.some((item) => (item.confidence ?? 0) < 0.7),
    observations: vision.observations,
    disclaimer: AI_DISCLAIMER,
  };
  const valid = validateMealAnalysis(candidate);
  if (!valid) throw new Error('INVALID_ANALYSIS');
  return valid;
}

export async function analyzePhoto(input: { imageDataUrl: string; mealName?: string }): Promise<MealAnalysis> {
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(input.imageDataUrl) || input.imageDataUrl.length > 5_500_000) {
    throw new Error('INVALID_IMAGE');
  }
  return assembleAnalysis(await identifyFoods(input.imageDataUrl, input.mealName));
}

export async function analyzeLinkCandidate(candidate: MealLinkCandidate): Promise<MealAnalysis> {
  const sourceSummary = candidate.sources.map((source) => source.url).filter(Boolean).join('\n');
  const body = await openAIResponse({
    tools: [{ type: 'web_search', search_context_size: 'medium' }],
    input:
      'Estimate the selected public restaurant meal and use published nutrition facts when available. ' +
      'Do not infer private order information or provide medical advice.\n' +
      `Restaurant: ${candidate.restaurant ?? 'Unknown'}\nItem: ${candidate.itemName}\n` +
      `Size: ${candidate.size ?? 'Unknown'}\nModifiers: ${candidate.modifiers.join(', ') || 'None'}\n` +
      `Servings: ${candidate.servings}\nSources:\n${sourceSummary}`,
    text: { format: { type: 'json_schema', name: 'meal_link_analysis', strict: true, schema: VISION_SCHEMA } },
  });
  const text = responseText(body);
  if (!text) throw new Error('INVALID_ANALYSIS');
  return assembleAnalysis(JSON.parse(text) as VisionOutput, candidate.sources);
}

async function assertPublicDns(url: URL) {
  if (isPrivateHostname(url.hostname)) throw new Error('BLOCKED_LINK');
  const addresses = await Promise.allSettled([resolve4(url.hostname), resolve6(url.hostname)]);
  const resolved = addresses.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  if (!resolved.length || resolved.some(isPrivateHostname)) throw new Error('BLOCKED_LINK');
}

async function fetchPublicPage(rawUrl: string): Promise<{ sanitizedUrl: string; text: string }> {
  let current = sanitizeMealUrl(rawUrl);
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    const url = new URL(current);
    await assertPublicDns(url);
    const response = await fetch(current, {
      redirect: 'manual',
      headers: { 'User-Agent': 'onTrack meal-link resolver/1.0', Accept: 'text/html,application/json' },
      signal: AbortSignal.timeout(8_000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('BLOCKED_LINK');
      current = sanitizeMealUrl(new URL(location, current).toString());
      continue;
    }
    if (!response.ok) throw new Error('BLOCKED_LINK');
    const contentType = response.headers.get('content-type') ?? '';
    if (!/(text\/html|application\/json)/i.test(contentType)) throw new Error('BLOCKED_LINK');
    const text = await response.text();
    if (text.length > 1_000_000) throw new Error('BLOCKED_LINK');
    return { sanitizedUrl: current, text: text.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 18_000) };
  }
  throw new Error('BLOCKED_LINK');
}

const LINK_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['candidates'],
  properties: {
    candidates: { type: 'array', maxItems: 5, items: {
      type: 'object', additionalProperties: false,
      required: ['restaurant', 'itemName', 'size', 'modifiers', 'servings', 'confidence'],
      properties: {
        restaurant: { type: 'string' }, itemName: { type: 'string' }, size: { type: 'string' },
        modifiers: { type: 'array', items: { type: 'string' } }, servings: { type: 'number', minimum: 0.1 },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      },
    } },
  },
} as const;

export async function resolveLink(rawUrl: string): Promise<MealLinkResolution> {
  const page = await fetchPublicPage(rawUrl);
  const body = await openAIResponse({
    tools: [{ type: 'web_search', search_context_size: 'medium' }],
    include: ['web_search_call.action.sources'],
    input:
      'Resolve the restaurant meal represented by this public link. Use official restaurant nutrition sources when possible. ' +
      'Do not infer private order details. Return possible items when ambiguous.\n' +
      `URL: ${page.sanitizedUrl}\nPublic page text: ${page.text}`,
    text: { format: { type: 'json_schema', name: 'meal_link', strict: true, schema: LINK_SCHEMA } },
  });
  const text = responseText(body);
  if (!text) throw new Error('AMBIGUOUS_MEAL');
  const parsed = JSON.parse(text) as { candidates?: Omit<MealLinkCandidate, 'id' | 'sources'>[] };
  const rawSources: NutritionSource[] = [];
  const output = Array.isArray(body.output) ? body.output : [];
  for (const item of output) {
    const action = typeof item === 'object' && item !== null ? (item as Record<string, unknown>).action : undefined;
    const sources = typeof action === 'object' && action !== null && Array.isArray((action as Record<string, unknown>).sources)
      ? (action as Record<string, unknown>).sources as Record<string, unknown>[] : [];
    for (const source of sources) {
      if (typeof source.url === 'string') rawSources.push({
        id: `web-${rawSources.length + 1}`, kind: 'verified-menu',
        title: typeof source.title === 'string' ? source.title : new URL(source.url).hostname,
        url: source.url, accessedAt: new Date().toISOString(),
      });
    }
  }
  const pageSource: NutritionSource = {
    id: 'submitted-link', kind: 'verified-menu', title: new URL(page.sanitizedUrl).hostname,
    url: page.sanitizedUrl, accessedAt: new Date().toISOString(),
  };
  const sources = [pageSource, ...rawSources].filter((source, index, all) =>
    all.findIndex((candidate) => candidate.url === source.url) === index);
  const candidates: MealLinkCandidate[] = (parsed.candidates ?? []).map((candidate, index) => ({
    ...candidate, id: `candidate-${index + 1}`, sources,
  }));
  return {
    sanitizedUrl: page.sanitizedUrl,
    candidates,
    needsConfirmation: candidates.length !== 1 || (candidates[0]?.confidence ?? 0) < 0.85,
    fallbackMessage: candidates.length ? undefined : 'Paste the menu text or add a screenshot so the meal can be confirmed.',
  };
}
