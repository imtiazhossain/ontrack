import { StyleSheet, Text, View } from 'react-native';

import {
    travelHomeFontFamily,
    travelHomeTokens,
} from '@/features/travel/travel-home-tokens';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

type TravelHomeSectionHeaderProps = {
  title: string;
  count?: number;
};

/**
 * “Your Trips” serif title + separate circular count (card navy fill).
 * STRICT: not a solid navy “3 Trips” pill.
 */
export function TravelHomeSectionHeader({
  title,
  count,
}: TravelHomeSectionHeaderProps) {
  const theme = useTheme();
  const { s } = useResponsive();
  const ink =
    theme.name === 'dark' ? theme.textPrimary : travelHomeTokens.colors.ink;
  const titleSize = Math.max(18, s(travelHomeTokens.sizes.sectionTitle));
  const showCount = count !== undefined && count > 0;
  const circle = Math.max(22, s(travelHomeTokens.sizes.countCircle));
  const tripsWord = count === 1 ? 'trip' : 'trips';

  return (
    <View style={[styles.row, { minHeight: Math.max(24, s(24)), gap: s(10) }]}>
      <Text
        allowFontScaling
        maxFontSizeMultiplier={1.15}
        numberOfLines={1}
        style={{
          flex: 1,
          flexShrink: 1,
          minWidth: 0,
          color: ink,
          fontFamily: travelHomeFontFamily,
          fontSize: titleSize,
          lineHeight: titleSize * 1.15,
          fontWeight: '400',
          letterSpacing: -0.3,
        }}>
        {title}
      </Text>
      {showCount ? (
        <View
          accessibilityRole="text"
          accessibilityLabel={`${count} ${tripsWord}`}
          style={[
            styles.badge,
            {
              width: circle,
              height: circle,
              borderRadius: circle / 2,
              backgroundColor: travelHomeTokens.colors.countCircle,
              boxShadow:
                theme.name === 'dark'
                  ? undefined
                  : travelHomeTokens.colors.shadow,
            },
          ]}>
          <Text
            allowFontScaling
            maxFontSizeMultiplier={1.1}
            numberOfLines={1}
            style={{
              color: '#FFFFFF',
              fontSize: Math.max(11, s(12)),
              fontWeight: '400',
              fontFamily: travelHomeFontFamily,
            }}>
            {count}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
