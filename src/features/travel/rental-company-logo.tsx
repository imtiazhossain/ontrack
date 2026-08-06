import { Image } from 'expo-image';
import { useState } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';

import type { SymbolSize } from '@/components/primitives';
import { Symbol } from '@/components/primitives';
import { rentalCompanyDomain } from '@/features/travel/rental-company';
import { googleFaviconLogoUrl } from '@/features/travel/stays/stay-provider-logo-lookup';

/** Brand marks are drawn for light plates (Hertz yellow, etc.). */
const LOGO_PLATE_BACKGROUND = '#FFFFFF';

/**
 * Rental company brand mark that fills its parent plate.
 * Tries unavatar → Google favicon → vehicles glyph.
 */
export function RentalCompanyLogo({
  company,
  fallbackIconSize = 'lg',
  fallbackColor,
}: {
  company?: string;
  fallbackIconSize?: SymbolSize;
  fallbackColor: string;
}) {
  const domain = rentalCompanyDomain(company);
  const [source, setSource] = useState<'unavatar' | 'google' | 'glyph'>(
    domain ? 'unavatar' : 'glyph',
  );

  if (!domain || source === 'glyph') {
    return (
      <Symbol name="vehicles" size={fallbackIconSize} color={fallbackColor} />
    );
  }

  const pixelSize = Math.round(64 * Math.max(3, PixelRatio.get()));
  const uri =
    source === 'unavatar'
      ? `https://unavatar.io/${domain}?fallback=false`
      : googleFaviconLogoUrl(domain, 256);

  return (
    <View style={StyleSheet.absoluteFill}>
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: LOGO_PLATE_BACKGROUND },
        ]}
      />
      <View style={styles.inset}>
        <Image
          key={source}
          source={{ uri, width: pixelSize, height: pixelSize }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          transition={120}
          recyclingKey={`rental:${domain}:${source}@${pixelSize}`}
          cachePolicy="memory-disk"
          allowDownscaling={false}
          accessibilityIgnoresInvertColors
          accessibilityLabel={`${company?.trim() || domain} logo`}
          onError={() => {
            setSource((current) =>
              current === 'unavatar' ? 'google' : 'glyph',
            );
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inset: {
    position: 'absolute',
    top: '10%',
    right: '10%',
    bottom: '10%',
    left: '10%',
  },
});
