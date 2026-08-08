import { useEffect, useState } from 'react';
import { View } from 'react-native';

import {
  AppText,
  DateFieldCalendar,
  ErrorMessage,
  SegmentedControl,
} from '@/components/primitives';
import { validateTravelDateRange } from '@/features/travel/date-range';
import { TravelSheetPrimaryAction } from '@/features/travel/travel-list-actions';
import { TravelSheetModal } from '@/features/travel/travel-sheet';
import type { TravelItineraryItem } from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { usePreferences } from '@/store/preferences';
import { AgentUiIds } from '@/utils/agent-ui';
import { formatDateKey, fromDateKey, toDateKey } from '@/utils/date';

type ActiveEndpoint = 'start' | 'end';

interface TravelTripDatesSheetProps {
  visible: boolean;
  tripTitle: string;
  startDate: string;
  endDate: string;
  itinerary: TravelItineraryItem[];
  onClose: () => void;
  onSave: (startDate: string, endDate: string) => void;
}

function monthCursor(dateKey: string): Date {
  const date = fromDateKey(dateKey);
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

/** One travel-themed calendar for selecting both endpoints of a trip. */
export function TravelTripDatesSheet({
  visible,
  tripTitle,
  startDate,
  endDate,
  itinerary,
  onClose,
  onSave,
}: TravelTripDatesSheetProps) {
  const { spacing } = useResponsive();
  const dateDisplayFormat = usePreferences((state) => state.dateDisplayFormat);
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);
  const [draftSource, setDraftSource] = useState(`${startDate}:${endDate}`);
  const [activeEndpoint, setActiveEndpoint] = useState<ActiveEndpoint>('start');
  const [cursor, setCursor] = useState(() => monthCursor(startDate));
  const [error, setError] = useState<string>();
  const currentSource = `${startDate}:${endDate}`;
  const draftIsCurrent = draftSource === currentSource;
  const hasDateChanges =
    draftIsCurrent && (draftStart !== startDate || draftEnd !== endDate);

  useEffect(() => {
    if (!visible) return;
    setDraftStart(startDate);
    setDraftEnd(endDate);
    setDraftSource(currentSource);
    setActiveEndpoint('start');
    setCursor(monthCursor(startDate));
    setError(undefined);
  }, [currentSource, endDate, startDate, visible]);

  const chooseEndpoint = (endpoint: ActiveEndpoint) => {
    setActiveEndpoint(endpoint);
    setCursor(monthCursor(endpoint === 'start' ? draftStart : draftEnd));
    setError(undefined);
  };

  const chooseDate = (date: Date) => {
    const key = toDateKey(date);
    setError(undefined);
    if (activeEndpoint === 'start') {
      setDraftStart(key);
      if (draftEnd < key) setDraftEnd(key);
      setActiveEndpoint('end');
      return;
    }
    setDraftEnd(key);
  };

  const save = () => {
    if (!draftIsCurrent || !hasDateChanges) return;
    const validation = validateTravelDateRange(draftStart, draftEnd, itinerary);
    if (validation.error) {
      setError(validation.error);
      return;
    }
    onSave(draftStart, draftEnd);
  };

  const endpointOptions = [
    {
      value: 'start' as const,
      label: `From · ${formatDateKey(draftStart, dateDisplayFormat)}`,
      icon: 'calendar' as const,
      testID: AgentUiIds.travel.dates.start,
    },
    {
      value: 'end' as const,
      label: `To · ${formatDateKey(draftEnd, dateDisplayFormat)}`,
      icon: 'calendar' as const,
      testID: AgentUiIds.travel.dates.end,
    },
  ];

  return (
    <TravelSheetModal
      visible={visible}
      eyebrow="Travel dates"
      title="Choose Your Trip Range"
      subtitle={tripTitle}
      subtitleIcon="calendar"
      onClose={onClose}
      closeAccessibilityLabel="Close trip dates"
      closeTestID={AgentUiIds.travel.dates.close}
      scrollKey={`${activeEndpoint}:${cursor.toISOString()}`}
      footer={
        <TravelSheetPrimaryAction
          label="Save Dates"
          icon="check"
          onPress={save}
          disabled={!hasDateChanges}
          testID={AgentUiIds.travel.dates.save}
        />
      }>
      <View style={{ gap: spacing.md }}>
        <SegmentedControl
          label="Select a date to edit"
          value={activeEndpoint}
          options={endpointOptions}
          onChange={chooseEndpoint}
        />
        <AppText variant="caption" color="secondary" align="center">
          {activeEndpoint === 'start'
            ? 'Choose the first day of your trip.'
            : 'Choose the final day of your trip.'}
        </AppText>
        <DateFieldCalendar
          value={fromDateKey(activeEndpoint === 'start' ? draftStart : draftEnd)}
          cursor={cursor}
          rangeStart={fromDateKey(draftStart)}
          rangeEnd={fromDateKey(draftEnd)}
          minimumDate={activeEndpoint === 'end' ? fromDateKey(draftStart) : undefined}
          onCursorChange={setCursor}
          onValueChange={chooseDate}
          controlAppearance="glass"
          testID={AgentUiIds.travel.dates.calendar}
        />
        {error ? <ErrorMessage message={error} selectable /> : null}
      </View>
    </TravelSheetModal>
  );
}
