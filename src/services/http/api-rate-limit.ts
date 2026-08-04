/**
 * In-process sliding-window rate limits for paid Expo API routes.
 * Bounds OpenAI/TMDB/Amadeus spend per authenticated subject on each instance.
 */

export type PaidApiBucket = 'nutrition' | 'recipe' | 'plant' | 'movies' | 'flights' | 'health';

const LIMITS: Record<PaidApiBucket, { max: number; windowMs: number }> = {
  nutrition: { max: 40, windowMs: 60 * 60 * 1000 },
  recipe: { max: 25, windowMs: 60 * 60 * 1000 },
  plant: { max: 40, windowMs: 60 * 60 * 1000 },
  movies: { max: 120, windowMs: 60 * 60 * 1000 },
  flights: { max: 40, windowMs: 60 * 60 * 1000 },
  health: { max: 20, windowMs: 60 * 60 * 1000 },
};

const hitsByKey = new Map<string, number[]>();

export function checkApiRateLimit(
  bucket: PaidApiBucket,
  subject: string,
  now = Date.now(),
): 'ok' | 'limited' {
  const { max, windowMs } = LIMITS[bucket];
  const key = `${bucket}:${subject}`;
  const windowStart = now - windowMs;
  const recent = (hitsByKey.get(key) ?? []).filter((stamp) => stamp > windowStart);
  if (recent.length >= max) {
    hitsByKey.set(key, recent);
    return 'limited';
  }
  recent.push(now);
  hitsByKey.set(key, recent);
  return 'ok';
}

export function resetApiRateLimitsForTests() {
  hitsByKey.clear();
}
