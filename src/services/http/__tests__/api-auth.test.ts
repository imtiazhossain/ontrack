import {
    apiRateLimitSubject,
    isApiRequestBlocked,
    type ApiAuthResult,
} from '../api-auth';
import { checkApiRateLimit, resetApiRateLimitsForTests } from '../api-rate-limit';

describe('isApiRequestBlocked', () => {
  const original = process.env.ALLOW_UNAUTHENTICATED_API;

  afterEach(() => {
    if (original === undefined) delete process.env.ALLOW_UNAUTHENTICATED_API;
    else process.env.ALLOW_UNAUTHENTICATED_API = original;
  });

  it('allows verified users', () => {
    expect(isApiRequestBlocked({ status: 'ok', userId: 'user-1' })).toBe(false);
  });

  it('blocks missing credentials', () => {
    expect(isApiRequestBlocked({ status: 'unauthenticated' })).toBe(true);
  });

  it('blocks unconfigured Supabase unless explicitly opted in', () => {
    delete process.env.ALLOW_UNAUTHENTICATED_API;
    expect(isApiRequestBlocked({ status: 'unconfigured' })).toBe(true);
    process.env.ALLOW_UNAUTHENTICATED_API = 'true';
    expect(isApiRequestBlocked({ status: 'unconfigured' })).toBe(false);
  });
});

describe('apiRateLimitSubject', () => {
  it('uses the authenticated user id when present', () => {
    const auth: ApiAuthResult = { status: 'ok', userId: 'abc' };
    expect(apiRateLimitSubject(new Request('https://example.test'), auth)).toBe('abc');
  });

  it('falls back to forwarded IP for local opt-in subjects', () => {
    const auth: ApiAuthResult = { status: 'unconfigured' };
    const request = new Request('https://example.test', {
      headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' },
    });
    expect(apiRateLimitSubject(request, auth)).toBe('anon:203.0.113.9');
  });
});

describe('checkApiRateLimit', () => {
  afterEach(() => {
    resetApiRateLimitsForTests();
  });

  it('allows traffic under the window limit and blocks after', () => {
    const start = 1_000_000;
    for (let i = 0; i < 40; i += 1) {
      expect(checkApiRateLimit('nutrition', 'user-a', start + i)).toBe('ok');
    }
    expect(checkApiRateLimit('nutrition', 'user-a', start + 40)).toBe('limited');
    expect(checkApiRateLimit('nutrition', 'user-b', start + 40)).toBe('ok');
  });
});
