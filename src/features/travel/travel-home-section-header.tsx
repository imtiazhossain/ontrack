import { Pressable, StyleSheet, Text, TextInput } from 'react-native';

import { Symbol } from '@/components/primitives';
import { TravelHomeGlass } from '@/features/travel/travel-home-glass';
import {
  travelHomeFontFamily,
  travelHomeTokens,
} from '@/features/travel/travel-home-tokens';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds, useAgentUiTarget } from '@/utils/agent-ui';

type TravelHomeSectionHeaderProps = {
  /** Placeholder when search is shown; visible title when search is omitted. */
  title: string;
  count?: number;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
};

/**
 * Full-width trip search (placeholder doubles as section label) + count badge.
 * Frosted glass plate so chrome stays readable over the atmosphere photo.
 */
export function TravelHomeSectionHeader({
  title,
  count,
  searchQuery = '',
  onSearchQueryChange,
}: TravelHomeSectionHeaderProps) {
  const theme = useTheme();
  const { s, spacing: rs } = useResponsive();
  const dark = theme.name === 'dark';
  // Theme-native glass: light frost in light mode, dark frost in dark.
  const plateInk = dark ? '#FFFFFF' : travelHomeTokens.colors.ink;
  const fieldInk = plateInk;
  const fieldMuted = dark
    ? 'rgba(255,255,255,0.88)'
    : travelHomeTokens.colors.inkMuted;
  const titleSize = Math.max(18, s(travelHomeTokens.sizes.sectionTitle));
  const searchTextSize = Math.max(15, s(travelHomeTokens.sizes.searchFieldText));
  const showCount = count !== undefined && count > 0;
  const circle = Math.max(22, s(travelHomeTokens.sizes.countCircle));
  const tripsWord = count === 1 ? 'trip' : 'trips';
  const padX = Math.max(12, rs.sm);
  const padY = Math.max(8, s(8));
  const radius = Math.max(14, s(16));
  const fieldHeight = Math.max(36, s(38));
  const searchIconSize = Math.max(14, Math.round(searchTextSize * 0.92));
  const showSearch = typeof onSearchQueryChange === 'function';
  const searchAgent = useAgentUiTarget(AgentUiIds.travel.list.search, {
    label: title,
    value: searchQuery,
  });
  const clearAgent = useAgentUiTarget(
    searchQuery.trim() ? AgentUiIds.travel.list.searchClear : undefined,
    {
      label: 'Clear trip search',
      onPress: () => onSearchQueryChange?.(''),
    },
  );

  const countBadge = showCount ? (
    <TravelHomeGlass
      inverted
      intensity={dark ? 56 : 44}
      accessibilityRole="text"
      accessibilityLabel={`${count} ${tripsWord}`}
      style={[
        styles.badge,
        {
          width: circle,
          height: circle,
          borderRadius: circle / 2,
        },
      ]}>
      <Text
        allowFontScaling
        maxFontSizeMultiplier={1.1}
        numberOfLines={1}
        style={{
          // Opposite the scoop: dark frost + white (light); light frost + ink (dark).
          color: dark ? travelHomeTokens.colors.ink : '#FFFFFF',
          fontSize: Math.max(11, s(12)),
          fontWeight: '400',
          fontFamily: travelHomeFontFamily,
        }}>
        {count}
      </Text>
    </TravelHomeGlass>
  ) : null;

  return (
    <TravelHomeGlass
      intensity={dark ? 48 : 44}
      style={[
        styles.plate,
        {
          borderRadius: radius,
          paddingHorizontal: padX,
          paddingVertical: padY,
          minHeight: Math.max(40, s(40)),
          gap: s(8),
        },
      ]}>
      {showSearch ? (
        <TravelHomeGlass
          intensity={dark ? 36 : 52}
          style={[
            styles.search,
            {
              height: fieldHeight,
              borderRadius: fieldHeight / 2,
              paddingLeft: Math.max(10, s(10)),
              paddingRight: Math.max(4, s(4)),
              gap: s(6),
            },
          ]}>
          <Symbol name="search" size={searchIconSize} color={fieldMuted} />
          <TextInput
            ref={searchAgent.ref as never}
            testID={searchAgent.testID}
            onLayout={searchAgent.onLayout}
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            placeholder={title}
            placeholderTextColor={fieldMuted}
            accessibilityLabel={title}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="never"
            underlineColorAndroid="transparent"
            style={{
              flex: 1,
              flexShrink: 1,
              minWidth: 0,
              paddingVertical: 0,
              color: fieldInk,
              fontFamily: travelHomeFontFamily,
              fontSize: searchTextSize,
              lineHeight: Math.round(searchTextSize * 1.2),
              fontWeight: '400',
              letterSpacing: -0.2,
            }}
          />
          {searchQuery.trim() ? (
            <Pressable
              ref={clearAgent.ref as never}
              testID={clearAgent.testID}
              onLayout={clearAgent.onLayout}
              accessibilityRole="button"
              accessibilityLabel="Clear trip search"
              hitSlop={8}
              onPress={() => onSearchQueryChange?.('')}
              style={{
                width: Math.max(22, s(22)),
                height: Math.max(22, s(22)),
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Symbol
                name="close"
                size={Math.max(12, s(13))}
                color={fieldMuted}
              />
            </Pressable>
          ) : null}
          {countBadge}
        </TravelHomeGlass>
      ) : (
        <>
          <Text
            allowFontScaling
            maxFontSizeMultiplier={1.15}
            numberOfLines={1}
            style={{
              flex: 1,
              flexShrink: 1,
              minWidth: 0,
              color: plateInk,
              fontFamily: travelHomeFontFamily,
              fontSize: titleSize,
              lineHeight: titleSize * 1.15,
              fontWeight: '400',
              letterSpacing: -0.3,
            }}>
            {title}
          </Text>
          {countBadge}
        </>
      )}
    </TravelHomeGlass>
  );
}

const styles = StyleSheet.create({
  plate: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
