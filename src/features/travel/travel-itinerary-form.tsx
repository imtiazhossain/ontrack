import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  Button,
  DateField,
  ErrorMessage,
  Input,
  Symbol,
  TimeField,
} from '@/components/primitives';
import { radii } from '@/design-system';
import type { FlightDetailsDraft } from '@/features/travel/flight-details';
import { FlightDetailsEditor } from '@/features/travel/flight-details-editor';
import type { RentalDetailsDraft } from '@/features/travel/rental-details';
import { RentalDetailsEditor } from '@/features/travel/rental-details-editor';
import { ConfirmationImportBanner } from '@/features/travel/confirmation-import-banner';
import { AddressAutofindField } from '@/features/travel/address-autofind-field';
import type { StayDetailsDraft } from '@/features/travel/stay-details';
import { TravelAddPhotosModal } from '@/features/travel/travel-add-photos-modal';
import {
  itinerarySheetChrome,
  itinerarySheetFieldProps,
} from '@/features/travel/travel-itinerary-sheet-chrome';
import { ItinerarySheetImportCard } from '@/features/travel/travel-itinerary-sheet-fields';
import type { TravelItemKind } from '@/features/travel/types';
import type { TransportDetailsDraft } from '@/features/travel/transport-details';
import { TransportDetailsEditor } from '@/features/travel/transport-details-editor';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds } from '@/utils/agent-ui';
import { pickCameraImage, pickLibraryImages } from '@/utils/pick-image';

/** Silent cap for itinerary details / notes (no counter in the UI). */
export const DETAILS_MAX_LENGTH = 1000;

/** Source picker for confirmation import (in-sheet; appPrompt sits behind Modals). */
export type ConfirmationImportSource = 'document' | 'screenshots';

export const ITEM_KINDS: { value: TravelItemKind; label: string }[] = [
  { value: 'moment', label: 'Moment' },
  { value: 'activity', label: 'Activity' },
  { value: 'flight', label: 'Flight' },
  { value: 'transport', label: 'Transport' },
  { value: 'stay', label: 'Stay' },
  { value: 'rental', label: 'Rental' },
];

