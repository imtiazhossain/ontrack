import {
  DependencyUnavailableError,
  guardedFetch,
  resetDependencyGuardsForTests,
} from '../dependency-guard';

describe('guardedFetch', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    resetDependencyGuardsForTests();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('opens after repeated failures and fast-fails without another request', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response('provider failure', { status: 503 }),
    );
    const options = {
      timeoutMs: 1_000,
      maxConcurrency: 2,
      failureThreshold: 2,
      cooldownMs: 30_000,
    };

    await guardedFetch('provider', 'https://example.test', {}, options);
    await guardedFetch('provider', 'https://example.test', {}, options);
    await expect(
      guardedFetch('provider', 'https://example.test', {}, options),
    ).rejects.toMatchObject<Partial<DependencyUnavailableError>>({
      reason: 'circuit-open',
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('admits one recovery probe after cooldown and closes on success', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(new Response('failure', { status: 503 }))
      .mockResolvedValueOnce(new Response('failure', { status: 503 }))
      .mockResolvedValue(new Response('ok'));
    const options = {
      timeoutMs: 1_000,
      maxConcurrency: 2,
      failureThreshold: 2,
      cooldownMs: 30_000,
    };

    await guardedFetch('provider', 'https://example.test', {}, options);
    await guardedFetch('provider', 'https://example.test', {}, options);
    now.mockReturnValue(31_001);
    await expect(
      guardedFetch('provider', 'https://example.test', {}, options),
    ).resolves.toHaveProperty('status', 200);
    await expect(
      guardedFetch('provider', 'https://example.test', {}, options),
    ).resolves.toHaveProperty('status', 200);
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  it('rejects excess concurrency while an allowed request is running', async () => {
    let finish!: (response: Response) => void;
    global.fetch = jest.fn(
      () => new Promise<Response>((resolve) => {
        finish = resolve;
      }),
    );
    const options = { timeoutMs: 1_000, maxConcurrency: 1 };
    const first = guardedFetch('provider', 'https://example.test', {}, options);

    await expect(
      guardedFetch('provider', 'https://example.test', {}, options),
    ).rejects.toMatchObject<Partial<DependencyUnavailableError>>({
      reason: 'concurrency-limit',
    });
    finish(new Response('ok'));
    await expect(first).resolves.toBeInstanceOf(Response);
  });
});
