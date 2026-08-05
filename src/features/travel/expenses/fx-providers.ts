import { normalizeCurrencyCode } from '@/features/travel/expenses/format-money';
import { fetchWithTimeout } from '@/services/http/fetch-with-timeout';

/**
 * Flip {@link ACTIVE_FX_PROVIDER} to switch the live FX feed.
 * Keep parsers/fetchers registered in {@link FX_PROVIDERS}.
 */
export type FxProviderId = 'currency-api' | 'frankfurter';

/** Active market feed — closest free match to Google/Morningstar today. */
export const ACTIVE_FX_PROVIDER: FxProviderId = 'currency-api';

export type FxProviderRates = {
  date: string;
  base: string;
  rates: Record<string, number>;
};

export type FxProvider = {
  id: FxProviderId;
  /** Short label shown in the currency sheet (e.g. "Market", "Frankfurter"). */
  label: string;
  fetchLatest: (signal?: AbortSignal) => Promise<FxProviderRates | undefined>;
};

type FrankfurterLatest = {
  date?: string;
  base?: string;
  rates?: Record<string, number>;
};

type CurrencyApiUsdLatest = {
  date?: string;
  usd?: Record<string, number>;
};

function sanitizeRates(base: string, rates: Record<string, number>): Record<string, number> {
  const next: Record<string, number> = { [base]: 1 };
  for (const [code, rate] of Object.entries(rates)) {
    const normalized = normalizeCurrencyCode(code, '');
    if (!normalized || !Number.isFinite(rate) || rate <= 0) continue;
    next[normalized] = rate;
  }
  return next;
}

/** Frankfurter / ECB official daily table. */
export function parseFrankfurterLatest(payload: unknown): FxProviderRates | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const body = payload as FrankfurterLatest;
  const base = normalizeCurrencyCode(body.base, '');
  if (!base || !body.rates || typeof body.rates !== 'object') return undefined;
  const rates = sanitizeRates(base, body.rates);
  if (Object.keys(rates).length < 2) return undefined;
  return {
    date: typeof body.date === 'string' ? body.date : new Date().toISOString().slice(0, 10),
    base,
    rates,
  };
}

/**
 * @fawazahmed0/currency-api USD table (jsDelivr / Cloudflare Pages).
 * Payload shape: `{ date, usd: { isk: 123.2, eur: 0.87, ... } }` (lowercase codes).
 */
export function parseCurrencyApiUsdLatest(payload: unknown): FxProviderRates | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const body = payload as CurrencyApiUsdLatest;
  if (!body.usd || typeof body.usd !== 'object') return undefined;
  const rates = sanitizeRates('USD', body.usd);
  if (Object.keys(rates).length < 2) return undefined;
  return {
    date: typeof body.date === 'string' ? body.date : new Date().toISOString().slice(0, 10),
    base: 'USD',
    rates,
  };
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetchWithTimeout(url, { signal });
  if (!response.ok) return undefined;
  return response.json();
}

const CURRENCY_API_URLS = [
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
  'https://latest.currency-api.pages.dev/v1/currencies/usd.json',
] as const;

async function fetchCurrencyApiLatest(signal?: AbortSignal): Promise<FxProviderRates | undefined> {
  for (const url of CURRENCY_API_URLS) {
    try {
      const json = await fetchJson(url, signal);
      const parsed = parseCurrencyApiUsdLatest(json);
      if (parsed) return parsed;
    } catch {
      // try fallback host
    }
  }
  return undefined;
}

async function fetchFrankfurterLatest(signal?: AbortSignal): Promise<FxProviderRates | undefined> {
  const json = await fetchJson('https://api.frankfurter.dev/v1/latest?base=USD', signal);
  return parseFrankfurterLatest(json);
}

export const FX_PROVIDERS: Record<FxProviderId, FxProvider> = {
  'currency-api': {
    id: 'currency-api',
    label: 'Market',
    fetchLatest: fetchCurrencyApiLatest,
  },
  frankfurter: {
    id: 'frankfurter',
    label: 'Frankfurter',
    fetchLatest: fetchFrankfurterLatest,
  },
};

export function getActiveFxProvider(): FxProvider {
  return FX_PROVIDERS[ACTIVE_FX_PROVIDER];
}
