import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/primitives';
import { spacing } from '@/design-system';
import { googleCurrencyConversionUrl } from '@/features/travel/currency-conversion-link';
import type { TravelPlan } from '@/features/travel/types';
import { googleWeatherUrl } from '@/features/travel/weather';

export function TravelPlanActions({
  plan,
  dateLocale,
  onOpenExpenses,
}: {
  plan: TravelPlan;
  dateLocale: string;
  onOpenExpenses?: () => void;
}) {
  const router = useRouter();
  return (
    <View style={styles.actions}>
      <Button
        variant="secondary"
        icon="chat"
        onPress={() =>
          router.push({ pathname: '/travel/[id]/chat', params: { id: plan.id } } as never)
        }>
        Group chat
      </Button>
      <Button
        variant="secondary"
        onPress={() =>
          router.push({ pathname: '/travel/[id]/flights', params: { id: plan.id } } as never)
        }>
        Find flights
      </Button>
      <Button
        variant="secondary"
        onPress={() =>
          router.push({ pathname: '/travel/[id]/stays', params: { id: plan.id } } as never)
        }>
        Find stays
      </Button>
      <Button
        variant="secondary"
        icon="weather"
        onPress={() =>
          void WebBrowser.openBrowserAsync(
            googleWeatherUrl(plan.destination, plan.startDate, plan.endDate),
          )
        }>
        Weather
      </Button>
      <Button
        variant="secondary"
        icon="currency"
        onPress={() =>
          void WebBrowser.openBrowserAsync(
            googleCurrencyConversionUrl(plan.destination, dateLocale),
          )
        }
        accessibilityLabel={`Convert your home currency for ${plan.destination} with Google`}>
        Currency
      </Button>
      {onOpenExpenses ? (
        <Button
          variant="secondary"
          icon="receipt"
          onPress={onOpenExpenses}
          accessibilityLabel={`Track expenses for ${plan.title}`}>
          Expenses
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
