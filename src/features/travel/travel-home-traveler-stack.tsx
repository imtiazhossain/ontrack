import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/primitives';
import { ProfileAvatar } from '@/features/account/profile-avatar';
import type { CoTravelerAvatarPerson } from '@/features/travel/travel-cotraveler-stack';
import {
    travelHomeFontFamily,
    travelHomeTokens,
} from '@/features/travel/travel-home-tokens';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentTestId } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';

const MAX_VISIBLE = 3;

type TravelHomeTravelerStackProps = {
  people: CoTravelerAvatarPerson[];
  tripTitle: string;
  testID?: string;
  onPress?: () => void;
};

/** Title-row avatar stack: up to 2 faces + +N overflow chip. */
export function TravelHomeTravelerStack({
  people,
  tripTitle,
  testID,
  onPress,
}: TravelHomeTravelerStackProps) {
  const theme = useTheme();
  const { s } = useResponsive();
  if (people.length === 0) return null;

  const size = Math.max(34, s(travelHomeTokens.sizes.avatar));
  const overlap = travelHomeTokens.spacing.avatarOverlap;
  /**
   * Match reference stacks: Iceland 2+2, Antigua 3+3.
   * ≤3 → all faces; 4 → 2 +2; ≥5 → 3 +N.
   */
  const faceSlots =
    people.length <= 3
      ? people.length
      : people.length === 4
        ? 2
        : Math.min(MAX_VISIBLE, people.length);
  const shown = people.slice(0, faceSlots);
  const remainder = people.length - shown.length;
  const width =
    size +
    Math.max(0, shown.length - 1) * (size - overlap) +
    (remainder > 0 ? size - overlap : 0);
  const label = `${people.length} traveler${people.length === 1 ? '' : 's'}`;
  const border =
    theme.name === 'light' ? travelHomeTokens.colors.surface : theme.backgroundElevated;

  const content = (
    <View
      style={[styles.row, { width, height: size }]}
      accessibilityElementsHidden={!!onPress}
      importantForAccessibility={onPress ? 'no-hide-descendants' : 'yes'}>
      {shown.map((person, index) => (
        <View
          key={person.id}
          accessible
          accessibilityLabel={person.name}
          style={[
            styles.avatar,
            {
              width: size,
              height: size,
              left: index * (size - overlap),
              zIndex: shown.length - index,
              borderColor: border,
              borderWidth: travelHomeTokens.sizes.avatarBorder,
            },
          ]}>
          <ProfileAvatar
            displayName={person.name}
            userId={person.userId}
            isSelf={person.isSelf}
            size={size - travelHomeTokens.sizes.avatarBorder * 2}
          />
        </View>
      ))}
      {remainder > 0 ? (
        <View
          accessible
          accessibilityLabel={`${remainder} more travelers`}
          style={[
            styles.count,
            {
              width: size,
              height: size,
              left: shown.length * (size - overlap),
              zIndex: 0,
              backgroundColor:
                theme.name === 'dark'
                  ? theme.backgroundSunken
                  : travelHomeTokens.colors.avatarCountSurface,
              borderColor: border,
              borderWidth: travelHomeTokens.sizes.avatarBorder,
            },
          ]}>
          <AppText
            variant="caption"
            fit
            numberOfLines={1}
            style={{
              color:
                theme.name === 'dark'
                  ? theme.accentPrimary
                  : travelHomeTokens.colors.avatarCountText,
              fontFamily: travelHomeFontFamily,
              fontSize: Math.max(12, s(13)),
              fontWeight: '400',
            }}>
            +{remainder}
          </AppText>
        </View>
      ) : null}
    </View>
  );

  if (!onPress) {
    return (
      <View accessibilityRole="text" accessibilityLabel={label}>
        {content}
      </View>
    );
  }

  const handlePress = () => {
    haptics.tap();
    onPress();
  };

  return (
    <AgentTestId testID={testID} label={label} onPress={handlePress}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={`Open travelers for ${tripTitle}`}
        onPress={handlePress}
        hitSlop={12}
        style={({ pressed }) => [
          styles.pressable,
          { minWidth: width },
          pressed ? styles.pressed : undefined,
        ]}>
        {content}
      </Pressable>
    </AgentTestId>
  );
}

const styles = StyleSheet.create({
  pressable: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  pressed: { opacity: 0.72 },
  row: {
    position: 'relative',
  },
  avatar: {
    position: 'absolute',
    top: 0,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  count: {
    position: 'absolute',
    top: 0,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
