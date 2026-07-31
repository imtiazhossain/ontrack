import { resolveExpoApiUrl } from '../api-url';

jest.mock('expo-constants', () => ({
  expoConfig: { hostUri: '127.0.0.1:8081' },
}));

describe('resolveExpoApiUrl', () => {
  const originalDev = (global as { __DEV__?: boolean }).__DEV__;

  afterEach(() => {
    (global as { __DEV__?: boolean }).__DEV__ = originalDev;
  });

  it('uses configured base first when preferConfiguredFirst is set', () => {
    const url = resolveExpoApiUrl('/meal-analysis/photo', {
      configuredBaseUrl: 'https://api.example.com/',
      preferConfiguredFirst: true,
      createNotConfiguredError: () => new Error('missing'),
    });
    expect(url).toBe('https://api.example.com/meal-analysis/photo');
  });

  it('uses the Expo host in development when no configured base', () => {
    (global as { __DEV__?: boolean }).__DEV__ = true;
    const url = resolveExpoApiUrl('/api/movies/search', {
      createNotConfiguredError: () => new Error('missing'),
    });
    expect(url).toBe('http://127.0.0.1:8081/api/movies/search');
  });

  it('rejects insecure production bases when required', () => {
    (global as { __DEV__?: boolean }).__DEV__ = false;
    expect(() =>
      resolveExpoApiUrl('/travel/flights/search', {
        configuredBaseUrl: 'http://insecure.example.com',
        preferConfiguredFirst: true,
        requireHttpsInProduction: true,
        createNotConfiguredError: (reason) => new Error(reason),
      }),
    ).toThrow('insecure');
  });
});