export function TravelItineraryForm({
  kind,
  title,
  date,
  startMinutes,
  endDate,
  endMinutes,
  duration,
  details,
  bookingUrl,
  photoUris,
  flightDetails,
  flightDetailsError,
  importedFlightFileName,
  importingFlight,
  transportDetails,
  transportDetailsError,
  rentalDetails,
  rentalDetailsError,
  importedRentalFileName,
  importingRental,
  stayDetails,
  stayDetailsError,
  importedStayFileName,
  importingStay,
  error,
  importStatusLabel,
  planStartDate,
  planEndDate,
  onTitleChange,
  onDateChange,
  onStartMinutesChange,
  onEndDateChange,
  onEndMinutesChange,
  onDurationChange,
  onDetailsChange,
  onBookingUrlChange,
  onPhotoUrisChange,
  onFlightDetailsChange,
  onImportFlight,
  onTransportDetailsChange,
  onRentalDetailsChange,
  onImportRental,
  onStayDetailsChange,
  onImportStay,
  onAdd,
  hideSubmit = false,
}: {
  kind: TravelItemKind;
  title: string;
  date: string;
  startMinutes: number | null;
  endDate: string;
  endMinutes: number | null;
  duration: string;
  details: string;
  bookingUrl: string;
  photoUris: string[];
  flightDetails: FlightDetailsDraft;
  flightDetailsError?: string;
  importedFlightFileName?: string;
  importingFlight: boolean;
  transportDetails: TransportDetailsDraft;
  transportDetailsError?: string;
  rentalDetails: RentalDetailsDraft;
  rentalDetailsError?: string;
  importedRentalFileName?: string;
  importingRental: boolean;
  stayDetails: StayDetailsDraft;
  stayDetailsError?: string;
  importedStayFileName?: string;
  importingStay: boolean;
  error?: string;
  /** Shown while the system picker opens or OCR runs. */
  importStatusLabel?: string;
  planStartDate: string;
  planEndDate: string;
  onTitleChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onStartMinutesChange: (value: number) => void;
  onEndDateChange: (value: string) => void;
  onEndMinutesChange: (value: number) => void;
  onDurationChange: (value: string) => void;
  onDetailsChange: (value: string) => void;
  onBookingUrlChange: (value: string) => void;
  onPhotoUrisChange: (uris: string[]) => void;
  onFlightDetailsChange: (value: FlightDetailsDraft) => void;
  onImportFlight: (source: ConfirmationImportSource) => void;
  onTransportDetailsChange: (value: TransportDetailsDraft) => void;
  onRentalDetailsChange: (value: RentalDetailsDraft) => void;
  onImportRental: (source: ConfirmationImportSource) => void;
  onStayDetailsChange: (value: StayDetailsDraft) => void;
  onImportStay: (source: ConfirmationImportSource) => void;
  onAdd: () => void;
  /** When true, omit the primary button (e.g. sheet hosts a sticky footer). */
  hideSubmit?: boolean;
}) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { s, spacing: rs } = useResponsive();
  const [photosModalVisible, setPhotosModalVisible] = useState(false);
  const isMoment = kind === 'moment';
  const usesRange = kind === 'stay' || kind === 'flight' || kind === 'rental';
  const showDuration = kind === 'activity';
  const thumb = Math.max(64, s(72));
  const detailsMinHeight = Math.max(56, s(60));
  const [detailsHeight, setDetailsHeight] = useState(detailsMinHeight);
  const [stayNotesHeight, setStayNotesHeight] = useState(detailsMinHeight);

  const rangeStartLabel =
    kind === 'stay'
      ? 'Check-in'
      : kind === 'rental'
        ? 'Pick-up'
        : kind === 'flight'
          ? 'Departure'
          : undefined;
  const rangeEndLabel =
    kind === 'stay'
      ? 'Check-out'
      : kind === 'rental'
        ? 'Drop-off'
        : kind === 'flight'
          ? 'Arrival'
          : undefined;

  const confirmationImport =
    kind === 'stay'
      ? {
          onImport: onImportStay,
          importing: importingStay,
          importingLabel: importStatusLabel,
          importedFileName: importedStayFileName,
          confirmationUris: stayDetails.confirmationUris,
          kind: 'stay' as const,
          title: 'Import Stay Details',
          subtitle: 'Save time by importing from a confirmation.',
          accessibilityLabel: 'Import stay confirmation document or screenshots',
        }
      : kind === 'flight'
        ? {
            onImport: onImportFlight,
            importing: importingFlight,
            importingLabel: importStatusLabel,
            importedFileName: importedFlightFileName,
            confirmationUris: flightDetails.confirmationUris,
            kind: 'flight' as const,
            title: 'Import Flight Details',
            subtitle: 'Save time by importing from a confirmation.',
            accessibilityLabel: 'Import flight confirmation document or screenshots',
          }
        : kind === 'rental'
          ? {
              onImport: onImportRental,
              importing: importingRental,
              importingLabel: importStatusLabel,
              importedFileName: importedRentalFileName,
              confirmationUris: rentalDetails.confirmationUris,
              kind: 'rental' as const,
              title: 'Import Rental Details',
              subtitle: 'Save time by importing from a confirmation.',
              accessibilityLabel: 'Import car rental confirmation document or screenshots',
            }
          : undefined;

  const nameTone =
    kind === 'stay' ? 'lodging' : kind === 'flight' ? 'flight' : kind === 'moment' ? 'photo' : 'note';
  const nameIcon =
    kind === 'stay'
      ? ('lodging' as const)
      : kind === 'flight'
        ? ('flight' as const)
        : kind === 'transport'
          ? ('route' as const)
        : kind === 'moment'
          ? ('photo' as const)
          : ('note' as const);

  const appendPhotos = (uris: string[]) => {
    if (!uris.length) return;
    onPhotoUrisChange([...photoUris, ...uris]);
  };

  const choosePhotos = () => {
    setPhotosModalVisible(true);
  };

  return (
    <>
    <View style={[styles.formBody, { gap: rs.sm }]}>
      {confirmationImport ? (
        <View style={{ gap: rs.sm }}>
          <ItinerarySheetImportCard
            title={confirmationImport.title}
            subtitle={confirmationImport.subtitle}
            importing={confirmationImport.importing}
            importingLabel={confirmationImport.importingLabel}
            onImportScreenshots={() => confirmationImport.onImport('screenshots')}
            onImportDocument={() => confirmationImport.onImport('document')}
            screenshotsTestID={AgentUiIds.travel.itineraryAdd.importScreenshots}
            documentTestID={AgentUiIds.travel.itineraryAdd.importDocument}
            accessibilityLabel={confirmationImport.accessibilityLabel}
          />
          {confirmationImport.importedFileName ? (
            <ConfirmationImportBanner
              fileName={confirmationImport.importedFileName}
              uris={confirmationImport.confirmationUris}
              kind={confirmationImport.kind}
            />
          ) : null}
        </View>
      ) : null}

      <Input
        testID={AgentUiIds.travel.itineraryAdd.title}
        value={title}
        onChangeText={onTitleChange}
        icon={nameIcon}
        stackedLabel={
          isMoment ? 'Title' : kind === 'stay' ? 'Stay Name *' : 'Name *'
        }
        placeholder={
          kind === 'flight'
            ? 'e.g. Flight to Lisbon'
            : kind === 'stay'
              ? 'e.g. Summer Getaway'
              : kind === 'rental'
              ? 'e.g. Hertz at KEF'
              : kind === 'transport'
                ? 'e.g. Train to Washington'
                : kind === 'moment'
                  ? 'e.g. Sunset at the falls'
                  : 'e.g. Dinner in Alfama'
        }
        accessibilityLabel={
          kind === 'stay' ? 'Stay Name, required' : isMoment ? 'Title' : 'Name, required'
        }
        {...itinerarySheetFieldProps(chrome, nameTone)}
      />

      {kind === 'stay' ? (
        <AddressAutofindField
          value={details}
          onChange={onDetailsChange}
          stackedLabel="Address"
          placeholder="Enter the full address"
          accessibilityLabel="Address, optional"
          {...itinerarySheetFieldProps(chrome, 'location')}
        />
      ) : null}

      <View style={[styles.schedule, { gap: rs.sm }]}>
        {usesRange && rangeStartLabel && rangeEndLabel ? (
          <>
            <View style={[styles.twoColumns, { gap: rs.sm }]}>
              <View style={styles.flex}>
                <DateField
                  testID={AgentUiIds.travel.itineraryAdd.date}
                  value={date}
                  stackedLabel={`${rangeStartLabel} *`}
                  placeholder="Select date"
                  minimumDate={planStartDate}
                  maximumDate={planEndDate}
                  onChange={onDateChange}
                  accessibilityLabel={`${rangeStartLabel} date, required`}
                  {...itinerarySheetFieldProps(chrome, 'calendar')}
                />
              </View>
              <View style={styles.flex}>
                <TimeField
                  testID={AgentUiIds.travel.itineraryAdd.time}
                  value={startMinutes}
                  stackedLabel="Time"
                  placeholder="Select time"
                  showChevron
                  onChange={onStartMinutesChange}
                  accessibilityLabel={`${rangeStartLabel} time, required`}
                  {...itinerarySheetFieldProps(chrome, 'clock')}
                />
              </View>
            </View>
            <View style={[styles.twoColumns, { gap: rs.sm }]}>
              <View style={styles.flex}>
                <DateField
                  testID={AgentUiIds.travel.itineraryAdd.endDate}
                  value={endDate}
                  stackedLabel={`${rangeEndLabel} *`}
                  placeholder="Select date"
                  minimumDate={date || planStartDate}
                  maximumDate={planEndDate}
                  onChange={onEndDateChange}
                  accessibilityLabel={`${rangeEndLabel} date, required`}
                  {...itinerarySheetFieldProps(chrome, 'calendar')}
                />
              </View>
              <View style={styles.flex}>
                <TimeField
                  testID={AgentUiIds.travel.itineraryAdd.endTime}
                  value={endMinutes}
                  stackedLabel="Time"
                  placeholder="Select time"
                  showChevron
                  onChange={onEndMinutesChange}
                  accessibilityLabel={`${rangeEndLabel} time, required`}
                  {...itinerarySheetFieldProps(chrome, 'clock')}
                />
              </View>
            </View>
          </>
        ) : (
          <View style={[styles.twoColumns, { gap: rs.sm }]}>
            <View style={styles.flex}>
              <DateField
                testID={AgentUiIds.travel.itineraryAdd.date}
                value={date}
                stackedLabel="Date *"
                placeholder="Select date"
                minimumDate={planStartDate}
                maximumDate={planEndDate}
                onChange={onDateChange}
                {...itinerarySheetFieldProps(chrome, 'calendar')}
              />
            </View>
            <View style={styles.flex}>
              <TimeField
                testID={AgentUiIds.travel.itineraryAdd.time}
                value={startMinutes}
                stackedLabel="Time *"
                placeholder="Select time"
                showChevron
                onChange={onStartMinutesChange}
                {...itinerarySheetFieldProps(chrome, 'clock')}
              />
            </View>
          </View>
        )}
        {showDuration ? (
          <Input
            value={duration}
            onChangeText={onDurationChange}
            icon="clock"
            stackedLabel="Duration (minutes) *"
            placeholder="e.g. 60"
            keyboardType="number-pad"
            {...itinerarySheetFieldProps(chrome, 'clock')}
          />
        ) : null}
      </View>

      {kind === 'flight' ? (
        <FlightDetailsEditor
          value={flightDetails}
          onChange={onFlightDetailsChange}
          error={flightDetailsError}
          hideHeader
        />
      ) : null}
      {kind === 'rental' ? (
        <RentalDetailsEditor
          value={rentalDetails}
          onChange={onRentalDetailsChange}
          error={rentalDetailsError}
          planStartDate={planStartDate}
          planEndDate={planEndDate}
          hideDropoffFields
          hideHeader
        />
      ) : null}
      {kind === 'transport' ? (
        <TransportDetailsEditor
          value={transportDetails}
          onChange={onTransportDetailsChange}
          planStartDate={planStartDate}
          planEndDate={planEndDate}
          error={transportDetailsError}
        />
      ) : null}

      {kind === 'stay' ? null : (
        <Input
          testID={AgentUiIds.travel.itineraryAdd.details}
          value={details}
          icon="note"
          stackedLabel={isMoment ? 'Notes' : 'Details'}
          placeholder={
            kind === 'flight'
              ? 'Terminal, baggage, or check-in notes…'
              : kind === 'rental'
                ? 'Insurance, driver, or desk notes…'
                : kind === 'moment'
                  ? 'What made this moment special…'
                  : 'Add any helpful details…'
          }
          accessibilityLabel={isMoment ? 'Notes' : 'Details'}
          multiline
          scrollEnabled={false}
          maxLength={DETAILS_MAX_LENGTH}
          textAlignVertical="top"
          onChangeText={(next) => {
            const clipped = next.slice(0, DETAILS_MAX_LENGTH);
            if (!clipped) setDetailsHeight(detailsMinHeight);
            onDetailsChange(clipped);
          }}
          onContentSizeChange={(event) => {
            const next = Math.ceil(event.nativeEvent.contentSize.height);
            setDetailsHeight((current) => {
              const measured = Math.max(detailsMinHeight, next);
              return measured === current ? current : measured;
            });
          }}
          style={{
            minHeight: Math.max(detailsMinHeight, detailsHeight),
          }}
          {...itinerarySheetFieldProps(chrome, 'note')}
        />
      )}

      {kind === 'stay' ? (
        <>
          <Input
            value={stayDetails.confirmationCode}
            onChangeText={(nextValue) =>
              onStayDetailsChange({ ...stayDetails, confirmationCode: nextValue })
            }
            icon="shield"
            stackedLabel="Confirmation Code"
            placeholder="Enter confirmation or reservation code"
            accessibilityLabel="Confirmation Code"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={24}
            {...itinerarySheetFieldProps(chrome, 'shield')}
          />
          <View style={[styles.twoColumns, { gap: rs.sm }]}>
            <View style={styles.flex}>
              <Input
                value={stayDetails.price}
                onChangeText={(nextValue) =>
                  onStayDetailsChange({ ...stayDetails, price: nextValue })
                }
                icon="currency"
                stackedLabel="Price"
                placeholder="0.00"
                accessibilityLabel="Price"
                keyboardType="decimal-pad"
                {...itinerarySheetFieldProps(chrome, 'import')}
              />
            </View>
            <View style={styles.flex}>
              <Input
                value={stayDetails.currency}
                onChangeText={(nextValue) =>
                  onStayDetailsChange({
                    ...stayDetails,
                    currency: nextValue.toUpperCase(),
                  })
                }
                icon="wallet"
                stackedLabel="Currency"
                placeholder="USD"
                accessibilityLabel="Currency"
                autoCapitalize="characters"
                maxLength={3}
                autoCorrect={false}
                {...itinerarySheetFieldProps(chrome, 'shield')}
              />
            </View>
          </View>
          <Input
            value={stayDetails.reservationEmail}
            onChangeText={(nextValue) =>
              onStayDetailsChange({
                ...stayDetails,
                reservationEmail: nextValue,
              })
            }
            icon="personal"
            stackedLabel="Reservation Email"
            placeholder="Email used when booking"
            accessibilityLabel="Reservation Email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            maxLength={120}
            {...itinerarySheetFieldProps(chrome, 'note')}
          />
          {stayDetailsError ? (
            <ErrorMessage message={stayDetailsError} selectable />
          ) : null}
        </>
      ) : null}

      {isMoment || photoUris.length > 0 ? (
        <View style={[styles.photoSection, { gap: rs.sm }]}>
          {photoUris.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.photoStrip, { gap: rs.sm }]}>
              {photoUris.map((uri) => (
                <View
                  key={uri}
                  style={[styles.photoWrap, { width: thumb, height: thumb }]}>
                  <Image
                    source={{ uri }}
                    style={styles.photo}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Remove photo"
                    hitSlop={6}
                    onPress={() =>
                      onPhotoUrisChange(photoUris.filter((entry) => entry !== uri))
                    }
                    style={[
                      styles.photoRemove,
                      { backgroundColor: theme.overlayScrim },
                    ]}>
                    <Symbol name="close" size="sm" color={theme.textOnAccent} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : null}
          <Button variant="secondary" icon="photo" onPress={choosePhotos}>
            {photoUris.length ? 'Add More Photos' : 'Add Photos'}
          </Button>
        </View>
      ) : null}

      {!isMoment ? (
        <Input
          testID={AgentUiIds.travel.itineraryAdd.bookingUrl}
          value={bookingUrl}
          onChangeText={onBookingUrlChange}
          icon="link"
          stackedLabel="Booking Link"
          placeholder="https://"
          accessibilityLabel="Booking Link"
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          {...itinerarySheetFieldProps(chrome, 'link')}
        />
      ) : null}

      {kind === 'stay' ? (
        <Input
          value={stayDetails.notes}
          onChangeText={(nextValue) => {
            const clipped = nextValue.slice(0, DETAILS_MAX_LENGTH);
            if (!clipped) setStayNotesHeight(detailsMinHeight);
            onStayDetailsChange({
              ...stayDetails,
              notes: clipped,
            });
          }}
          icon="note"
          stackedLabel="Notes"
          placeholder="Wifi, door codes, parking, or anything helpful…"
          accessibilityLabel="Notes"
          multiline
          scrollEnabled={false}
          maxLength={DETAILS_MAX_LENGTH}
          textAlignVertical="top"
          onContentSizeChange={(event) => {
            const next = Math.ceil(event.nativeEvent.contentSize.height);
            setStayNotesHeight((current) => {
              const measured = Math.max(detailsMinHeight, next);
              return measured === current ? current : measured;
            });
          }}
          style={{
            minHeight: Math.max(detailsMinHeight, stayNotesHeight),
          }}
          {...itinerarySheetFieldProps(chrome, 'note')}
        />
      ) : null}

      {error ? <ErrorMessage message={error} selectable /> : null}
      {hideSubmit ? null : (
        <Button onPress={onAdd} style={styles.submit}>
          {isMoment ? 'Add Moment' : 'Add to Timeline'}
        </Button>
      )}
    </View>
    <TravelAddPhotosModal
      visible={photosModalVisible}
      onClose={() => setPhotosModalVisible(false)}
      onTakePhoto={() => {
        void (async () => {
          try {
            const uri = await pickCameraImage();
            if (uri) appendPhotos([uri]);
          } catch (error) {
            if (__DEV__) console.warn('[choosePhotos] camera', error);
          }
        })();
      }}
      onChooseFromPhotos={() => {
        void (async () => {
          try {
            const assets = await pickLibraryImages({
              allowsMultipleSelection: true,
              selectionLimit: 8,
            });
            if (assets?.length) appendPhotos(assets.map((asset) => asset.uri));
          } catch (error) {
            if (__DEV__) console.warn('[choosePhotos] library', error);
          }
        })();
      }}
    />
    </>
  );
}

const styles = StyleSheet.create({
  formBody: {},
  schedule: {},
  twoColumns: { flexDirection: 'row' },
  flex: { flex: 1, minWidth: 0 },
  photoSection: {},
  photoStrip: {},
  photoWrap: {
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submit: {
    alignSelf: 'center',
  },
});
