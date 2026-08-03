import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import {
  currencyForDestination,
  currencyPairForTrip,
} from '../currency-for-destination';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

describe('currencyForDestination', () => {
  it('maps common destinations to supported currencies', () => {
    expect(currencyForDestination('Lisbon, Portugal')).toBe('EUR');
    expect(currencyForDestination('Reykjavik, Iceland')).toBe('ISK');
    expect(currencyForDestination('Tokyo')).toBe('JPY');
    expect(currencyForDestination('London, England')).toBe('GBP');
  });

  it('returns fallback when destination is unknown', () => {
    expect(currencyForDestination('Somewhere Unknown', 'CAD')).toBe('CAD');
    expect(currencyForDestination('')).toBeUndefined();
  });
});

describe('currencyPairForTrip', () => {
  it('pairs home currency with an inferred destination currency', () => {
    expect(currencyPairForTrip('Lisbon, Portugal', 'USD')).toEqual({
      origin: 'USD',
      destination: 'EUR',
    });
  });

  it('avoids identical defaults when destination cannot be inferred', () => {
    expect(currencyPairForTrip('Mystery Island', 'USD')).toEqual({
      origin: 'USD',
      destination: 'EUR',
    });
    expect(currencyPairForTrip('Mystery Island', 'EUR')).toEqual({
      origin: 'EUR',
      destination: 'USD',
    });
  });
});
