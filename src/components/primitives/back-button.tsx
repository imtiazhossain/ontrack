import { type Href, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds, useAgentUiTarget } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';
import { goBackOrReplace } from '@/utils/navigation';

import { IconButton } from './button';
import { Symbol } from './symbol';

export function BackButton({
  accessibilityLabel = 'Go Back',
  fallback = '/(tabs)',
  testID = AgentUiIds.chrome.back,
}: {
  accessibilityLabel?: string;
  fallback?: Href;
  testID?: string;
}) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <IconButton
        icon="chevron-left"
        accessibilityLabel={accessibilityLabel}
        background="transparent"
        testID={testID}
        onPress={() => goBackOrReplace(router, fallback)}
      />
    </View>
  );
}

/** Back control used by the shared native stack header on every non-root route. */
export function HeaderBackButton({
  accessibilityLabel = 'Go Back',
  fallback = '/(tabs)',
  alwaysNavigateTo,
  onPress,
  testID = AgentUiIds.chrome.headerBack,
  /** Match `ScreenHeader` eyebrow / overline chrome (hit target stays ≥44 via hitSlop). */
  compact = false,
}: {
  accessibilityLabel?: string;
  fallback?: Href;
  /** When set, always navigate here instead of popping the stack. */
  alwaysNavigateTo?: Href;
  /** Embedded flows can provide their own back/cancel transition. */
  onPress?: () => void;
  testID?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const theme = useTheme();
  const { typography, layout } = useResponsive();

  const handlePress = () => {
    try {
      haptics.tap();
    } catch {
      // Best-effort haptics should never block the button action.
    }
    if (onPress) {
      onPress();
      return;
    }
    if (alwaysNavigateTo) {
      router.replace(alwaysNavigateTo);
      return;
    }
    goBackOrReplace(router, fallback);
  };

  const agent = useAgentUiTarget(testID, {
    label: accessibilityLabel,
    onPress: handlePress,
  });

  if (!compact) {
    return (
      <IconButton
        icon="back"
        accessibilityLabel={accessibilityLabel}
        background="transparent"
        testID={testID}
        onPress={handlePress}
      />
    );
  }

  // Overline-matched chrome: glyph ≈ eyebrow cap height; hitSlop preserves tap target.
  // `Symbol` scales numeric sizes — pass the design-token base, not the already-scaled type size.
  const line = Math.round(typography.overline.lineHeight);
  const hitPad = Math.max(0, (layout.minTapTarget - line) / 2);

  return (
    <Pressable
      ref={agent.ref}
      testID={testID}
      onLayout={agent.onLayout}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={hitPad}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.compact,
        {
          width: Math.round(typography.overline.fontSize),
          height: line,
          opacity: pressed ? 0.7 : 1,
        },
      ]}>
      <Symbol name="back" size={11} color={theme.accentPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'flex-start', marginBottom: spacing.sm },
  compact: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
