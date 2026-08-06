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

/** Apple Maps search URL. */
export function appleMapsUrl(address: string): string | undefined {
  const query = trimmedAddressQuery(address);
  if (!query) return undefined;
  return `http://maps.apple.com/?q=${query}`;
}

/** Google Maps search URL (opens the app when installed via universal link). */
export function googleMapsUrl(address: string): string | undefined {
  const query = trimmedAddressQuery(address);
  if (!query) return undefined;
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/** Platform map URL — Android `geo:` may show the system Open-with chooser. */
export function addressMapUrl(
  address: string,
  platform?: MapPlatform,
): string | undefined {
  const query = trimmedAddressQuery(address);
  if (!query) return undefined;

  const targetPlatform = resolveMapPlatform(platform);
  if (targetPlatform === 'ios') return appleMapsUrl(address);
  if (targetPlatform === 'android') return `geo:0,0?q=${query}`;
  return googleMapsUrl(address);
}
