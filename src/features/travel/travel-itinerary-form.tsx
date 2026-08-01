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
import type { RentalDetailsDraft } from '@/features/travel/rental-details';
import { RentalDetailsEditor } from '@/features/travel/rental-details-editor';
import { travelOverlineStyle } from '@/features/travel/travel-chrome';
import type { TravelItemKind } from '@/features/travel/types';

export const ITEM_KINDS: { value: TravelItemKind; label: string }[] = [
  { value: 'flight', label: 'Flight' },
  { value: 'stay', label: 'Stay' },
  { value: 'rental', label: 'Rental' },
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
  rentalDetails,
  rentalDetailsError,
  importedRentalFileName,
  importingRental,
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
  onRentalDetailsChange,
  onImportRental,
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
  rentalDetails: RentalDetailsDraft;
  rentalDetailsError?: string;
  importedRentalFileName?: string;
  importingRental: boolean;
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
  onRentalDetailsChange: (value: RentalDetailsDraft) => void;
  onImportRental: () => void;
  onAdd: () => void;
}) {
  return (
    <>
      <SectionHeader title="Add to the Plan" titleStyle={travelOverlineStyle} />
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
              : kind === 'rental'
                ? 'Hertz at KEF'
                : 'Dinner in Alfama'
        }
      />
      <View style={styles.twoColumns}>
        <View style={styles.flex}>
          <DateField
            label={kind === 'rental' ? 'Pick-up Date' : 'Date'}
            value={date}
            minimumDate={planStartDate}
            maximumDate={planEndDate}
            onChange={onDateChange}
          />
        </View>
        <View style={styles.flex}>
          <TimeField
            label={kind === 'rental' ? 'Pick-up Time' : 'Time'}
            value={startMinutes}
            onChange={onStartMinutesChange}
          />
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
      {kind === 'rental' ? (
        <RentalDetailsEditor
          value={rentalDetails}
          onChange={onRentalDetailsChange}
          error={rentalDetailsError}
          importedFileName={importedRentalFileName}
          importing={importingRental}
          onImport={onImportRental}
          planStartDate={planStartDate}
          planEndDate={planEndDate}
        />
      ) : null}
      <Input
        label="Details"
        value={details}
        onChangeText={onDetailsChange}
        placeholder={
          kind === 'flight'
            ? 'Terminal, baggage, or check-in notes…'
            : kind === 'rental'
              ? 'Insurance, driver, or desk notes…'
              : 'Confirmation number, meeting point, ideas…'
        }
        multiline
      />
      <Input
        label="Booking Link (Optional)"
        value={bookingUrl}
        onChangeText={onBookingUrlChange}
        placeholder="https://…"
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {error ? <ErrorMessage message={error} selectable /> : null}
      <Button onPress={onAdd}>Add Itinerary Item</Button>
    </>
  );
}

const styles = StyleSheet.create({
  twoColumns: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1, minWidth: 0, gap: spacing.xxs },
});
