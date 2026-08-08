import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Symbol } from '@/components/primitives';
import { TravelHomeGlass } from '@/features/travel/travel-home-glass';
import { travelHomeTokens } from '@/features/travel/travel-home-tokens';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useUI } from '@/store/ui';
import { AgentTestId, AgentUiIds } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';

/**
 * Floating glass Group Chat control — icon only, pinned above the tab bar.
 * Matches itinerary hero frost discs (back / add).
 */
export function TravelPlanChatFab({
  planId,
  tripTitle,
}: {
  planId: string;
  tripTitle: string;
}) {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { s, spacing: rs, layout } = useResponsive();
  const measuredTabBarHeight = useUI((state) => state.tabBarHeight);
  const tabBarHeight =
    measuredTabBarHeight > 0
      ? measuredTabBarHeight
      : layout.bottomNavBarBaseHeight + insets.bottom;
  const size = Math.max(48, s(48));
  const dark = theme.name === 'dark';
  const glyph = dark ? theme.textPrimary : travelHomeTokens.colors.ink;
  const label = `Open Group Chat for ${tripTitle}`;
  const openChat = () => {
    haptics.tap();
    router.push({
      pathname: '/travel/[id]/chat',
      params: { id: planId },
    } as never);
  };

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.anchor,
        {
          right: layout.screenPadding,
          bottom: tabBarHeight + rs.md,
        },
      ]}>
      <AgentTestId
        testID={AgentUiIds.travel.planDetail.groupChat}
        label={label}
        onPress={openChat}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={openChat}
          hitSlop={Math.max(6, (44 - size) / 2)}
          style={({ pressed }) => [
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              opacity: pressed ? 0.72 : 1,
            },
          ]}>
          <TravelHomeGlass
            airy
            intensity={dark ? 40 : 48}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: dark
                ? undefined
                : travelHomeTokens.colors.circleFabShadow,
            }}>
            <View style={{ zIndex: 1 }}>
              <Symbol name="chat" size="md" color={glyph} />
            </View>
          </TravelHomeGlass>
        </Pressable>
      </AgentTestId>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    zIndex: 20,
  },
});
