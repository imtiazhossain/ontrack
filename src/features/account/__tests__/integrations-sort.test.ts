import type { ApiUsageServiceSnapshot } from '@/services/http/api-usage-catalog';

import {
  integrationsSortLabel,
  sortIntegrationServices,
  usageSortScore,
} from '../integrations-sort';

function row(
  id: string,
  health: ApiUsageServiceSnapshot['health'],
  name = id,
  usage?: { used: number; max: number },
): ApiUsageServiceSnapshot {
  return {
    id,
    name,
    provider: 'test',
    usedBy: ['Test'],
    metering: usage ? 'app-rate-limit' : 'unmetered',
    configured: true,
    health,
    healthLabel: health,
    healthDetail: health,
    healthLatencyMs: null,
    used: usage?.used ?? null,
    max: usage?.max ?? null,
    remaining: usage ? usage.max - usage.used : null,
    windowMs: usage ? 3_600_000 : null,
    note: '',
  };
}

describe('sortIntegrationServices', () => {
  const rows = [
    row('z-healthy', 'healthy', 'Zulu'),
    row('a-down', 'down', 'Alpha'),
    row('m-degraded', 'degraded', 'Mike'),
    row('u-unconfigured', 'unconfigured', 'Uniform'),
  ];

  it('sorts unhealthy first', () => {
    expect(sortIntegrationServices(rows, 'status-worst').map((item) => item.id)).toEqual([
      'a-down',
      'm-degraded',
      'u-unconfigured',
      'z-healthy',
    ]);
  });

  it('sorts healthy first', () => {
    expect(sortIntegrationServices(rows, 'status-healthy').map((item) => item.id)).toEqual([
      'z-healthy',
      'u-unconfigured',
      'm-degraded',
      'a-down',
    ]);
  });

  it('sorts by name', () => {
    expect(sortIntegrationServices(rows, 'name').map((item) => item.name)).toEqual([
      'Alpha',
      'Mike',
      'Uniform',
      'Zulu',
    ]);
  });

  it('sorts by usage ratio (most consumed first)', () => {
    const usageRows = [
      row('low', 'healthy', 'Low', { used: 1, max: 40 }),
      row('high', 'healthy', 'High', { used: 30, max: 40 }),
      row('mid', 'healthy', 'Mid', { used: 10, max: 40 }),
      row('none', 'healthy', 'None'),
    ];
    expect(sortIntegrationServices(usageRows, 'usage').map((item) => item.id)).toEqual([
      'high',
      'mid',
      'low',
      'none',
    ]);
  });

  it('exposes short dropdown labels', () => {
    expect(integrationsSortLabel('status-worst')).toBe('Unhealthy');
    expect(integrationsSortLabel('status-healthy')).toBe('Healthy');
    expect(integrationsSortLabel('name')).toBe('A–Z');
    expect(integrationsSortLabel('usage')).toBe('Usage');
  });

  it('scores unmetered usage last', () => {
    expect(usageSortScore(row('x', 'healthy'))).toBe(-1);
    expect(usageSortScore(row('y', 'healthy', 'Y', { used: 5, max: 10 }))).toBe(0.5);
  });
});
