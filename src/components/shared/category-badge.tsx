import { StyleSheet, View } from 'react-native';
import type { SymbolViewProps } from 'expo-symbols';

import { categoryColors, radii, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import type { ActivityCategory } from '@/types/models';
import { AppText, Symbol } from '@/components/primitives';

interface CategoryIconProps {
  category: ActivityCategory;
  size?: number;
}

/** Tinted circular icon for an activity category. */
export function CategoryIcon({ category, size = 40 }: CategoryIconProps) {
  const theme = useTheme();
  const colors = categoryColors(theme, category.colorKey);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.tint,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Symbol name={category.icon as SymbolViewProps['name']} size={size * 0.45} color={colors.main} />
    </View>
  );
}

interface CategoryBadgeProps {
  category: ActivityCategory;
}

/** Small pill label with the category color. */
export function CategoryBadge({ category }: CategoryBadgeProps) {
  const theme = useTheme();
  const colors = categoryColors(theme, category.colorKey);
  return (
    <View style={[styles.badge, { backgroundColor: colors.tint }]}>
      <AppText variant="caption" style={{ color: colors.main }}>
        {category.name}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
    alignSelf: 'flex-start',
  },
});
