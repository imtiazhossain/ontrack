import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalizeCurrencyCode } from './format-money';
import {
  ACTIVE_FX_PROVIDER,
  getActiveFxProvider,
  type FxProviderId,
  parseCurrencyApiUsdLatest,
  parseFrankfurterLatest,
} from './fx-providers';

export {
  ACTIVE_FX_PROVIDER,
  FX_PROVIDERS,
  getActiveFxProvider,
  parseCurrencyApiUsdLatest,
  parseFrankfurterLatest,
  type FxProviderId,
} from './fx-providers';

/** Refetch when the last successful fetch is older than this. */
export const FX_CACHE_TTL_MS = 60 * 60 * 1000;

/** Provider-scoped cache so flipping {@link ACTIVE_FX_PROVIDER} does not reuse stale tables. */
const FX_STORAGE_KEY = `ontrack/fx/v2/${ACTIVE_FX_PROVIDER}`;

/** Currencies offered in trip FX pickers (subset common across providers). */
export const FX_CURRENCIES = [
  'AUD',
  'BRL',
  'CAD',
  'CHF',
  'CNY',
  'CZK',
  'DKK',
  'EUR',
  'GBP',
  'HKD',
  'HUF',
  'IDR',
  'ILS',
  'INR',
  'ISK',
  'JPY',
  'KRW',
  'MXN',
  'MYR',
  'NOK',
  'NZD',
  'PHP',
  'PLN',
  'RON',
  'SEK',
  'SGD',
  'THB',
  'TRY',
  'USD',
  'ZAR',
] as const;

export type FxCurrency = (typeof FX_CURRENCIES)[number];

export interface FxRates {
  /** YYYY-MM-DD of the rate table. */
  date: string;
  /** Currency the rates map is quoted against (1 base = rates[quote]). */
  base: string;
  rates: Record<string, number>;
  fetchedAt: string;
  provider: FxProviderId;
  /** Human label for UI (e.g. Market, Frankfurter). */
  sourceLabel: string;
}

let memoryCache: FxRates | undefined;
let inflight: Promise<FxRates | undefined> | undefined;

function isFxCurrency(code: string): code is FxCurrency {
  return (FX_CURRENCIES as readonly string[]).includes(code);
}

export function isSupportedFxCurrency(code: string): boolean {
  return isFxCurrency(normalizeCurrencyCode(code));
}

function sanitizeRates(base: string, rates: Record<string, number>): Record<string, number> {
  const next: Record<string, number> = { [base]: 1 };
  for (const [code, rate] of Object.entries(rates)) {
    const normalized = normalizeCurrencyCode(code, '');
    if (!normalized || !Number.isFinite(rate) || rate <= 0) continue;
    next[normalized] = rate;
  }
  return next;
}

function withProviderMeta(
  table: { date: string; base: string; rates: Record<string, number> },
): FxRates {
  const provider = getActiveFxProvider();
  return {
    ...table,
    base: normalizeCurrencyCode(table.base),
    rates: sanitizeRates(normalizeCurrencyCode(table.base), table.rates),
    fetchedAt: new Date().toISOString(),
    provider: provider.id,
    sourceLabel: provider.label,
  };
}

/**
 * Convert using a single rate table. Amounts in `from` → `to`.
 * Works when both currencies appear in the table (relative to `rates.base`).
 */
export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: FxRates,
): number | undefined {
  if (!Number.isFinite(amount)) return undefined;
  const source = normalizeCurrencyCode(from);
  const target = normalizeCurrencyCode(to);
  if (source === target) return amount;
  const fromRate = rates.rates[source];
  const toRate = rates.rates[target];
  if (!fromRate || !toRate) return undefined;
  // amount_in_base = amount / fromRate; amount_in_to = amount_in_base * toRate
  return (amount / fromRate) * toRate;
}

async function readCachedRates(): Promise<FxRates | undefined> {
  if (memoryCache?.provider === ACTIVE_FX_PROVIDER) return memoryCache;
  try {
    const raw = await AsyncStorage.getItem(FX_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as FxRates;
    if (
      typeof parsed?.base !== 'string' ||
      typeof parsed?.date !== 'string' ||
      !parsed.rates ||
      typeof parsed.rates !== 'object'
    ) {
      return undefined;
    }
    const provider = getActiveFxProvider();
    memoryCache = {
      ...parsed,
      base: normalizeCurrencyCode(parsed.base),
      rates: sanitizeRates(normalizeCurrencyCode(parsed.base), parsed.rates),
      provider: provider.id,
      sourceLabel: parsed.sourceLabel || provider.label,
    };
    return memoryCache;
  } catch {
    return undefined;
  }
}

async function writeCachedRates(rates: FxRates): Promise<void> {
  memoryCache = rates;
  try {
    await AsyncStorage.setItem(FX_STORAGE_KEY, JSON.stringify(rates));
  } catch {
    // ignore persistence failures
  }
}

/** Fetch from the active provider ({@link ACTIVE_FX_PROVIDER}). */
export async function fetchLatestFxRates(signal?: AbortSignal): Promise<FxRates | undefined> {
  const table = await getActiveFxProvider().fetchLatest(signal);
  return table ? withProviderMeta(table) : undefined;
}

/** True when `fetchedAt` is within the TTL window. */
export function isFxRatesFresh(
  rates: Pick<FxRates, 'fetchedAt'> | undefined,
  nowMs = Date.now(),
  ttlMs = FX_CACHE_TTL_MS,
): boolean {
  if (!rates?.fetchedAt) return false;
  const fetchedAt = Date.parse(rates.fetchedAt);
  if (!Number.isFinite(fetchedAt)) return false;
  const age = nowMs - fetchedAt;
  return age >= 0 && age < ttlMs;
}

/**
 * Returns network-fresh rates when online; otherwise last cached table.
 * Dedupes concurrent callers. Cache is considered fresh for {@link FX_CACHE_TTL_MS}
 * unless `force` is set (currency calculator always forces on open).
 */
export async function loadFxRates(options?: {
  force?: boolean;
  signal?: AbortSignal;
}): Promise<{ rates: FxRates | undefined; stale: boolean }> {
  const cached = await readCachedRates();
  if (!options?.force && isFxRatesFresh(cached)) {
    return { rates: cached, stale: false };
  }

  if (options?.signal?.aborted) {
    return { rates: cached, stale: Boolean(cached) };
  }

  if (!inflight) {
    // Shared fetch intentionally omits the caller's AbortSignal so one sheet
    // unmount does not cancel an in-flight refresh for other consumers.
    inflight = (async () => {
      try {
        const fresh = await fetchLatestFxRates();
        if (fresh) {
          await writeCachedRates(fresh);
          return fresh;
        }
      } catch {
        // Network / parse failures fall through to cached rates.
      } finally {
        inflight = undefined;
      }
      return undefined;
    })();
  }

  const fresh = await inflight;
  if (options?.signal?.aborted) {
    return { rates: fresh ?? cached, stale: !fresh && Boolean(cached) };
  }
  if (fresh) return { rates: fresh, stale: false };

  return { rates: cached, stale: Boolean(cached) };
}

/** Test helper. */
export function resetFxCacheForTests(): void {
  memoryCache = undefined;
  inflight = undefined;
}

export function currencyOptionsForTrip(used: string[]): { value: string; label: string }[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const code of [
    ...used.map((item) => normalizeCurrencyCode(item)),
    ...FX_CURRENCIES,
  ]) {
    if (!code || seen.has(code)) continue;
    seen.add(code);
    ordered.push(code);
  }
  return ordered.map((value) => ({ value, label: value }));
}
