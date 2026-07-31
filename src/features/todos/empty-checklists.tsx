import { StyleSheet, View } from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';

export function EmptyChecklists() {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.emptyState,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.separator,
        },
      ]}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.emptyIllustration}>
        <View
          style={[
            styles.emptyPaperBack,
            styles.emptyPaperBackLeft,
            {
              backgroundColor: theme.accentFaint,
              borderColor: theme.separator,
            },
          ]}
        />
        <View
          style={[
            styles.emptyPaperBack,
            styles.emptyPaperBackRight,
            {
              backgroundColor: theme.backgroundSunken,
              borderColor: theme.separator,
            },
          ]}
        />
        <View
          style={[
            styles.emptyPaper,
            {
              backgroundColor: theme.backgroundElevated,
              borderColor: theme.separator,
            },
          ]}>
          <View
            style={[
              styles.emptyPaperBadge,
              { backgroundColor: theme.accentFaint },
            ]}>
            <Symbol name="tasks" size={24} color={theme.accentPrimary} />
          </View>
          {[0.72, 0.9, 0.58].map((width, index) => (
            <View key={width} style={styles.emptyPaperRow}>
              <View
                style={[
                  styles.emptyPaperCheck,
                  {
                    borderColor:
                      index === 0 ? theme.accentPrimary : theme.separator,
                    backgroundColor:
                      index === 0 ? theme.accentFaint : 'transparent',
                  },
                ]}>
                {index === 0 ? (
                  <Symbol name="check" size={11} color={theme.accentPrimary} />
                ) : null}
              </View>
              <View
                style={[
                  styles.emptyPaperLine,
                  {
                    width: `${width * 100}%`,
                    backgroundColor:
                      index === 0 ? theme.accentSoft : theme.separator,
                  },
                ]}
              />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.emptyCopy}>
        <AppText variant="heading" align="center">
          A clear slate
        </AppText>
        <AppText
          variant="body"
          color="secondary"
          align="center"
          style={styles.emptyMessage}>
          Give your first list a name above. Groceries, weekend plans, packing—
          whatever helps quiet your mind.
        </AppText>
      </View>

      <View
        style={[
          styles.emptyHint,
          {
            backgroundColor: theme.accentFaint,
          },
        ]}>
        <Symbol name="arrow-up" size={15} color={theme.accentPrimary} />
        <AppText variant="caption" color="accent">
          Start with the field above
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    gap: spacing.xl,
    marginTop: spacing.sm,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.xl,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  emptyIllustration: {
    width: 176,
    height: 142,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPaperBack: {
    position: 'absolute',
    width: 122,
    height: 116,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
  },
  emptyPaperBackLeft: {
    transform: [{ rotate: '-8deg' }, { translateX: -12 }],
  },
  emptyPaperBackRight: {
    transform: [{ rotate: '8deg' }, { translateX: 12 }],
  },
  emptyPaper: {
    width: 132,
    minHeight: 126,
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    boxShadow: '0 10px 24px rgba(27, 24, 21, 0.10)',
  },
  emptyPaperBadge: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: radii.pill,
  },
  emptyPaperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyPaperCheck: {
    width: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: radii.pill,
  },
  emptyPaperLine: {
    maxWidth: 70,
    height: 5,
    borderRadius: radii.pill,
    opacity: 0.7,
  },
  emptyCopy: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyMessage: {
    maxWidth: 360,
  },
  emptyHint: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
  },
});
