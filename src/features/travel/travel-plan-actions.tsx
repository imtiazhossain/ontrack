import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/primitives';
import { spacing } from '@/design-system';
import type { TravelPlan } from '@/features/travel/types';
import { googleWeatherUrl } from '@/features/travel/weather';
import { AgentUiIds } from '@/utils/agent-ui';

export function TravelPlanActions({
  plan,
  onOpenCurrency,
}: {
  plan: TravelPlan;
  onOpenCurrency: () => void;
}) {
  return (
    <View style={styles.actions}>
      <Button
        variant="secondary"
        icon="weather"
        style={styles.action}
        testID={AgentUiIds.travel.planDetail.weather}
        accessibilityLabel={`Weather for ${plan.destination}`}
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
        style={styles.action}
        testID={AgentUiIds.travel.planDetail.currency}
        onPress={onOpenCurrency}
        accessibilityLabel={`Convert your home currency for ${plan.destination}`}>
        Currency
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: {
    flexBasis: 0,
    flexGrow: 1,
    minWidth: '45%',
    paddingHorizontal: spacing.sm,
  },
});
