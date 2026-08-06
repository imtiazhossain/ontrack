import type { ApiServiceHealth, ApiUsageServiceSnapshot } from '@/services/http/api-usage-catalog';

export type IntegrationsSortMode = 'status-worst' | 'status-healthy' | 'name' | 'usage';

export const INTEGRATIONS_SORT_OPTIONS: readonly {
  value: IntegrationsSortMode;
  label: string;
}[] = [
  { value: 'status-worst', label: 'Unhealthy' },
  { value: 'status-healthy', label: 'Healthy' },
  { value: 'name', label: 'A–Z' },
  { value: 'usage', label: 'Usage' },
] as const;

export function integrationsSortLabel(mode: IntegrationsSortMode): string {
  return INTEGRATIONS_SORT_OPTIONS.find((option) => option.value === mode)?.label ?? 'Unhealthy';
}

export function integrationsSortSectionTitle(mode: IntegrationsSortMode): string {
  switch (mode) {
    case 'status-healthy':
      return 'By health (healthy first)';
    case 'name':
      return 'All services';
    case 'usage':
      return 'By usage (most used first)';
    default:
      return 'By health (unhealthy first)';
  }
}

const HEALTH_RANK: Record<ApiServiceHealth, number> = {
  down: 0,
  degraded: 1,
  unconfigured: 2,
  unchecked: 3,
  healthy: 4,
};

export function healthSortRank(health: ApiServiceHealth): number {
  return HEALTH_RANK[health];
}

/** Higher = more quota consumed. Unmetered / unknown → -1 (sorts last). */
export function usageSortScore(service: ApiUsageServiceSnapshot): number {
  if (service.used == null || service.max == null || service.max <= 0) return -1;
  return service.used / service.max;
}

export function sortIntegrationServices(
  services: readonly ApiUsageServiceSnapshot[],
  mode: IntegrationsSortMode,
): ApiUsageServiceSnapshot[] {
  const next = [...services];
  next.sort((a, b) => {
    if (mode === 'name') {
      return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    }
    if (mode === 'usage') {
      const scoreCmp = usageSortScore(b) - usageSortScore(a);
      if (scoreCmp !== 0) return scoreCmp;
      const usedCmp = (b.used ?? -1) - (a.used ?? -1);
      if (usedCmp !== 0) return usedCmp;
      return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
    }
    const rankA = healthSortRank(a.health);
    const rankB = healthSortRank(b.health);
    const rankCmp = mode === 'status-worst' ? rankA - rankB : rankB - rankA;
    if (rankCmp !== 0) return rankCmp;
    return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
  });
  return next;
}
