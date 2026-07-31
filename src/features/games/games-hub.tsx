import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, Screen, SectionHeader, Symbol } from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/utils/haptics';

import { balloonFill } from './balloon-pop/colors';

/** Games add-on hub — lists available mini-games. */
export function GamesHub() {
  const theme = useTheme();
  const router = useRouter();
  const preview = ['red', 'blue', 'green', 'yellow'] as const;

  return (
    <Screen>
      <SectionHeader title="Games" detail="Short breaks, quick focus" />
      <AppText variant="body" color="secondary" style={styles.intro}>
        Toggle Games off anytime in Profile → Add-ons. Progress stays local to each round.
      </AppText>

      <Card
        accessibilityLabel="Play Balloon Pop"
        onPress={() => {
          haptics.select();
          router.push('/games/balloon-pop' as never);
        }}
        style={styles.card}>
        <View style={styles.cardRow}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: theme.accentFaint },
            ]}>
            <Symbol name="games" size={28} color={theme.accentPrimary} />
          </View>
          <View style={styles.cardCopy}>
            <AppText variant="subheading">Balloon Pop</AppText>
            <AppText variant="callout" color="secondary">
              Pop the target color before the clock runs out. Fans add wind as levels climb.
            </AppText>
            <View style={styles.swatches}>
              {preview.map((id) => (
                <View
                  key={id}
                  style={[
                    styles.swatch,
                    { backgroundColor: balloonFill(id, theme.name === 'dark') },
                  ]}
                />
              ))}
            </View>
          </View>
          <Symbol name="chevron-right" size={20} color={theme.textTertiary} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  swatches: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: radii.pill,
  },
});
