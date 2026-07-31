import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import {
  convertAmount,
  parseFrankfurterLatest,
  resetFxCacheForTests,
} from '../fx-rates';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

describe('fx rates', () => {
  afterEach(() => {
    resetFxCacheForTests();
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

  it('converts ISK to USD and back through the USD table', () => {
    const rates = parseFrankfurterLatest({
      base: 'USD',
      date: '2026-07-30',
      rates: { ISK: 100, EUR: 1 },
    })!;
    expect(convertAmount(10000, 'ISK', 'USD', rates)).toBe(100);
    expect(convertAmount(100, 'USD', 'ISK', rates)).toBe(10000);
    expect(convertAmount(92, 'EUR', 'USD', rates)).toBe(92);
  });
});
