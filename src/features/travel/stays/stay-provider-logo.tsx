import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { Symbol } from '@/components/primitives';
import type { AppIconName } from '@/design-system';
import {
  googleFaviconLogoUrl,
  lookupStayProviderLogoUrl,
  stayProviderLogoUrl,
} from '@/features/travel/stays/stay-provider-logo-lookup';
import { itinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';
import { useTheme } from '@/hooks/use-theme';

function isSvgSource(uri: string): boolean {
  const lower = uri.toLowerCase();
  if (lower.includes('unavatar.io/')) return true;
  const path = uri.split('?')[0] ?? '';
  return path.endsWith('.svg');
}

async function fetchSvgXml(uri: string): Promise<string | undefined> {
  try {
    const response = await fetch(uri, {
      headers: { Accept: 'image/svg+xml,*/*' },
    });
    if (!response.ok) return undefined;
    const text = await response.text();
    return /<svg\b/i.test(text) ? text : undefined;
  } catch {
    return undefined;
  }
}

type LogoMark =
  | { kind: 'svg'; xml: string }
  | { kind: 'raster'; uri: string };

/** Remote brand mark with icon fallback when the logo CDN is unreachable. */
export function StayProviderLogo({
  domain,
  icon,
  size,
  accessibilityLabel,
}: {
  domain: string;
  icon: AppIconName;
  size: number;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const [failed, setFailed] = useState(false);
  const [mark, setMark] = useState<LogoMark>();
  const radius = Math.max(10, size * 0.22);
  const pixelSize = Math.max(192, Math.ceil(size * Math.max(3, PixelRatio.get())));

  useEffect(() => {
    let active = true;
    setFailed(false);
    setMark(undefined);

    const applyUri = async (nextUri: string): Promise<boolean> => {
      if (isSvgSource(nextUri)) {
        const xml = await fetchSvgXml(nextUri);
        if (!active) return false;
        if (xml) {
          setMark({ kind: 'svg', xml });
          return true;
        }
        // Never hand SVG URLs to Image — it rasterizes them soft on retina.
        return false;
      }
      if (!active) return false;
      setMark({ kind: 'raster', uri: nextUri });
      return true;
    };

    void (async () => {
      const preferred = stayProviderLogoUrl(domain);
      if (await applyUri(preferred)) return;

      const resolved = await lookupStayProviderLogoUrl(domain);
      if (!active) return;
      if (resolved !== preferred && (await applyUri(resolved))) return;

      await applyUri(googleFaviconLogoUrl(domain, 256));
    })();

    return () => {
      active = false;
    };
  }, [domain]);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius: mark?.kind === 'svg' ? 0 : radius,
          backgroundColor: theme.name === 'light' ? '#FFFFFF' : chrome.fieldBg,
          overflow: mark?.kind === 'svg' ? 'visible' : 'hidden',
        },
      ]}>
      {failed || !mark ? (
        <Symbol name={icon} size="md" color={theme.accentPrimary} />
      ) : mark.kind === 'svg' ? (
        <SvgXml xml={mark.xml} width={size} height={size} />
      ) : (
        <Image
          source={{ uri: mark.uri, width: pixelSize, height: pixelSize }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={120}
          recyclingKey={`${mark.uri}@${pixelSize}`}
          cachePolicy="memory-disk"
          allowDownscaling={false}
          accessibilityIgnoresInvertColors
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
