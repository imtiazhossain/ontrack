import { apiRateLimitSubject, authenticateApiRequest } from './api-auth';
import { buildServiceHealthMap } from './api-health';
import { peekAllApiRateLimits, type ApiRateLimitPeek } from './api-rate-limit';
import {
  API_USAGE_CATALOG,
  resolveApiUsageConfigured,
  type ApiServiceHealth,
  type ApiUsageMetering,
  type ApiUsageSnapshot,
} from './api-usage-catalog';

function windowLabel(windowMs: number): string {
  const hours = windowMs / (60 * 60 * 1000);
  if (hours === 1) return 'this hour';
  if (Number.isInteger(hours)) return `per ${hours}h`;
  const minutes = Math.round(windowMs / 60_000);
  return `per ${minutes}m`;
}

function usageNote(
  metering: ApiUsageMetering,
  peek: ApiRateLimitPeek | undefined,
  limitNote: string | undefined,
): string {
  const parts: string[] = [];
  if (peek) {
    parts.push(
      `${peek.used} used · ${peek.remaining} left of ${peek.max} ${windowLabel(peek.windowMs)}`,
    );
  }
  if (limitNote) parts.push(limitNote);
  if (!parts.length) {
    if (metering === 'local') return 'Local — unlimited for this device.';
    if (metering === 'unmetered') return 'Not metered in-app.';
    if (metering === 'provider-account') return 'Provider account limits not tracked in-app.';
    return 'Usage unavailable.';
  }
  return parts.join(' · ');
}

function emptyHealthSummary(): Record<ApiServiceHealth, number> {
  return {
    healthy: 0,
    degraded: 0,
    down: 0,
    unconfigured: 0,
    unchecked: 0,
  };
}

/**
 * Diagnostic snapshot of third-party services + in-process app rate limits.
 * Read-only probes use free endpoints only (no paid generation calls).
 */
export async function buildApiUsageSnapshot(request: Request): Promise<ApiUsageSnapshot> {
  const auth = await authenticateApiRequest(request);
  const subject = apiRateLimitSubject(request, auth);
  const buckets = peekAllApiRateLimits(subject);

  const configuredById = Object.fromEntries(
    API_USAGE_CATALOG.map((entry) => [
      entry.id,
      resolveApiUsageConfigured(entry.configKey),
    ]),
  );
  const healthById = await buildServiceHealthMap(API_USAGE_CATALOG, configuredById);
  const healthSummary = emptyHealthSummary();

  const services = API_USAGE_CATALOG.map((entry) => {
    const peek = entry.bucket ? buckets[entry.bucket] : undefined;
    const health = healthById[entry.id]!;
    healthSummary[health.health] += 1;
    return {
      id: entry.id,
      name: entry.name,
      provider: entry.provider,
      usedBy: [...entry.usedBy],
      metering: entry.metering,
      bucket: entry.bucket,
      configured: configuredById[entry.id] ?? null,
      health: health.health,
      healthLabel: health.label,
      healthDetail: health.detail,
      healthLatencyMs: health.latencyMs,
      used: peek?.used ?? null,
      max: peek?.max ?? null,
      remaining: peek?.remaining ?? null,
      windowMs: peek?.windowMs ?? null,
      note: usageNote(entry.metering, peek, entry.limitNote),
    };
  });

  return {
    subject,
    generatedAt: new Date().toISOString(),
    buckets,
    healthSummary,
    services,
  };
}
