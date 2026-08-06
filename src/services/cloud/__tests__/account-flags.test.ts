import { loadAccountFlags } from '@/services/cloud/account-flags';
import { useAccountFlags } from '@/store/account-flags';

jest.mock('@/services/cloud/supabase', () => ({
  getSupabaseClient: jest.fn(),
}));

const { getSupabaseClient } = jest.requireMock('@/services/cloud/supabase') as {
  getSupabaseClient: jest.Mock;
};

describe('loadAccountFlags', () => {
  beforeEach(() => {
    useAccountFlags.getState().reset();
    getSupabaseClient.mockReset();
  });

  it('fails closed when cloud is unavailable', async () => {
    getSupabaseClient.mockReturnValue(null);
    await loadAccountFlags('user-1');
    expect(useAccountFlags.getState()).toMatchObject({
      status: 'ready',
      developerTools: false,
      analyticsAdmin: false,
    });
  });

  it('maps a granted row from Supabase', async () => {
    getSupabaseClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { developer_tools: true, analytics_admin: true },
              error: null,
            }),
          }),
        }),
      }),
    });
    await loadAccountFlags('user-1');
    expect(useAccountFlags.getState()).toMatchObject({
      status: 'ready',
      developerTools: true,
      analyticsAdmin: true,
    });
  });

  it('fails closed when the row is missing', async () => {
    getSupabaseClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    });
    await loadAccountFlags('user-1');
    expect(useAccountFlags.getState().developerTools).toBe(false);
  });
});
