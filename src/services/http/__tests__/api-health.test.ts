import { resolveServiceHealth } from '../api-health';

describe('resolveServiceHealth', () => {
  it('marks missing credentials as unconfigured', () => {
    const detail = resolveServiceHealth({ configured: false });
    expect(detail.health).toBe('unconfigured');
    expect(detail.label).toBe('Unconfigured');
  });

  it('marks credentialed providers without a live probe as healthy', () => {
    const detail = resolveServiceHealth({ configured: true });
    expect(detail.health).toBe('healthy');
    expect(detail.label).toBe('Healthy');
  });

  it('marks open circuits as down', () => {
    const detail = resolveServiceHealth({
      configured: true,
      guard: {
        dependency: 'openai',
        active: 0,
        consecutiveFailures: 3,
        openForMs: 12_000,
        status: 'open',
      },
    });
    expect(detail.health).toBe('down');
    expect(detail.label).toBe('Circuit open');
  });

  it('marks failed probes as down and recent failures as degraded', () => {
    expect(
      resolveServiceHealth({
        configured: true,
        probe: { ok: false, latencyMs: 40, detail: 'Probe timed out' },
      }).health,
    ).toBe('down');

    expect(
      resolveServiceHealth({
        configured: true,
        guard: {
          dependency: 'amadeus',
          active: 0,
          consecutiveFailures: 1,
          openForMs: 0,
          status: 'closed',
        },
      }).health,
    ).toBe('degraded');
  });

  it('marks configured services with a successful probe as healthy', () => {
    expect(
      resolveServiceHealth({
        configured: true,
        probe: { ok: true, latencyMs: 22, detail: 'Probe OK in 22ms' },
      }),
    ).toMatchObject({ health: 'healthy', label: 'Healthy' });
  });
});
