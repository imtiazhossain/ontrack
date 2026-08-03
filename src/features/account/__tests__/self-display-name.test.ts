import { resolveSelfDisplayName } from '@/features/account/self-display-name';

describe('resolveSelfDisplayName', () => {
  it('prefers preferences name', () => {
    expect(
      resolveSelfDisplayName({
        preferencesName: 'Imtiaz Hossain',
        user: {
          email: 'imtihoss@gmail.com',
          user_metadata: { full_name: 'Other' },
        },
      }),
    ).toBe('Imtiaz Hossain');
  });

  it('skips placeholder You and uses SSO metadata', () => {
    expect(
      resolveSelfDisplayName({
        preferencesName: 'You',
        user: {
          email: 'imtihoss@gmail.com',
          user_metadata: { full_name: 'Imtiaz Hossain' },
        },
      }),
    ).toBe('Imtiaz Hossain');
  });

  it('falls back to email local-part', () => {
    expect(
      resolveSelfDisplayName({
        preferencesName: '',
        user: { email: 'imtihoss@gmail.com', user_metadata: {} },
      }),
    ).toBe('imtihoss');
  });
});
