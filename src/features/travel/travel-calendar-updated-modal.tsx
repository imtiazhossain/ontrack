import { View } from 'react-native';

import { AppText, Button, SheetScaffold } from '@/components/primitives';
import { useResponsive } from '@/hooks/use-responsive';
import { AgentUiIds } from '@/utils/agent-ui';

export type TravelCalendarUpdatedPayload = {
  title: string;
  eventCount: number;
  startDate: string;
};

type TravelCalendarUpdatedModalProps = {
  payload: TravelCalendarUpdatedPayload | null;
  onGoToCalendar: (startDate: string) => void;
  onBackToTravel: () => void;
};

/** Calendar success uses the same sheet and action hierarchy as every other domain. */
export function TravelCalendarUpdatedModal({
  payload,
  onGoToCalendar,
  onBackToTravel,
}: TravelCalendarUpdatedModalProps) {
  const { spacing } = useResponsive();
  const eventLabel = payload
    ? `${payload.eventCount} ${payload.eventCount === 1 ? 'event' : 'events'} synced for “${payload.title}”.`
    : '';
  return (
    <SheetScaffold
      visible={payload != null}
      eyebrow="Success"
      title="Calendar Updated"
      subtitle="Your latest trip changes are now reflected in your schedule."
      onClose={onBackToTravel}
      closeAccessibilityLabel="Back to Travel"
      closeTestID={AgentUiIds.travel.calendarUpdated.dismiss}
      surface="glass">
      {payload ? (
        <View style={{ gap: spacing.lg }}>
          <AppText color="secondary" align="center">
            {eventLabel}
          </AppText>
          <Button
            variant="primary"
            icon="calendar"
            testID={AgentUiIds.travel.calendarUpdated.goToCalendar}
            accessibilityLabel="Go to Calendar"
            onPress={() => onGoToCalendar(payload.startDate)}>
            Go to Calendar
          </Button>
        </View>
      ) : null}
    </SheetScaffold>
  );
}
