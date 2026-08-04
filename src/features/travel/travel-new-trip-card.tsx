import {
  ErrorMessage,
  Input,
  ScreenHeader,
} from '@/components/primitives';
import {
  itinerarySheetChrome,
  itinerarySheetFieldProps,
} from '@/features/travel/travel-itinerary-sheet-chrome';
import { TravelSheetPrimaryAction } from '@/features/travel/travel-list-actions';
import { TravelDateRangeEditor } from '@/features/travel/travel-date-range-editor';
import { TravelPlanModePicker } from '@/features/travel/travel-mode-picker';
import { TravelSurfaceCard } from '@/features/travel/travel-surface';
import type { TravelPlanMode } from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds } from '@/utils/agent-ui';

interface TravelNewTripCardProps {
  title: string;
  mode: TravelPlanMode;
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  notes: string;
  error?: string;
  onTitleChange: (value: string) => void;
  onModeChange: (value: TravelPlanMode) => void;
  onOriginChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onCreate: () => void;
  onClose?: () => void;
}

/** Focused new-trip form kept outside the travel list orchestrator. */
export function TravelNewTripCard({
  title,
  mode,
  origin,
  destination,
  startDate,
  endDate,
  notes,
  error,
  onTitleChange,
  onModeChange,
  onOriginChange,
  onDestinationChange,
  onStartDateChange,
  onEndDateChange,
  onNotesChange,
  onCreate,
  onClose,
}: TravelNewTripCardProps) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { s } = useResponsive();

  return (
    <TravelSurfaceCard stripe>
      <ScreenHeader
        title="Start a New Trip"
        onClose={onClose}
        closeAccessibilityLabel="Cancel New Trip"
        closeTestID={AgentUiIds.travel.newTrip.cancel}
      />
      <Input
        testID={AgentUiIds.travel.newTrip.title}
        icon="flight"
        stackedLabel="Trip Name"
        value={title}
        onChangeText={onTitleChange}
        placeholder="Birthday in Lisbon"
        accessibilityLabel="Trip Name"
        {...itinerarySheetFieldProps(chrome, 'flight')}
      />
      <TravelPlanModePicker value={mode} onChange={onModeChange} />
      <Input
        testID={AgentUiIds.travel.newTrip.origin}
        icon="route"
        stackedLabel="Starting Point"
        value={origin}
        onChangeText={onOriginChange}
        placeholder="New York, NY (optional)"
        accessibilityLabel="Starting Point, optional"
        {...itinerarySheetFieldProps(chrome, 'location')}
      />
      <Input
        testID={AgentUiIds.travel.newTrip.destination}
        icon="location"
        stackedLabel="Destination"
        value={destination}
        onChangeText={onDestinationChange}
        placeholder="Lisbon, Portugal"
        accessibilityLabel="Destination"
        {...itinerarySheetFieldProps(chrome, 'location')}
      />
      <TravelDateRangeEditor
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
        stacked
        startTestID={AgentUiIds.travel.newTrip.startDate}
        endTestID={AgentUiIds.travel.newTrip.endDate}
      />
      <Input
        testID={AgentUiIds.travel.newTrip.notes}
        icon="note"
        stackedLabel="Notes"
        value={notes}
        onChangeText={onNotesChange}
        placeholder="Ideas, budgets, must-dos…"
        multiline
        textAlignVertical="top"
        style={{ minHeight: Math.max(32, s(36)) }}
        accessibilityLabel="Notes"
        {...itinerarySheetFieldProps(chrome, 'note')}
      />
      {error ? <ErrorMessage message={error} /> : null}
      <TravelSheetPrimaryAction
        label="Create Trip"
        icon="flight"
        testID={AgentUiIds.travel.newTrip.create}
        onPress={onCreate}
      />
    </TravelSurfaceCard>
  );
}
