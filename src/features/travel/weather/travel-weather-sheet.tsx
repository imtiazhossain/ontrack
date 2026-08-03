import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/primitives';
import { radii } from '@/design-system';
import { itinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';
import { TravelSheetModal } from '@/features/travel/travel-sheet';
import type { TravelPlan } from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import type { DateDisplayFormat } from '@/utils/date';
import { haptics } from '@/utils/haptics';

import { TravelWeatherCard } from './travel-weather-card';

export function TravelWeatherSheet({
  plan,
  visible,
  onClose,
  dateDisplayFormat,
}: {
  plan: TravelPlan;
  visible: boolean;
  onClose: () => void;
  dateDisplayFormat: DateDisplayFormat;
}) {
  const theme = useTheme();
  // Using same chrome as itinerary/currency for consistency
  const chrome = itinerarySheetChrome(theme);
  const { s, layout } = useResponsive();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const destinationLabel = plan.destination.trim() || undefined;
  const sheetMinHeight = Math.round(
    Math.max(320, windowHeight - insets.top - s(16)) * 0.92,
  );

  return (
    <TravelSheetModal
      visible={visible}
      eyebrow="WEATHER"
      title="Destination Weather"
      subtitle={destinationLabel}
      subtitleIcon={destinationLabel ? 'location' : undefined}
      onClose={onClose}
      closeAccessibilityLabel="Close weather"
      minHeight={sheetMinHeight}
      scrollKey={`${plan.id}-${visible ? 'open' : 'closed'}`}
      chrome={chrome}
      footer={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done"
          onPress={() => {
            haptics.tap();
            onClose();
          }}
          style={({ pressed }) => [
            styles.doneButton,
            {
              backgroundColor: chrome.ctaTo,
              minHeight: Math.max(layout.minTapTarget, s(52)),
              borderRadius: radii.pill,
              opacity: pressed ? 0.88 : 1,
            },
          ]}>
          <AppText
            variant="callout"
            fit
            numberOfLines={1}
            style={{ color: chrome.ctaText, fontWeight: '600' }}>
            Done
          </AppText>
        </Pressable>
      }>
      <View style={{ paddingTop: s(16) }}>
        <TravelWeatherCard
          destination={plan.destination}
          startDate={plan.startDate}
          endDate={plan.endDate}
          dateDisplayFormat={dateDisplayFormat}
        />
      </View>
    </TravelSheetModal>
  );
}

const styles = StyleSheet.create({
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
    boxShadow: '0 8px 18px rgba(80, 104, 64, 0.22)',
  },
});
