import type {
    ApiHealthProbe,
    ApiServiceHealth,
    ApiUsageCatalogEntry,
} from './api-usage-catalog';
import { peekDependencyGuards, type DependencyGuardPeek } from './dependency-guard';

/** Keep in sync with `DESTINATION_COVER_UA` in destination-cover-lookup.ts. */
const DESTINATION_COVER_UA =
  'onTrack/1.0 (travel destination covers; https://ontrack.app)';

export type ApiServiceHealthDetail = {
  health: ApiServiceHealth;
  label: string;
  detail: string;
  latencyMs: number | null;
};

const PROBE_TIMEOUT_MS = 4_500;

type ProbeResult = { ok: boolean; latencyMs: number | null; detail?: string };

async function probeHttp(
  url: string,
  options?: {
    method?: 'GET' | 'POST';
    okStatuses?: readonly number[];
    headers?: Record<string, string>;
    body?: string;
  },
): Promise<{ ok: boolean; latencyMs: number; status?: number }> {
  const okStatuses = options?.okStatuses ?? [200, 204];
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: options?.method ?? 'GET',
      signal: controller.signal,
      headers: options?.headers,
      body: options?.body,
    });
    return {
      ok: okStatuses.includes(response.status),
      latencyMs: Date.now() - started,
      status: response.status,
    };
  } catch {
    return { ok: false, latencyMs: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

function probeDetail(
  result: { ok: boolean; latencyMs: number; status?: number },
  okLabel: string,
  failLabel: string,
): ProbeResult {
  if (result.ok) {
    return {
      ok: true,
      latencyMs: result.latencyMs,
      detail: `${okLabel} in ${result.latencyMs}ms`,
    };
  }
  return {
    ok: false,
    latencyMs: result.latencyMs,
    detail: result.status ? `${failLabel} HTTP ${result.status}` : failLabel,
  };
}

async function probeAny(
  urls: readonly { url: string; headers?: Record<string, string>; okStatuses?: readonly number[] }[],
  okLabel: string,
): Promise<ProbeResult> {
  let last: ProbeResult | undefined;
  for (const item of urls) {
    const result = await probeHttp(item.url, {
      headers: item.headers,
      okStatuses: item.okStatuses,
    });
    const mapped = probeDetail(result, okLabel, 'Probe failed');
    if (mapped.ok) return mapped;
    last = mapped;
  }
  return last ?? { ok: false, latencyMs: null, detail: 'Probe failed' };
}

async function runTypedProbe(probe: ApiHealthProbe): Promise<ProbeResult | undefined> {
  switch (probe.kind) {
    case 'ollama': {
      const base = (process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
      return probeDetail(
        await probeHttp(`${base}/api/tags`, {
          headers: { Accept: 'application/json' },
        }),
        'Ollama reachable',
        'Local Ollama did not respond',
      );
    }
    case 'supabase': {
      const url =
        process.env.SUPABASE_URL?.trim() || process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
      const key =
        process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
        process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
      if (!url || !key) {
        return { ok: false, latencyMs: null, detail: 'Missing Supabase env' };
      }
      const base = url.replace(/\/$/, '');
      const headers = { apikey: key, Authorization: `Bearer ${key}` };
      return probeAny(
        [
          { url: `${base}/auth/v1/health`, headers },
          {
            url: `${base}/rest/v1/`,
            headers: { ...headers, Accept: 'application/json' },
            okStatuses: [200, 404],
          },
        ],
        'Supabase reachable',
      );
    }
    case 'openai': {
      const key = process.env.OPENAI_API_KEY?.trim();
      if (!key) return { ok: false, latencyMs: null, detail: 'Missing OPENAI_API_KEY' };
      return probeDetail(
        await probeHttp('https://api.openai.com/v1/models', {
          headers: {
            Authorization: `Bearer ${key}`,
            Accept: 'application/json',
          },
        }),
        'OpenAI models OK',
        'OpenAI probe failed',
      );
    }
    case 'gemini': {
      const key = process.env.GEMINI_API_KEY?.trim();
      if (!key) return { ok: false, latencyMs: null, detail: 'Missing GEMINI_API_KEY' };
      return probeDetail(
        await probeHttp(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
          { headers: { Accept: 'application/json' } },
        ),
        'Gemini models OK',
        'Gemini probe failed',
      );
    }
    case 'tmdb': {
      const token = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
      if (!token) {
        return { ok: false, latencyMs: null, detail: 'Missing TMDB_READ_ACCESS_TOKEN' };
      }
      return probeDetail(
        await probeHttp('https://api.themoviedb.org/3/configuration', {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }),
        'TMDB configuration OK',
        'TMDB probe failed',
      );
    }
    case 'usda': {
      const key = process.env.USDA_FDC_API_KEY?.trim();
      if (!key) return { ok: false, latencyMs: null, detail: 'Missing USDA_FDC_API_KEY' };
      // Match nutrition server: POST /foods/search (not generation; pageSize 1).
      return probeDetail(
        await probeHttp(
          `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(key)}`,
          {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: 'apple', pageSize: 1 }),
          },
        ),
        'USDA FDC OK',
        'USDA probe failed',
      );
    }
    case 'amadeus': {
      const clientId = process.env.AMADEUS_CLIENT_ID?.trim();
      const clientSecret = process.env.AMADEUS_CLIENT_SECRET?.trim();
      if (!clientId || !clientSecret) {
        return { ok: false, latencyMs: null, detail: 'Missing Amadeus credentials' };
      }
      const host =
        process.env.AMADEUS_ENVIRONMENT === 'production'
          ? 'https://api.amadeus.com'
          : 'https://test.api.amadeus.com';
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }).toString();
      return probeDetail(
        await probeHttp(`${host}/v1/security/oauth2/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body,
        }),
        'Amadeus token OK',
        'Amadeus auth probe failed',
      );
    }
    case 'destination-cover': {
      const headers = {
        Accept: 'application/json',
        'Api-User-Agent': DESTINATION_COVER_UA,
        'User-Agent': DESTINATION_COVER_UA,
      };
      return probeAny(
        [
          {
            url: `https://unsplash.com/napi/search/photos?${new URLSearchParams({
              query: 'Reykjavik',
              per_page: '1',
            }).toString()}`,
            headers,
          },
          {
            url: 'https://en.wikipedia.org/api/rest_v1/page/summary/Reykjavik',
            headers,
          },
        ],
        'Cover lookup OK',
      );
    }
    case 'http': {
      if (!probe.url) return undefined;
      const urls = [
        { url: probe.url, headers: probe.headers, okStatuses: probe.okStatuses },
        ...(probe.fallbackUrls ?? []).map((url) => ({
          url,
          headers: probe.headers,
          okStatuses: probe.okStatuses,
        })),
      ];
      if (urls.length === 1) {
        return probeDetail(
          await probeHttp(probe.url, {
            okStatuses: probe.okStatuses,
            headers: probe.headers,
          }),
          'Probe OK',
          'Probe failed',
        );
      }
      return probeAny(urls, 'Probe OK');
    }
    default:
      return undefined;
  }
}

function probeCacheKey(probe: ApiHealthProbe): string {
  if (probe.kind === 'http') return `http:${probe.url ?? ''}`;
  return probe.kind;
}

async function runProbe(
  entry: ApiUsageCatalogEntry,
  cache: Map<string, Promise<ProbeResult | undefined>>,
): Promise<ProbeResult | undefined> {
  const probe = entry.healthProbe;
  if (!probe) return undefined;
  const key = probeCacheKey(probe);
  const existing = cache.get(key);
  if (existing) return existing;
  const pending = runTypedProbe(probe);
  cache.set(key, pending);
  return pending;
}

function worstGuard(
  names: readonly string[] | undefined,
  guards: Record<string, DependencyGuardPeek>,
): DependencyGuardPeek | undefined {
  if (!names?.length) return undefined;
  let worst: DependencyGuardPeek | undefined;
  for (const name of names) {
    const peek = guards[name];
    if (!peek) continue;
    if (!worst) {
      worst = peek;
      continue;
    }
    const rank = (g: DependencyGuardPeek) =>
      g.status === 'open' ? 2 : g.consecutiveFailures > 0 ? 1 : 0;
    if (rank(peek) > rank(worst)) worst = peek;
  }
  return worst;
}

export function resolveServiceHealth(input: {
  configured: boolean | null;
  guard?: DependencyGuardPeek;
  probe?: ProbeResult;
}): ApiServiceHealthDetail {
  const { configured, guard, probe } = input;

  if (configured === false) {
    return {
      health: 'unconfigured',
      label: 'Unconfigured',
      detail: 'Missing API credentials on this Metro host.',
      latencyMs: null,
    };
  }

  if (guard?.status === 'open') {
    return {
      health: 'down',
      label: 'Circuit open',
      detail: `Provider failures tripped the guard${
        guard.openForMs > 0 ? ` · reopens in ${Math.ceil(guard.openForMs / 1000)}s` : ''
      }.`,
      latencyMs: probe?.latencyMs ?? null,
    };
  }

  if (probe && !probe.ok) {
    return {
      health: 'down',
      label: 'Unreachable',
      detail: probe.detail ?? 'Health probe failed.',
      latencyMs: probe.latencyMs,
    };
  }

  if (guard && guard.consecutiveFailures > 0) {
    return {
      health: 'degraded',
      label: 'Degraded',
      detail: `${guard.consecutiveFailures} recent failure${
        guard.consecutiveFailures === 1 ? '' : 's'
      }${probe?.detail ? ` · ${probe.detail}` : ''}.`,
      latencyMs: probe?.latencyMs ?? null,
    };
  }

  if (probe?.ok || configured === true) {
    return {
      health: 'healthy',
      label: 'Healthy',
      detail: probe?.detail ?? 'Configured · no open circuit.',
      latencyMs: probe?.latencyMs ?? null,
    };
  }

  if (probe === undefined && configured === null) {
    return {
      health: 'unchecked',
      label: 'Unchecked',
      detail: 'No credentials check or live probe for this provider.',
      latencyMs: null,
    };
  }

  return {
    health: 'healthy',
    label: 'Healthy',
    detail: 'No open circuit on this Metro instance.',
    latencyMs: null,
  };
}

export async function buildServiceHealthMap(
  entries: readonly ApiUsageCatalogEntry[],
  configuredById: Record<string, boolean | null>,
): Promise<Record<string, ApiServiceHealthDetail>> {
  const guardNames = Array.from(
    new Set(entries.flatMap((entry) => entry.guardNames ?? [])),
  );
  const guards = peekDependencyGuards(guardNames);
  const cache = new Map<string, Promise<ProbeResult | undefined>>();

  const probeResults = await Promise.all(
    entries.map(async (entry) => {
      if (configuredById[entry.id] === false) {
        return [entry.id, undefined] as const;
      }
      return [entry.id, await runProbe(entry, cache)] as const;
    }),
  );
  const probes = Object.fromEntries(probeResults);

  return Object.fromEntries(
    entries.map((entry) => [
      entry.id,
      resolveServiceHealth({
        configured: configuredById[entry.id] ?? null,
        guard: worstGuard(entry.guardNames, guards),
        probe: probes[entry.id],
      }),
    ]),
  );
}
