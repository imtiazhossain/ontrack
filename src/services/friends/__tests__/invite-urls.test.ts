import {
  createFriendInviteUrl,
  createInstalledFriendInviteUrl,
  isFriendInviteCode,
  isFriendInviteSlug,
  isFriendInviteToken,
  normalizeFriendInviteSlug,
} from '@/services/friends';

describe('friend invite helpers', () => {
  it('validates invite codes', () => {
    expect(isFriendInviteCode('abcdef0123456789abcd')).toBe(true);
    expect(isFriendInviteCode('short')).toBe(false);
    expect(isFriendInviteCode('ABCDEF0123456789ABCD')).toBe(false);
  });

  it('validates custom invite slugs', () => {
    expect(isFriendInviteSlug('rocky')).toBe(true);
    expect(isFriendInviteSlug('rocky-h')).toBe(true);
    expect(isFriendInviteSlug('ab')).toBe(false);
    expect(isFriendInviteSlug('-rocky')).toBe(false);
    expect(isFriendInviteSlug('abcdef0123456789abcd')).toBe(false);
    expect(isFriendInviteToken('rocky')).toBe(true);
    expect(isFriendInviteToken('abcdef0123456789abcd')).toBe(true);
  });

  it('builds hosted and installed invite URLs for codes and slugs', () => {
    const code = 'abcdef0123456789abcd';
    expect(createFriendInviteUrl(code, 'https://ontrack--links.expo.app/')).toBe(
      `https://ontrack--links.expo.app/f/${code}`,
    );
    expect(createInstalledFriendInviteUrl(code)).toBe(`ontrack:///f/${code}`);
    expect(createFriendInviteUrl('rocky', 'https://ontrack--links.expo.app/')).toBe(
      'https://ontrack--links.expo.app/f/rocky',
    );
    expect(normalizeFriendInviteSlug(' Rocky ')).toBe('rocky');
  });
});
