import { StyleSheet, View } from 'react-native';

import {
  Button,
  DateField,
  ErrorMessage,
  Input,
  SectionHeader,
  TimeField,
} from '@/components/primitives';
import { ChipRow } from '@/components/shared';
import { spacing } from '@/design-system';
import type { FlightDetailsDraft } from '@/features/travel/flight-details';
import { FlightDetailsEditor } from '@/features/travel/flight-details-editor';
import type { TravelItemKind } from '@/features/travel/types';

export const ITEM_KINDS: { value: TravelItemKind; label: string }[] = [
  { value: 'flight', label: 'Flight' },
  { value: 'stay', label: 'Stay' },
  { value: 'activity', label: 'Activity' },
];

export function TravelItineraryForm({
  kind,
  title,
  date,
  startMinutes,
  duration,
  details,
  bookingUrl,
  flightDetails,
  flightDetailsError,
  importedFlightFileName,
  importingFlight,
  error,
  planStartDate,
  planEndDate,
  onKindChange,
  onTitleChange,
  onDateChange,
  onStartMinutesChange,
  onDurationChange,
  onDetailsChange,
  onBookingUrlChange,
  onFlightDetailsChange,
  onImportFlight,
  onAdd,
}: {
  kind: TravelItemKind;
  title: string;
  date: string;
  startMinutes: number;
  duration: string;
  details: string;
  bookingUrl: string;
  flightDetails: FlightDetailsDraft;
  flightDetailsError?: string;
  importedFlightFileName?: string;
  importingFlight: boolean;
  error?: string;
  planStartDate: string;
  planEndDate: string;
  onKindChange: (kind: TravelItemKind) => void;
  onTitleChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onStartMinutesChange: (value: number) => void;
  onDurationChange: (value: string) => void;
  onDetailsChange: (value: string) => void;
  onBookingUrlChange: (value: string) => void;
  onFlightDetailsChange: (value: FlightDetailsDraft) => void;
  onImportFlight: () => void;
  onAdd: () => void;
}) {
  return (
    <>
      <SectionHeader title="Add to the plan" />
      <ChipRow options={ITEM_KINDS} selected={kind} onSelect={onKindChange} />
      <Input
        label="Name"
        value={title}
        onChangeText={onTitleChange}
        placeholder={
          kind === 'flight'
            ? 'Flight to Lisbon'
            : kind === 'stay'
              ? 'Hotel check-in'
              : 'Dinner in Alfama'
        }
      />
      <View style={styles.twoColumns}>
        <View style={styles.flex}>
          <DateField
            label="Date"
            value={date}
            minimumDate={planStartDate}
            maximumDate={planEndDate}
            onChange={onDateChange}
          />
        </View>
        <View style={styles.flex}>
          <TimeField label="Time" value={startMinutes} onChange={onStartMinutesChange} />
        </View>
      </View>
      <Input
        label="Duration (minutes)"
        value={duration}
        onChangeText={onDurationChange}
        keyboardType="number-pad"
      />
      {kind === 'flight' ? (
        <FlightDetailsEditor
          value={flightDetails}
          onChange={onFlightDetailsChange}
          error={flightDetailsError}
          importedFileName={importedFlightFileName}
          importing={importingFlight}
          onImport={onImportFlight}
        />
      ) : null}
      <Input
        label="Details"
        value={details}
        onChangeText={onDetailsChange}
        placeholder={
          kind === 'flight'
            ? 'Terminal, baggage, or check-in notes…'
            : 'Confirmation number, meeting point, ideas…'
        }
        multiline
      />
      <Input
        label="Booking link (optional)"
        value={bookingUrl}
        onChangeText={onBookingUrlChange}
        placeholder="https://…"
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {error ? <ErrorMessage message={error} selectable /> : null}
      <Button onPress={onAdd}>Add itinerary item</Button>
    </>
  );
}

const styles = StyleSheet.create({
  twoColumns: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1, gap: spacing.xxs },
});
