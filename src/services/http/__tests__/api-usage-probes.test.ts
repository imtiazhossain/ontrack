import { API_USAGE_CATALOG } from '../api-usage-catalog';

const TYPED_KINDS = new Set([
  'ollama',
  'supabase',
  'openai',
  'gemini',
  'tmdb',
  'usda',
  'amadeus',
  'destination-cover',
]);

describe('API_USAGE_CATALOG health probes', () => {
  it('uses production-shaped probes for every probed service', () => {
    for (const entry of API_USAGE_CATALOG) {
      const probe = entry.healthProbe;
      if (!probe) continue;
      if (probe.kind === 'http') {
        expect(probe.url).toMatch(/^https:\/\//);
        expect(probe.headers?.Accept).toBeTruthy();
      } else {
        expect(TYPED_KINDS.has(probe.kind)).toBe(true);
      }
    }
  });

  it('covers credentialed providers with non-generation probes', () => {
    const byId = Object.fromEntries(API_USAGE_CATALOG.map((entry) => [entry.id, entry]));
    expect(byId['openai-nutrition']?.healthProbe?.kind).toBe('openai');
    expect(byId.gemini?.healthProbe?.kind).toBe('gemini');
    expect(byId.tmdb?.healthProbe?.kind).toBe('tmdb');
    expect(byId['usda-fdc']?.healthProbe?.kind).toBe('usda');
    expect(byId.amadeus?.healthProbe?.kind).toBe('amadeus');
    expect(byId['destination-cover']?.healthProbe?.kind).toBe('destination-cover');
    expect(byId.nhtsa?.healthProbe?.url).toContain('DecodeVinValues');
    expect(byId.iconify?.healthProbe?.url).toContain('/search?');
    expect(byId['open-meteo']?.healthProbe?.url).toContain('geocoding-api.open-meteo.com');
    expect(byId['avs-logos']?.healthProbe?.url).toContain('/96/96/');
    expect(byId['currency-api']?.healthProbe?.fallbackUrls?.[0]).toContain(
      'currency-api.pages.dev',
    );
    expect(byId.aerodatabox?.healthProbe).toBeUndefined();
    expect(byId['apple-google-auth']?.healthProbe).toBeUndefined();
    expect(byId['apple-google-auth']?.configKey).toBe('apple-google-auth');
  });
});
