type MapPlatform = 'ios' | 'android' | 'web';

function trimmedAddressQuery(address: string): string | undefined {
  const trimmedAddress = address.trim();
  if (!trimmedAddress) return undefined;
  return encodeURIComponent(trimmedAddress);
}

function resolveMapPlatform(platform?: MapPlatform): MapPlatform {
  return (
    platform ??
    (process.env.EXPO_OS === 'ios'
      ? 'ios'
      : process.env.EXPO_OS === 'android'
        ? 'android'
        : 'web')
  );
}

/** Platform map URL — Android `geo:` may show the system Open-with chooser. */
export function addressMapUrl(
  address: string,
  platform?: MapPlatform,
): string | undefined {
  const query = trimmedAddressQuery(address);
  if (!query) return undefined;

  const targetPlatform = resolveMapPlatform(platform);
  if (targetPlatform === 'ios') return `http://maps.apple.com/?q=${query}`;
  if (targetPlatform === 'android') return `geo:0,0?q=${query}`;
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
