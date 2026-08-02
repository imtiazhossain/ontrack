type MapPlatform = 'ios' | 'android' | 'web';

export function addressMapUrl(
  address: string,
  platform?: MapPlatform,
): string | undefined {
  const trimmedAddress = address.trim();
  if (!trimmedAddress) return undefined;

  const query = encodeURIComponent(trimmedAddress);
  const targetPlatform =
    platform ??
    (process.env.EXPO_OS === 'ios'
      ? 'ios'
      : process.env.EXPO_OS === 'android'
        ? 'android'
        : 'web');
  if (targetPlatform === 'ios') return `http://maps.apple.com/?q=${query}`;
  if (targetPlatform === 'android') return `geo:0,0?q=${query}`;
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
