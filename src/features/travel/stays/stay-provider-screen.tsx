import { StyleSheet, View } from 'react-native';

import {
  AppText,
  BackButton,
  Card,
  EmptyState,
  Screen,
  Symbol,
} from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import {
  searchStays,
  stayProviders,
  staySearchInput,
} from '@/features/travel/stays/provider';
import { FeatureThemeProvider, useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/store/preferences';
import { useTravel } from '@/store/travel';
import { formatDateKey } from '@/utils/date';

export function StayProviderScreen({ planId }: { planId: string }) {
  return (
    <FeatureThemeProvider feature="travel">
      <StayProviderScreenContent planId={planId} />
    </FeatureThemeProvider>
  );
}

function StayProviderScreenContent({ planId }: { planId: string }) {
  const theme = useTheme();
  const plan = useTravel((state) => state.plans.find((item) => item.id === planId));
  const dateDisplayFormat = usePreferences((state) => state.dateDisplayFormat);

  if (!plan) {
    return (
      <Screen>
        <BackButton />
        <EmptyState
          icon="bed.double.fill"
          title="Trip not found"
          message="This trip may have been removed."
        />
      </Screen>
    );
  }

  const search = staySearchInput(plan);
  const guestLabel = `${search.guests} ${search.guests === 1 ? 'guest' : 'guests'}`;

  return (
    <Screen contentStyle={styles.screen}>
      <BackButton accessibilityLabel="Back to trip" />

      <View style={styles.heading}>
        <AppText variant="overline" color="accent">Stay search</AppText>
        <AppText variant="title">Where do you want to check?</AppText>
        <AppText variant="body" color="secondary">
          Choose a provider. Your destination, dates, and travelers are ready to go.
        </AppText>
      </View>

      <Card variant="sunken" style={styles.tripSummary}>
        <View style={styles.summaryRow}>
          <Symbol name="mappin.and.ellipse" size="sm" color={theme.accentPrimary} />
          <AppText variant="subheading" style={styles.flex}>{search.destination}</AppText>
        </View>
        <View style={styles.summaryDetails}>
          <View style={styles.summaryDetail}>
            <Symbol name="calendar" size="sm" color={theme.textTertiary} />
            <AppText variant="caption" color="secondary">
              {formatDateKey(search.checkIn, dateDisplayFormat)} →{' '}
              {formatDateKey(search.checkOut, dateDisplayFormat)}
            </AppText>
          </View>
          <View style={styles.summaryDetail}>
            <Symbol name="person.2.fill" size="sm" color={theme.textTertiary} />
            <AppText variant="caption" color="secondary">{guestLabel}</AppText>
          </View>
        </View>
      </Card>

      <View style={styles.providers}>
        {stayProviders.map((provider) => (
          <Card
            key={provider.id}
            onPress={() => void searchStays(provider, plan)}
            accessibilityLabel={`Search ${provider.name} for stays in ${plan.destination}`}
            style={styles.providerCard}>
            <View
              style={[
                styles.providerIcon,
                { backgroundColor: theme.accentFaint },
              ]}>
              <Symbol name={provider.icon} size="lg" color={theme.accentPrimary} />
            </View>
            <View style={styles.flex}>
              <AppText variant="subheading">{provider.name}</AppText>
              <AppText variant="caption" color="secondary">
                {provider.description}
              </AppText>
            </View>
            <Symbol
              name="arrow.up.right"
              size="sm"
              color={theme.textTertiary}
            />
          </Card>
        ))}
      </View>

      <AppText variant="caption" color="tertiary" align="center">
        Results open securely on each provider’s website.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl },
  heading: { gap: spacing.sm },
  tripSummary: { gap: spacing.md },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  summaryDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  providers: { gap: spacing.md },
  providerCard: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  providerIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
});
