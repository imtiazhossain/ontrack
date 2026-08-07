import type { PropsWithChildren, RefObject } from 'react';
import { useRef } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useUI } from '@/store/ui';
import { useAgentUiScrollContainer } from '@/utils/agent-ui/use-agent-ui-scroll-container';

import {
  usePageSurfaceBackground,
  useSafeAreaChrome,
} from './safe-area-chrome';

interface ScreenProps extends PropsWithChildren {
  /** Scrollable content (default) or a fixed layout */
  scroll?: boolean;
  /** Extra bottom padding for content above the tab bar, or only the device safe area */
  bottomInset?: boolean | 'safe';
  padded?: boolean;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  scrollEnabled?: boolean;
  /**
   * Pull-to-refresh for scrollable screens (default true).
   * Disable on dense editors/forms where a pull would fight typing.
   */
  refresh?: boolean;
  /** Extra work after the shared cloud/friends refresh. */
  onRefresh?: () => void | Promise<void>;
  /** Optional access to the shared scroll container for targeted in-screen navigation. */
  scrollRef?: RefObject<ScrollView | null>;
  /** Forwarded after agent-ui scroll bookkeeping. */
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

export function Screen({
  children,
  scroll = true,
  bottomInset = true,
  padded = true,
  style,
  contentStyle,
  scrollEnabled = true,
  refresh = true,
  onRefresh,
  scrollRef,
  onScroll,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { spacing, layout } = useResponsive();
  const notifyPageInteraction = useUI((state) => state.notifyPageInteraction);
  const pull = usePullToRefresh(onRefresh);
  const viewportRef = useRef<View>(null);
  const agentScroll = useAgentUiScrollContainer(scrollRef, viewportRef);
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    agentScroll.onScroll?.(event);
    onScroll?.(event);
  };

  const flattened = StyleSheet.flatten(style) as ViewStyle | undefined;
  const backgroundColor =
    flattened?.backgroundColor !== undefined
      ? flattened.backgroundColor
      : theme.backgroundPrimary;
  const surfaceColor =
    typeof backgroundColor === 'string' ? backgroundColor : undefined;
  // Paint page fill into the non-scrolling status-bar shell. Priority -1 so
  // Today / Travel / auth washes (default 0+) still win when they register.
  useSafeAreaChrome(surfaceColor, { priority: -1 });
  // Tab dock matches this page fill (skipped when transparent — Travel paper
  // and other scenic underlays register their own solid surface).
  usePageSurfaceBackground(surfaceColor);

  const paddingStyle: ViewStyle = {
    // The app shell owns the non-scrolling top safe area.
    paddingTop: spacing.sm,
    paddingBottom:
      bottomInset === 'safe'
        ? insets.bottom + spacing.lg
        : bottomInset
          ? insets.bottom + layout.tabBarInset
          : spacing.xl,
    ...(padded
      ? {
          paddingLeft: insets.left + layout.screenPadding,
          paddingRight: insets.right + layout.screenPadding,
        }
      : null),
  };

  if (!scroll) {
    return (
      <View
        onTouchStart={notifyPageInteraction}
        style={[styles.fill, { backgroundColor }, style]}>
        <View style={[styles.fill, paddingStyle, contentStyle]}>{children}</View>
      </View>
    );
  }

  return (
    <View
      ref={viewportRef}
      onTouchStart={notifyPageInteraction}
      collapsable={false}
      style={[styles.fill, { backgroundColor }, style]}>
      <ScrollView
        ref={agentScroll.scrollRef}
        style={styles.scrollView}
        automaticallyAdjustKeyboardInsets
        scrollEnabled={scrollEnabled}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[styles.scrollContent, paddingStyle, contentStyle]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={agentScroll.scrollEventThrottle}
        refreshControl={refresh ? pull.refreshControl : undefined}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrollView: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { flexGrow: 1 },
});
