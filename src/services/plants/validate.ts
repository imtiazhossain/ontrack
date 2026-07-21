import type {
  PlacementRecommendation,
  PlantCarePlan,
  PlantCareSource,
  PlantHealthAssessment,
  PlantIdentity,
  PruningRecommendation,
  WateringRecommendation,
} from '@/types/models';

export const PLANT_IDENTIFICATION_THRESHOLD = 0.8;

function object(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : undefined;
}

function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function number(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function strings(value: unknown, max = 8): value is string[] {
  return Array.isArray(value) && value.length <= max && value.every(text);
}

export function validatePlantIdentity(value: unknown): PlantIdentity | null {
  const item = object(value);
  if (!item || !text(item.commonName) || !text(item.scientificName) || !number(item.confidence, 0, 1)) {
    return null;
  }
  if (item.identificationSource !== undefined && !['ai', 'user-confirmed', 'user-corrected'].includes(String(item.identificationSource))) {
    return null;
  }
  return {
    commonName: item.commonName.trim(),
    scientificName: item.scientificName.trim(),
    confidence: item.confidence,
    identificationSource: (item.identificationSource as PlantIdentity['identificationSource']) ?? 'ai',
  };
}

export function hasConfidentPlantIdentity(identity: PlantIdentity): boolean {
  return identity.confidence >= PLANT_IDENTIFICATION_THRESHOLD;
}

export function canUsePlantIdentityForCare(identity: PlantIdentity): boolean {
  return identity.identificationSource === 'user-confirmed'
    || identity.identificationSource === 'user-corrected';
}

export function validatePlantHealth(value: unknown, assessedAt = new Date().toISOString()): PlantHealthAssessment | null {
  const item = object(value);
  if (!item || !['healthy', 'watch', 'urgent'].includes(String(item.status))) return null;
  if (!text(item.summary) || !strings(item.visibleSigns) || !strings(item.possibleCauses)) return null;
  if (!strings(item.actions) || !number(item.confidence, 0, 1)) return null;
  return { ...(item as unknown as PlantHealthAssessment), assessedAt };
}

function validateWatering(value: unknown): WateringRecommendation | null {
  const item = object(value);
  if (!item || !number(item.minMl, 1, 20_000) || !number(item.maxMl, 1, 20_000)) return null;
  if (item.maxMl < item.minMl || !number(item.intervalDays, 1, 365)) return null;
  if (!text(item.soilCheck) || !text(item.notes)) return null;
  return item as unknown as WateringRecommendation;
}

function validatePruning(value: unknown): PruningRecommendation | null {
  const item = object(value);
  if (!item || !['not-needed', 'soon', 'now'].includes(String(item.urgency))) return null;
  if (!text(item.reason) || !strings(item.steps)) return null;
  return item as unknown as PruningRecommendation;
}

function validatePlacement(value: unknown): PlacementRecommendation | null {
  const item = object(value);
  if (!item || !text(item.light) || !text(item.location) || !text(item.windowDistance) || !strings(item.avoid)) {
    return null;
  }
  return item as unknown as PlacementRecommendation;
}

function validateSources(value: unknown): PlantCareSource[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 6) return null;
  const sources = value.flatMap((candidate): PlantCareSource[] => {
    const source = object(candidate);
    if (!source || !text(source.title) || !text(source.url)) return [];
    try {
      const url = new URL(source.url);
      if (url.protocol !== 'https:') return [];
      return [{ title: source.title.trim(), url: url.toString() }];
    } catch {
      return [];
    }
  });
  return sources.length === value.length ? sources : null;
}

export function validatePlantCarePlan(value: unknown, generatedAt = new Date().toISOString()): PlantCarePlan | null {
  const item = object(value);
  if (!item) return null;
  const watering = validateWatering(item.watering);
  const pruning = validatePruning(item.pruning);
  const placement = validatePlacement(item.placement);
  const sources = validateSources(item.sources);
  if (!watering || !pruning || !placement || !sources || !text(item.disclaimer)) return null;
  return { watering, pruning, placement, sources, disclaimer: item.disclaimer, generatedAt };
}
