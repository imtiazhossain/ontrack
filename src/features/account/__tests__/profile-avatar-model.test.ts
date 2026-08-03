import {
  emptyAvatarMeta,
  initialsFromName,
  iconifySvgUrl,
  normalizeAvatarMeta,
  normalizeIconifyId,
  normalizeAvatarColor,
} from '@/features/account/profile-avatar-model';

describe('profile-avatar-model', () => {
  it('normalizes hex colors', () => {
    expect(normalizeAvatarColor('#9a7654')).toBe('#9A7654');
    expect(normalizeAvatarColor('9A7654')).toBe('#9A7654');
    expect(normalizeAvatarColor('#2474A8FF')).toBe('#2474A8');
    expect(normalizeAvatarColor('nope')).toBeUndefined();
  });

  it('validates Iconify ids', () => {
    expect(normalizeIconifyId('mdi:account')).toBe('mdi:account');
    expect(normalizeIconifyId('MDI:Account-Circle')).toBe('mdi:account-circle');
    expect(normalizeIconifyId('bad id')).toBeUndefined();
  });

  it('builds Iconify SVG URLs', () => {
    expect(iconifySvgUrl('mdi:airplane', '#2474A8')).toBe(
      'https://api.iconify.design/mdi/airplane.svg?color=%232474A8',
    );
  });

  it('creates initials from names', () => {
    expect(initialsFromName('Imtiaz Hossain')).toBe('IH');
    expect(initialsFromName('Farhana')).toBe('F');
    expect(initialsFromName('')).toBe('?');
  });

  it('normalizes avatar payload and falls back safely', () => {
    expect(normalizeAvatarMeta(undefined)).toEqual(emptyAvatarMeta());
    expect(
      normalizeAvatarMeta({
        kind: 'icon',
        color: '#2474a8',
        iconId: 'mdi:leaf',
      }),
    ).toEqual({
      kind: 'icon',
      color: '#2474A8',
      iconId: 'mdi:leaf',
    });
    expect(
      normalizeAvatarMeta({
        kind: 'icon',
        iconId: 'not-valid',
      }),
    ).toEqual({ kind: 'initials' });
    expect(
      normalizeAvatarMeta({
        kind: 'photo',
        photoPath: 'user-1/avatar.jpg',
      }),
    ).toEqual({
      kind: 'photo',
      photoPath: 'user-1/avatar.jpg',
    });
  });
});
