import { Image } from 'expo-image';
import * as SystemUI from 'expo-system-ui';
import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

import {
    SafeAreaChromeProvider,
    useSafeAreaChromeBackground,
    useSafeAreaChromeColor,
} from './safe-area-chrome';

/**
 * Non-scrolling boundary for the entire navigation tree.
 * Keeping the top inset outside route scroll views prevents content and
 * overscroll effects from ever moving behind the device clock or cutout.
 *
 * The outer fill uses the focused route's safe-area chrome color when set
 * (Today wash, Travel sky, …) so header backgrounds continue into the
 * status-bar region without moving insets into scroll content.
 */
export function AppSafeArea({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return (
    <SafeAreaChromeProvider>
      <AppSafeAreaFrame style={style}>{children}</AppSafeAreaFrame>
    </SafeAreaChromeProvider>
  );
}

function AppSafeAreaFrame({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const theme = useTheme();
  const chromeColor = useSafeAreaChromeColor();
  const {
    image: chromeImage,
    height: chromeImageHeight,
    blurRadius: chromeImageBlurRadius,
  } = useSafeAreaChromeBackground();
  const backgroundColor = chromeColor ?? theme.backgroundPrimary;

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(backgroundColor).catch(() => undefined);
  }, [backgroundColor]);

  return (
    <View style={[styles.fill, { backgroundColor }, style]}>
      {chromeImage ? (
        <Image
          pointerEvents="none"
          source={chromeImage}
          style={[
            styles.chromeImage,
            chromeImageHeight != null ? { height: chromeImageHeight } : StyleSheet.absoluteFill,
          ]}
          contentFit="cover"
          contentPosition={{ top: '0%', left: '50%' }}
          blurRadius={chromeImageBlurRadius}
        />
      ) : null}
      <SafeAreaView edges={['top']} style={[styles.fill, styles.transparent]}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  transparent: { backgroundColor: 'transparent' },
  chromeImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    zIndex: 0,
  },
});
