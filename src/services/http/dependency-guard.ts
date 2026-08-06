export interface DependencyGuardOptions {
  timeoutMs: number;
  maxConcurrency: number;
  failureThreshold?: number;
  cooldownMs?: number;
}

type RejectionReason = 'circuit-open' | 'concurrency-limit' | 'timeout';

export class DependencyUnavailableError extends Error {
  constructor(
    readonly dependency: string,
    readonly reason: RejectionReason,
  ) {
    super(
      reason === 'timeout'
        ? `${dependency} timed out.`
        : `${dependency} is temporarily unavailable.`,
    );
    this.name = 'DependencyUnavailableError';
  }
}

interface CircuitState {
  active: number;
  consecutiveFailures: number;
  openedUntil: number;
  probeInFlight: boolean;
}

const circuits = new Map<string, CircuitState>();

function stateFor(dependency: string): CircuitState {
  const existing = circuits.get(dependency);
  if (existing) return existing;
  const created: CircuitState = {
    active: 0,
    consecutiveFailures: 0,
    openedUntil: 0,
    probeInFlight: false,
  };
  circuits.set(dependency, created);
  return created;
}

function recordsFailure(response: Response): boolean {
  return response.status === 408 || response.status === 429 || response.status >= 500;
}

function markFailure(
  state: CircuitState,
  failureThreshold: number,
  cooldownMs: number,
) {
  state.consecutiveFailures += 1;
  if (state.consecutiveFailures >= failureThreshold) {
    state.openedUntil = Date.now() + cooldownMs;
  }
}

/**
 * A per-server-instance circuit breaker and bulkhead for external HTTP calls.
 * It bounds latency and concurrency, opens after consecutive provider
 * failures, and admits only one recovery probe after the cooldown.
 */
export async function guardedFetch(
  dependency: string,
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: DependencyGuardOptions,
): Promise<Response> {
  const state = stateFor(dependency);
  const failureThreshold = options.failureThreshold ?? 3;
  const cooldownMs = options.cooldownMs ?? 30_000;
  const now = Date.now();
  const halfOpen = state.openedUntil > 0 && state.openedUntil <= now;

  if (state.openedUntil > now || (halfOpen && state.probeInFlight)) {
    throw new DependencyUnavailableError(dependency, 'circuit-open');
  }
  if (!halfOpen && state.active >= options.maxConcurrency) {
    throw new DependencyUnavailableError(dependency, 'concurrency-limit');
  }
  if (halfOpen) state.probeInFlight = true;
  state.active += 1;

  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(init.signal?.reason);
  if (init.signal?.aborted) abortFromCaller();
  else init.signal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs);

  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    if (recordsFailure(response)) {
      markFailure(state, failureThreshold, cooldownMs);
    } else {
      state.consecutiveFailures = 0;
      state.openedUntil = 0;
    }
    return response;
  } catch (error) {
    if (!init.signal?.aborted) markFailure(state, failureThreshold, cooldownMs);
    if (timedOut) {
      throw new DependencyUnavailableError(dependency, 'timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    init.signal?.removeEventListener('abort', abortFromCaller);
    state.active -= 1;
    if (halfOpen) state.probeInFlight = false;
  }
}

export type DependencyGuardPeek = {
  dependency: string;
  active: number;
  consecutiveFailures: number;
  /** Milliseconds until the circuit closes; 0 when closed. */
  openForMs: number;
  status: 'closed' | 'open' | 'half-open';
};

/** Read circuit state without recording traffic. */
export function peekDependencyGuard(
  dependency: string,
  now = Date.now(),
): DependencyGuardPeek {
  const state = circuits.get(dependency) ?? {
    active: 0,
    consecutiveFailures: 0,
    openedUntil: 0,
    probeInFlight: false,
  };
  const openForMs = Math.max(0, state.openedUntil - now);
  const status =
    openForMs > 0 ? 'open' : state.openedUntil > 0 ? 'half-open' : 'closed';
  return {
    dependency,
    active: state.active,
    consecutiveFailures: state.consecutiveFailures,
    openForMs,
    status,
  };
}

export function peekDependencyGuards(
  dependencies: readonly string[],
  now = Date.now(),
): Record<string, DependencyGuardPeek> {
  return Object.fromEntries(
    dependencies.map((dependency) => [dependency, peekDependencyGuard(dependency, now)]),
  );
}

export function resetDependencyGuardsForTests() {
  circuits.clear();
}
