import type { PropsWithChildren, RefObject } from 'react';
import { useRef } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useUI } from '@/store/ui';
import { useAgentUiScrollContainer } from '@/utils/agent-ui/use-agent-ui-scroll-container';

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
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { spacing, layout } = useResponsive();
  const notifyPageInteraction = useUI((state) => state.notifyPageInteraction);
  const pull = usePullToRefresh(onRefresh);
  const viewportRef = useRef<View>(null);
  const agentScroll = useAgentUiScrollContainer(scrollRef, viewportRef);

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
        style={[styles.fill, { backgroundColor: theme.backgroundPrimary }, style]}>
        <View style={[styles.fill, paddingStyle, contentStyle]}>{children}</View>
      </View>
    );
  }

  return (
    <View
      ref={viewportRef}
      onTouchStart={notifyPageInteraction}
      collapsable={false}
      style={[styles.fill, { backgroundColor: theme.backgroundPrimary }, style]}>
      <ScrollView
        ref={agentScroll.scrollRef}
        automaticallyAdjustKeyboardInsets
        scrollEnabled={scrollEnabled}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[styles.scrollContent, paddingStyle, contentStyle]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        keyboardShouldPersistTaps="handled"
        onScroll={agentScroll.onScroll}
        scrollEventThrottle={agentScroll.scrollEventThrottle}
        refreshControl={refresh ? pull.refreshControl : undefined}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrollContent: { flexGrow: 1 },
});
