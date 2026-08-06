const mockExchangeCodeForSession = jest.fn();

jest.mock('@/services/cloud/supabase', () => ({
  getSupabaseClient: () => ({
    auth: {
      exchangeCodeForSession: (...args: unknown[]) => mockExchangeCodeForSession(...args),
    },
  }),
}));

// eslint-disable-next-line import/first
import {
  CloudAccountError,
  exchangeOAuthCallback,
  resetOAuthCallbackExchangeForTests,
} from '@/services/cloud/account';

describe('OAuth code exchange', () => {
  const redirect = 'ontrack://auth/callback';
  const url = `${redirect}?code=one-time-code`;

  beforeEach(() => {
    resetOAuthCallbackExchangeForTests();
    mockExchangeCodeForSession.mockReset();
  });

  it('retries after a failed exchange instead of caching the failure', async () => {
    mockExchangeCodeForSession
      .mockResolvedValueOnce({ data: { session: null }, error: { message: 'network blip' } })
      .mockResolvedValueOnce({
        data: {
          session: {
            access_token: 'token',
            user: { id: 'user-1' },
          },
        },
        error: null,
      });

    await expect(exchangeOAuthCallback(url)).rejects.toBeInstanceOf(CloudAccountError);
    const session = await exchangeOAuthCallback(url);
    expect(session?.user.id).toBe('user-1');
    expect(mockExchangeCodeForSession).toHaveBeenCalledTimes(2);
  });

  it('rejects a successful response that did not establish a session', async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    await expect(exchangeOAuthCallback(url)).rejects.toThrow(/establish a session/i);
  });
});
