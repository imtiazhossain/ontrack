export interface PlantTaxonSearchResult {
  id: string;
  commonName: string;
  scientificName: string;
  rank: string;
}

interface INaturalistTaxon {
  id?: unknown;
  name?: unknown;
  preferred_common_name?: unknown;
  rank?: unknown;
  iconic_taxon_name?: unknown;
}

const FALLBACK_PLANTS: PlantTaxonSearchResult[] = [
  { id: 'fallback-ginger', commonName: 'Ginger', scientificName: 'Zingiber officinale', rank: 'species' },
  { id: 'fallback-pothos', commonName: 'Golden pothos', scientificName: 'Epipremnum aureum', rank: 'species' },
  { id: 'fallback-snake-plant', commonName: 'Snake plant', scientificName: 'Dracaena trifasciata', rank: 'species' },
  { id: 'fallback-monstera', commonName: 'Swiss cheese plant', scientificName: 'Monstera deliciosa', rank: 'species' },
  { id: 'fallback-spider-plant', commonName: 'Spider plant', scientificName: 'Chlorophytum comosum', rank: 'species' },
  { id: 'fallback-rubber-plant', commonName: 'Rubber plant', scientificName: 'Ficus elastica', rank: 'species' },
  { id: 'fallback-peace-lily', commonName: 'Peace lily', scientificName: 'Spathiphyllum wallisii', rank: 'species' },
  { id: 'fallback-aloe', commonName: 'Aloe vera', scientificName: 'Aloe vera', rank: 'species' },
];

function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function score(result: PlantTaxonSearchResult, query: string): number {
  const normalized = query.trim().toLocaleLowerCase();
  const common = result.commonName.toLocaleLowerCase();
  const scientific = result.scientificName.toLocaleLowerCase();
  if (common === normalized) return 0;
  if (scientific === normalized) return 1;
  if (common.startsWith(normalized)) return 2;
  if (scientific.startsWith(normalized)) return 3;
  if (common.includes(normalized)) return 4;
  return 5;
}

export function normalizePlantTaxa(value: unknown, query: string, limit = 8): PlantTaxonSearchResult[] {
  const records = typeof value === 'object' && value !== null && Array.isArray((value as { results?: unknown }).results)
    ? (value as { results: unknown[] }).results
    : [];
  const unique = new Map<string, PlantTaxonSearchResult>();

  for (const candidate of records) {
    if (typeof candidate !== 'object' || candidate === null) continue;
    const taxon = candidate as INaturalistTaxon;
    if (taxon.iconic_taxon_name !== 'Plantae' || !text(taxon.name) || !text(taxon.rank)) continue;
    if (!['species', 'subspecies', 'variety', 'hybrid', 'genus'].includes(taxon.rank)) continue;
    const scientificName = taxon.name.trim();
    unique.set(scientificName.toLocaleLowerCase(), {
      id: String(taxon.id ?? scientificName),
      commonName: text(taxon.preferred_common_name) ? taxon.preferred_common_name.trim() : scientificName,
      scientificName,
      rank: taxon.rank,
    });
  }

  return [...unique.values()]
    .sort((left, right) => score(left, query) - score(right, query)
      || left.commonName.localeCompare(right.commonName))
    .slice(0, limit);
}

export function fallbackPlantTaxa(query: string, limit = 8): PlantTaxonSearchResult[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (normalized.length < 2) return [];
  return FALLBACK_PLANTS
    .filter((plant) => plant.commonName.toLocaleLowerCase().includes(normalized)
      || plant.scientificName.toLocaleLowerCase().includes(normalized))
    .sort((left, right) => score(left, query) - score(right, query))
    .slice(0, limit);
}

export async function searchPlantTaxa(query: string): Promise<PlantTaxonSearchResult[]> {
  const fallback = fallbackPlantTaxa(query);
  const url = new URL('https://api.inaturalist.org/v1/taxa/autocomplete');
  url.searchParams.set('q', query);
  url.searchParams.set('is_active', 'true');
  url.searchParams.set('locale', 'en');
  url.searchParams.set('per_page', '30');

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return fallback;
    const remote = normalizePlantTaxa(await response.json(), query);
    const combined = new Map<string, PlantTaxonSearchResult>();
    for (const result of [...remote, ...fallback]) {
      combined.set(result.scientificName.toLocaleLowerCase(), result);
    }
    return [...combined.values()]
      .sort((left, right) => score(left, query) - score(right, query)
        || left.commonName.localeCompare(right.commonName))
      .slice(0, 8);
  } catch {
    return fallback;
  }
}
