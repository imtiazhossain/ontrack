import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalizeCurrencyCode } from './format-money';

const FX_STORAGE_KEY = 'ontrack/fx/v1';
const FRANKFURTER_LATEST = 'https://api.frankfurter.dev/v1/latest';

/** Currencies supported by Frankfurter v1 (includes ISK). */
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
}

type FrankfurterLatest = {
  date?: string;
  base?: string;
  rates?: Record<string, number>;
};

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

export function parseFrankfurterLatest(payload: unknown): FxRates | undefined {
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
    fetchedAt: new Date().toISOString(),
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
  if (memoryCache) return memoryCache;
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
    memoryCache = {
      ...parsed,
      base: normalizeCurrencyCode(parsed.base),
      rates: sanitizeRates(normalizeCurrencyCode(parsed.base), parsed.rates),
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

export async function fetchLatestFxRates(signal?: AbortSignal): Promise<FxRates | undefined> {
  const response = await fetch(`${FRANKFURTER_LATEST}?base=USD`, { signal });
  if (!response.ok) return undefined;
  const json: unknown = await response.json();
  return parseFrankfurterLatest(json);
}

/**
 * Returns fresh rates when online; otherwise last cached table.
 * Dedupes concurrent callers.
 */
export async function loadFxRates(options?: {
  force?: boolean;
  signal?: AbortSignal;
}): Promise<{ rates: FxRates | undefined; stale: boolean }> {
  const cached = await readCachedRates();
  const today = new Date().toISOString().slice(0, 10);
  if (!options?.force && cached?.date === today) {
    return { rates: cached, stale: false };
  }

  if (!inflight) {
    inflight = (async () => {
      try {
        const fresh = await fetchLatestFxRates(options?.signal);
        if (fresh) {
          await writeCachedRates(fresh);
          return fresh;
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw error;
      } finally {
        inflight = undefined;
      }
      return undefined;
    })();
  }

  try {
    const fresh = await inflight;
    if (fresh) return { rates: fresh, stale: false };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
  }

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
