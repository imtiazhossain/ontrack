import { Image } from 'expo-image';
import { useState } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';

import { Symbol } from '@/components/primitives';
import type { SymbolSize } from '@/components/primitives';
import {
  airlineIataCode,
  airlineLogoUrl,
  airlineName,
} from '@/features/travel/airline-catalog';

/**
 * Airline marks are drawn for white; several ship a transparent knockout
 * (United's globe), so the plate must stay light behind the logo.
 */
const LOGO_PLATE_BACKGROUND = '#FFFFFF';

/**
 * Carrier brand mark that fills its parent plate, falling back to the plane
 * glyph for unknown airlines or an unreachable logo CDN. The parent owns the
 * plate size, radius, and `overflow: 'hidden'`.
 */
export function AirlineLogo({
  airline,
  flightNumber,
  fallbackIconSize = 'md',
  fallbackColor,
}: {
  airline?: string;
  flightNumber?: string;
  fallbackIconSize?: SymbolSize;
  fallbackColor: string;
}) {
  const code = airlineIataCode({ airline, flightNumber });
  const [failed, setFailed] = useState(false);

  if (!code || failed) {
    return (
      <Symbol name="flight" size={fallbackIconSize} color={fallbackColor} />
    );
  }

  const pixelSize = Math.round(48 * Math.max(3, PixelRatio.get()));
  const uri = airlineLogoUrl(code, pixelSize);

  return (
    <View style={StyleSheet.absoluteFill}>
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: LOGO_PLATE_BACKGROUND },
        ]}
      />
      <Image
        source={{ uri, width: pixelSize, height: pixelSize }}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        transition={120}
        recyclingKey={`${code}@${pixelSize}`}
        cachePolicy="memory-disk"
        allowDownscaling={false}
        accessibilityIgnoresInvertColors
        accessibilityLabel={airlineName(code) ?? code}
        onError={() => setFailed(true)}
      />
    </View>
  );
}
