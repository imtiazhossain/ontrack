import { redirectIncomingSystemPath } from '../navigation';

describe('incoming share navigation', () => {
  it('redirects only the Expo sharing host', () => {
    expect(redirectIncomingSystemPath('ontrack://expo-sharing')).toBe('/share-event');
    expect(redirectIncomingSystemPath('ontrack://expo-sharing?id=1')).toBe('/share-event');
  });

  it('preserves existing app and universal-link paths', () => {
    expect(redirectIncomingSystemPath('/l/abc')).toBe('/l/abc');
    expect(redirectIncomingSystemPath('https://ontrack--links.expo.app/c/abc')).toBe(
      'https://ontrack--links.expo.app/c/abc',
    );
  });
});
