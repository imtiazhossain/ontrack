import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import {
  ACTIVE_FX_PROVIDER,
  convertAmount,
  FX_CACHE_TTL_MS,
  isFxRatesFresh,
  loadFxRates,
  parseCurrencyApiUsdLatest,
  parseFrankfurterLatest,
  resetFxCacheForTests,
} from '../fx-rates';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

describe('fx rates', () => {
  afterEach(() => {
    resetFxCacheForTests();
    jest.restoreAllMocks();
  });

  it('parses a Frankfurter latest payload', () => {
    const rates = parseFrankfurterLatest({
      amount: 1,
      base: 'USD',
      date: '2026-07-30',
      rates: { ISK: 138.12, EUR: 0.92 },
    });
    expect(rates).toMatchObject({
      base: 'USD',
      date: '2026-07-30',
      rates: { USD: 1, ISK: 138.12, EUR: 0.92 },
    });
  });

  it('parses a currency-api USD payload', () => {
    const rates = parseCurrencyApiUsdLatest({
      date: '2026-08-02',
      usd: { isk: 123.237, eur: 0.8707, gbp: 0.745 },
    });
    expect(rates).toMatchObject({
      base: 'USD',
      date: '2026-08-02',
      rates: { USD: 1, ISK: 123.237, EUR: 0.8707, GBP: 0.745 },
    });
  });

  it('converts ISK to USD and back through the USD table', () => {
    const rates = {
      ...parseFrankfurterLatest({
        base: 'USD',
        date: '2026-07-30',
        rates: { ISK: 100, EUR: 1 },
      })!,
      fetchedAt: '2026-07-30T12:00:00.000Z',
      provider: 'frankfurter' as const,
      sourceLabel: 'Frankfurter',
    };
    expect(convertAmount(10000, 'ISK', 'USD', rates)).toBe(100);
    expect(convertAmount(100, 'USD', 'ISK', rates)).toBe(10000);
    expect(convertAmount(92, 'EUR', 'USD', rates)).toBe(92);
  });

  it('treats rates as fresh only within the TTL window', () => {
    const now = Date.parse('2026-08-02T18:00:00.000Z');
    expect(
      isFxRatesFresh(
        { fetchedAt: '2026-08-02T17:30:00.000Z' },
        now,
        FX_CACHE_TTL_MS,
      ),
    ).toBe(true);
    expect(
      isFxRatesFresh(
        { fetchedAt: '2026-08-02T16:59:00.000Z' },
        now,
        FX_CACHE_TTL_MS,
      ),
    ).toBe(false);
  });

  it('force-refreshes from the active provider even when the cache is still fresh', async () => {
    expect(ACTIVE_FX_PROVIDER).toBe('currency-api');

    await mockAsyncStorage.setItem(
      'ontrack/fx/v2/currency-api',
      JSON.stringify({
        base: 'USD',
        date: '2026-08-01',
        rates: { USD: 1, EUR: 0.9, ISK: 120 },
        fetchedAt: new Date().toISOString(),
        provider: 'currency-api',
        sourceLabel: 'Market',
      }),
    );

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        date: '2026-08-02',
        usd: { eur: 0.91, isk: 123.24 },
      }),
    } as Response);

    const result = await loadFxRates({ force: true });
    expect(fetchSpy).toHaveBeenCalled();
    expect(result.stale).toBe(false);
    expect(result.rates?.provider).toBe('currency-api');
    expect(result.rates?.sourceLabel).toBe('Market');
    expect(result.rates?.rates.ISK).toBeCloseTo(123.24);
    expect(result.rates?.rates.EUR).toBeCloseTo(0.91);
  });
});
