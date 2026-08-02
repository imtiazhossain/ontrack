import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebView as WebViewType } from 'react-native-webview';

import { AppText, IconButton } from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import {
  trivagoFindBookingInjectScript,
  type StayBookingOpen,
} from '@/features/travel/booking-open';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

type WebViewOpen = Extract<StayBookingOpen, { mode: 'webview' }>;

interface BookingOpenSheetProps {
  target: WebViewOpen | null;
  onClose: () => void;
}

export function BookingOpenSheet({ target, onClose }: BookingOpenSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { s, spacing: rs } = useResponsive();
  const [loading, setLoading] = useState(true);
  const webRef = useRef<WebViewType>(null);
  const lastInjectUrl = useRef<string>('');

  useEffect(() => {
    if (!target) {
      lastInjectUrl.current = '';
      setLoading(true);
    }
  }, [target]);

  if (!target) return null;

  const runInject = (url: string) => {
    const script = trivagoFindBookingInjectScript(
      target.email,
      target.bookingNumber,
    );
    // SPA hydrates after first paint — retry until the form exists / submit fires.
    const key = `${url}|${target.email}|${target.bookingNumber}`;
    if (lastInjectUrl.current === key) return;
    lastInjectUrl.current = key;
    const delays = [0, 350, 800, 1400, 2200, 3200];
    for (const delay of delays) {
      setTimeout(() => {
        webRef.current?.injectJavaScript(script);
      }, delay);
    }
  };

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View
        style={[
          styles.root,
          {
            backgroundColor: theme.backgroundPrimary,
            paddingTop: Math.max(insets.top, rs.sm),
          },
        ]}>
        <View style={[styles.header, { paddingHorizontal: rs.md, gap: rs.sm }]}>
          <View style={styles.headerText}>
            <AppText variant="subheading" fit>
              Booking
            </AppText>
            <AppText variant="caption" color="secondary" numberOfLines={1}>
              Opening your itinerary…
            </AppText>
          </View>
          <IconButton
            icon="close"
            size={Math.max(36, s(40))}
            background={theme.backgroundSunken}
            onPress={onClose}
            accessibilityLabel="Close booking"
          />
        </View>

        <View style={styles.webWrap}>
          <WebView
            ref={webRef}
            source={{ uri: target.url }}
            style={styles.webview}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => {
              setLoading(false);
              runInject(target.url);
            }}
            onNavigationStateChange={(nav) => {
              if (!nav.loading) runInject(nav.url);
            }}
            setSupportMultipleWindows={false}
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            startInLoadingState
            allowsBackForwardNavigationGestures
          />
          {loading ? (
            <View
              pointerEvents="none"
              style={[styles.loading, { backgroundColor: theme.overlayScrim }]}>
              <ActivityIndicator color={theme.accentPrimary} />
              <AppText variant="callout" color="secondary" fit>
                Signing into booking…
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingBottom: spacing.sm,
  },
  headerText: { flex: 1, minWidth: 0, flexShrink: 1, gap: 2 },
  webWrap: { flex: 1, position: 'relative' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
  },
});
