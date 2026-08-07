import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
    Button,
    ErrorMessage,
    Input,
    SegmentedControl,
    Symbol,
} from '@/components/primitives';
import { radii } from '@/design-system';
import { ConfirmationImportBanner } from '@/features/travel/confirmation-import-banner';
import type { FlightDetailsDraft } from '@/features/travel/flight-details';
import { FlightDetailsEditor } from '@/features/travel/flight-details-editor';
import { FlightReturnLegFields } from '@/features/travel/flight-return-leg-fields';
import type {
    FlightLegScheduleDraft,
    FlightTripType,
} from '@/features/travel/flight-roundtrip-draft';
import type { RentalDetailsDraft } from '@/features/travel/rental-details';
import { RentalDetailsEditor } from '@/features/travel/rental-details-editor';
import type { StayDetailsDraft } from '@/features/travel/stay-details';
import type { TransportDetailsDraft } from '@/features/travel/transport-details';
import { TransportDetailsEditor } from '@/features/travel/transport-details-editor';
import { TravelAddPhotosModal } from '@/features/travel/travel-add-photos-modal';
import { TravelItineraryFormScheduleFields } from '@/features/travel/travel-itinerary-form-schedule-fields';
import {
    itinerarySheetChrome,
    itinerarySheetFieldProps,
} from '@/features/travel/travel-itinerary-sheet-chrome';
import { ItinerarySheetImportCard } from '@/features/travel/travel-itinerary-sheet-fields';
import {
    TravelItineraryStayAddressField,
    TravelItineraryStayFields,
    TravelItineraryStayNotesField,
} from '@/features/travel/travel-itinerary-stay-fields';
import type { TravelItemKind } from '@/features/travel/types';
import { useAutoGrowingNote } from '@/features/travel/use-auto-growing-note';
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
  details,
  bookingUrl,
  photoUris,
  flightDetails,
  flightDetailsError,
  flightTripType = 'one-way',
  returnFlightTitle = '',
  returnFlightDetails,
  returnFlightSchedule,
  importedFlightFileName,
  importedFlightNote,
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
  onDetailsChange,
  onBookingUrlChange,
  onPhotoUrisChange,
  onFlightDetailsChange,
  onFlightTripTypeChange,
  onReturnFlightTitleChange,
  onReturnFlightDetailsChange,
  onReturnFlightScheduleChange,
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
  details: string;
  bookingUrl: string;
  photoUris: string[];
  flightDetails: FlightDetailsDraft;
  flightDetailsError?: string;
  flightTripType?: FlightTripType;
  returnFlightTitle?: string;
  returnFlightDetails?: FlightDetailsDraft;
  returnFlightSchedule?: FlightLegScheduleDraft;
  importedFlightFileName?: string;
  importedFlightNote?: string;
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
  onDetailsChange: (value: string) => void;
  onBookingUrlChange: (value: string) => void;
  onPhotoUrisChange: (uris: string[]) => void;
  onFlightDetailsChange: (value: FlightDetailsDraft) => void;
  onFlightTripTypeChange?: (value: FlightTripType) => void;
  onReturnFlightTitleChange?: (value: string) => void;
  onReturnFlightDetailsChange?: (value: FlightDetailsDraft) => void;
  onReturnFlightScheduleChange?: (value: FlightLegScheduleDraft) => void;
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
  const { s, spacing: rs, typography } = useResponsive();
  const [photosModalVisible, setPhotosModalVisible] = useState(false);
  const isMoment = kind === 'moment';
  const thumb = Math.max(64, s(72));
  // Grow the TextInput value area only — outer stacked chrome already sizes the row.
  const detailsMinHeight = Math.max(22, Math.ceil(typography.body.lineHeight));
  const detailsNote = useAutoGrowingNote(details, detailsMinHeight);
  const stayNote = useAutoGrowingNote(stayDetails.notes, detailsMinHeight);

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
            importedNote: importedFlightNote,
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
              note={
                'importedNote' in confirmationImport
                  ? confirmationImport.importedNote
                  : undefined
              }
            />
          ) : null}
        </View>
      ) : null}

      {kind === 'flight' && onFlightTripTypeChange ? (
        <SegmentedControl
          label="Trip type"
          value={flightTripType}
          options={[
            {
              value: 'one-way',
              label: 'One-way',
              testID: AgentUiIds.travel.itineraryAdd.tripType('one-way'),
            },
            {
              value: 'round-trip',
              label: 'Roundtrip',
              testID: AgentUiIds.travel.itineraryAdd.tripType('round-trip'),
            },
          ]}
          onChange={onFlightTripTypeChange}
        />
      ) : null}

      <Input
        testID={AgentUiIds.travel.itineraryAdd.title}
        value={title}
        onChangeText={onTitleChange}
        icon={nameIcon}
        stackedLabel={
          isMoment
            ? 'Title'
            : kind === 'stay'
              ? 'Stay Name *'
              : kind === 'flight' && flightTripType === 'round-trip'
                ? 'Departing Name *'
                : 'Name *'
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
          kind === 'stay'
            ? title.trim()
              ? `Stay Name, ${title.trim()}, required`
              : 'Stay Name, required'
            : isMoment
              ? title.trim()
                ? `Title, ${title.trim()}`
                : 'Title'
              : kind === 'flight' && flightTripType === 'round-trip'
                ? title.trim()
                  ? `Departing Name, ${title.trim()}, required`
                  : 'Departing Name, required'
                : kind === 'flight'
                  ? title.trim()
                    ? `Name, ${title.trim()}, required`
                    : 'Name, required'
                  : title.trim()
                    ? `Name, ${title.trim()}, required`
                    : 'Name, required'
        }
        {...itinerarySheetFieldProps(chrome, nameTone)}
      />

      {kind === 'stay' ? (
        <TravelItineraryStayAddressField
          value={details}
          onChange={onDetailsChange}
        />
      ) : null}

      <TravelItineraryFormScheduleFields
        kind={kind}
        flightTripType={flightTripType}
        date={date}
        startMinutes={startMinutes}
        endDate={endDate}
        endMinutes={endMinutes}
        planStartDate={planStartDate}
        planEndDate={planEndDate}
        onDateChange={onDateChange}
        onStartMinutesChange={onStartMinutesChange}
        onEndDateChange={onEndDateChange}
        onEndMinutesChange={onEndMinutesChange}
      />

      {kind === 'flight' ? (
        <FlightDetailsEditor
          value={flightDetails}
          onChange={onFlightDetailsChange}
          error={flightDetailsError}
          hideHeader
        />
      ) : null}
      {kind === 'flight' &&
      flightTripType === 'round-trip' &&
      returnFlightDetails &&
      returnFlightSchedule &&
      onReturnFlightTitleChange &&
      onReturnFlightDetailsChange &&
      onReturnFlightScheduleChange ? (
        <FlightReturnLegFields
          title={returnFlightTitle}
          details={returnFlightDetails}
          schedule={returnFlightSchedule}
          planStartDate={planStartDate}
          planEndDate={planEndDate}
          onTitleChange={onReturnFlightTitleChange}
          onDetailsChange={onReturnFlightDetailsChange}
          onScheduleChange={onReturnFlightScheduleChange}
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
            detailsNote.collapseWhenEmpty(clipped);
            onDetailsChange(clipped);
          }}
          onContentSizeChange={detailsNote.onContentSizeChange}
          style={detailsNote.style}
          {...itinerarySheetFieldProps(chrome, 'note')}
        />
      )}

      {kind === 'stay' ? (
        <TravelItineraryStayFields
          value={stayDetails}
          error={stayDetailsError}
          onChange={onStayDetailsChange}
        />
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
        <TravelItineraryStayNotesField
          value={stayDetails}
          maxLength={DETAILS_MAX_LENGTH}
          note={stayNote}
          onChange={onStayDetailsChange}
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
