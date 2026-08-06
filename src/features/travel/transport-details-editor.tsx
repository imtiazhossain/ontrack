import { StyleSheet, View } from 'react-native';

import {
  appPrompt,
  AppText,
  Button,
  DateField,
  ErrorMessage,
  Input,
  SegmentedControl,
  TimeField,
} from '@/components/primitives';
import {
  itinerarySheetChrome,
  itinerarySheetFieldProps,
} from '@/features/travel/travel-itinerary-sheet-chrome';
import { TravelTransportModePicker } from '@/features/travel/travel-mode-picker';
import {
  pickTransportDocument,
  pickTransportScreenshots,
} from '@/features/travel/transport-attachments';
import type {
  TransportDetailsDraft,
  TravelRouteStopDraft,
} from '@/features/travel/transport-details';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds } from '@/utils/agent-ui';
import { newId } from '@/utils/id';

export function TransportDetailsEditor({
  value,
  onChange,
  planStartDate,
  planEndDate,
  error,
  hideArrivalFields = false,
}: {
  value: TransportDetailsDraft;
  onChange: (value: TransportDetailsDraft) => void;
  planStartDate: string;
  planEndDate: string;
  error?: string;
  hideArrivalFields?: boolean;
}) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { spacing: rs } = useResponsive();
  const field = itinerarySheetFieldProps(chrome, 'location');
  const scheduled = ['train', 'bus', 'subway', 'tram', 'ferry', 'shuttle'].includes(value.mode);
  const ride = value.mode === 'rideshare' || value.mode === 'taxi';
  const driving = value.mode === 'driving';

  const update = <K extends keyof TransportDetailsDraft>(
    key: K,
    next: TransportDetailsDraft[K],
  ) => onChange({ ...value, [key]: next });

  const updateStop = (id: string, next: Partial<TravelRouteStopDraft>) => {
    update('stops', value.stops.map((stop) => stop.id === id ? { ...stop, ...next } : stop));
  };

  const appendAttachments = async (source: 'document' | 'screenshots') => {
    try {
      const uris = source === 'document'
        ? await pickTransportDocument()
        : await pickTransportScreenshots();
      if (uris?.length) update('confirmationUris', [...(value.confirmationUris ?? []), ...uris]);
    } catch (caught) {
      appPrompt.alert(
        'Couldn’t attach ticket',
        caught instanceof Error ? caught.message : 'Try another file.',
      );
    }
  };

  return (
    <View style={[styles.root, { gap: rs.sm }]}>
      <TravelTransportModePicker
        value={value.mode}
        onChange={(mode) => update('mode', mode)}
      />

      <View style={[styles.row, { gap: rs.sm }]}>
        <View style={styles.flex}>
          <Input
            testID={AgentUiIds.travel.transport.origin}
            value={value.origin}
            onChangeText={(next) => update('origin', next)}
            icon="location"
            stackedLabel={ride ? 'Pick-up *' : 'Origin *'}
            placeholder={ride ? 'Pick-up address' : 'City, station, or address'}
            {...field}
          />
        </View>
        <View style={styles.flex}>
          <Input
            testID={AgentUiIds.travel.transport.destination}
            value={value.destination}
            onChangeText={(next) => update('destination', next)}
            icon="location"
            stackedLabel={ride ? 'Drop-off *' : 'Destination *'}
            placeholder={ride ? 'Drop-off address' : 'City, station, or address'}
            {...field}
          />
        </View>
      </View>

      {hideArrivalFields ? null : (
        <View style={[styles.row, { gap: rs.sm }]}>
          <View style={styles.flex}>
            <DateField
              testID={AgentUiIds.travel.transport.arrivalDate}
              value={value.arrivalDate}
              onChange={(next) => update('arrivalDate', next)}
              stackedLabel="Arrival *"
              minimumDate={planStartDate}
              maximumDate={planEndDate}
              {...itinerarySheetFieldProps(chrome, 'calendar')}
            />
          </View>
          <View style={styles.flex}>
            <TimeField
              testID={AgentUiIds.travel.transport.arrivalTime}
              value={value.arrivalMinutes}
              onChange={(next) => update('arrivalMinutes', next)}
              stackedLabel="Arrival time *"
              showChevron
              {...itinerarySheetFieldProps(chrome, 'clock')}
            />
          </View>
        </View>
      )}

      {!driving ? (
        <Input
          testID={AgentUiIds.travel.transport.operator}
          value={value.operator}
          onChangeText={(next) => update('operator', next)}
          icon={ride ? 'rideshare' : 'building'}
          stackedLabel={ride ? 'Provider' : 'Operator'}
          placeholder={ride ? 'Uber, Lyft…' : 'Amtrak, MTA…'}
          {...itinerarySheetFieldProps(chrome, 'flight')}
        />
      ) : null}

      {scheduled ? (
        <View style={[styles.row, { gap: rs.sm }]}>
          <View style={styles.flex}>
            <Input
              testID={AgentUiIds.travel.transport.serviceNumber}
              value={value.serviceNumber}
              onChangeText={(next) => update('serviceNumber', next)}
              icon="route"
              stackedLabel="Service / Route"
              placeholder="Northeast Regional 171"
              {...itinerarySheetFieldProps(chrome, 'flight')}
            />
          </View>
          <View style={styles.flex}>
            <Input
              testID={AgentUiIds.travel.transport.platform}
              value={value.platform}
              onChangeText={(next) => update('platform', next)}
              icon="itinerary"
              stackedLabel="Platform / Gate"
              placeholder="Track 8"
              {...itinerarySheetFieldProps(chrome, 'note')}
            />
          </View>
        </View>
      ) : null}

      {(scheduled || ride || driving) ? (
        <View style={[styles.row, { gap: rs.sm }]}>
          <View style={styles.flex}>
            <Input
              testID={AgentUiIds.travel.transport.vehicle}
              value={value.vehicle}
              onChangeText={(next) => update('vehicle', next)}
              icon="vehicles"
              stackedLabel={driving ? 'Vehicle' : ride ? 'Vehicle / Driver' : 'Vehicle'}
              placeholder={driving ? 'Family SUV' : 'Optional'}
              {...itinerarySheetFieldProps(chrome, 'note')}
            />
          </View>
          {scheduled ? (
            <View style={styles.flex}>
              <Input
                testID={AgentUiIds.travel.transport.seat}
                value={value.seat}
                onChangeText={(next) => update('seat', next)}
                icon="personal"
                stackedLabel="Seat"
                placeholder="Car 4 · 12A"
                {...itinerarySheetFieldProps(chrome, 'note')}
              />
            </View>
          ) : null}
        </View>
      ) : null}

      {!driving ? (
        <Input
          testID={AgentUiIds.travel.transport.confirmationCode}
          value={value.confirmationCode}
          onChangeText={(next) => update('confirmationCode', next)}
          icon="shield"
          stackedLabel="Confirmation Code"
          placeholder="Reservation or ticket code"
          autoCapitalize="characters"
          {...itinerarySheetFieldProps(chrome, 'shield')}
        />
      ) : null}

      <View style={[styles.row, { gap: rs.sm }]}>
        {driving ? (
          <View style={styles.flex}>
            <Input
              testID={AgentUiIds.travel.transport.distance}
              value={value.distance}
              onChangeText={(next) => update('distance', next)}
              icon="route"
              stackedLabel="Distance"
              placeholder="0"
              keyboardType="decimal-pad"
              {...itinerarySheetFieldProps(chrome, 'location')}
            />
          </View>
        ) : null}
        {driving ? (
          <View style={styles.flex}>
            <SegmentedControl
              label="Distance unit"
              value={value.distanceUnit}
              options={[
                { value: 'mi', label: 'Miles', testID: AgentUiIds.travel.transport.distanceUnit('mi') },
                { value: 'km', label: 'Kilometers', testID: AgentUiIds.travel.transport.distanceUnit('km') },
              ]}
              onChange={(next) => update('distanceUnit', next)}
            />
          </View>
        ) : null}
      </View>

      <View style={[styles.row, { gap: rs.sm }]}>
        <View style={styles.flex}>
          <Input
            testID={AgentUiIds.travel.transport.fare}
            value={value.fare}
            onChangeText={(next) => update('fare', next)}
            icon="currency"
            stackedLabel="Fare"
            placeholder="0.00"
            keyboardType="decimal-pad"
            {...itinerarySheetFieldProps(chrome, 'import')}
          />
        </View>
        <View style={styles.flex}>
          <Input
            testID={AgentUiIds.travel.transport.currency}
            value={value.currency}
            onChangeText={(next) => update('currency', next.toUpperCase())}
            icon="wallet"
            stackedLabel="Currency"
            placeholder="USD"
            autoCapitalize="characters"
            maxLength={3}
            {...itinerarySheetFieldProps(chrome, 'shield')}
          />
        </View>
      </View>

      {!driving ? (
        <View style={{ gap: rs.xs }}>
          <AppText variant="overline" color="secondary" fit>Ticket attachments</AppText>
          <View style={[styles.row, { gap: rs.sm }]}>
            <Button
              variant="secondary"
              icon="scan-document"
              testID={AgentUiIds.travel.transport.attachDocument}
              onPress={() => void appendAttachments('document')}
              style={styles.flex}>
              Add Document
            </Button>
            <Button
              variant="secondary"
              icon="photo"
              testID={AgentUiIds.travel.transport.attachScreenshots}
              onPress={() => void appendAttachments('screenshots')}
              style={styles.flex}>
              Add Screenshots
            </Button>
          </View>
          {value.confirmationUris?.length ? (
            <AppText variant="caption" color="secondary">
              {value.confirmationUris.length} attachment{value.confirmationUris.length === 1 ? '' : 's'} saved
            </AppText>
          ) : null}
        </View>
      ) : null}

      {driving ? (
        <View style={{ gap: rs.sm }}>
          <AppText variant="overline" color="secondary" fit>Route stops</AppText>
          {value.stops.map((stop, index) => (
            <View key={stop.id} style={[styles.stop, { gap: rs.sm, borderColor: theme.separator, padding: rs.sm }]}>
              <AppText variant="callout" fit>Stop {index + 1}</AppText>
              <Input
                testID={AgentUiIds.travel.transport.stopName(stop.id)}
                value={stop.name}
                onChangeText={(name) => updateStop(stop.id, { name })}
                icon="location"
                stackedLabel="Stop name *"
                placeholder="Lunch in Philadelphia"
                {...field}
              />
              <Input
                testID={AgentUiIds.travel.transport.stopAddress(stop.id)}
                value={stop.address}
                onChangeText={(address) => updateStop(stop.id, { address })}
                icon="route"
                stackedLabel="Address"
                placeholder="Optional map address"
                {...field}
              />
              <View style={[styles.row, { gap: rs.sm }]}>
                <View style={styles.flex}>
                  <DateField
                    testID={AgentUiIds.travel.transport.stopDate(stop.id)}
                    value={stop.arrivalDate}
                    onChange={(arrivalDate) => updateStop(stop.id, { arrivalDate })}
                    stackedLabel="Arrival date"
                    minimumDate={planStartDate}
                    maximumDate={planEndDate}
                    {...itinerarySheetFieldProps(chrome, 'calendar')}
                  />
                </View>
                <View style={styles.flex}>
                  <TimeField
                    testID={AgentUiIds.travel.transport.stopTime(stop.id)}
                    value={stop.arrivalMinutes}
                    onChange={(arrivalMinutes) => updateStop(stop.id, { arrivalMinutes })}
                    stackedLabel="Arrival time"
                    showChevron
                    {...itinerarySheetFieldProps(chrome, 'clock')}
                  />
                </View>
              </View>
              <Input
                testID={AgentUiIds.travel.transport.stopNotes(stop.id)}
                value={stop.notes}
                onChangeText={(notes) => updateStop(stop.id, { notes })}
                icon="note"
                stackedLabel="Notes"
                placeholder="Food, fuel, or meetup notes"
                {...itinerarySheetFieldProps(chrome, 'note')}
              />
              <Button
                variant="ghost"
                icon="delete"
                testID={AgentUiIds.travel.transport.removeStop(stop.id)}
                onPress={() => update('stops', value.stops.filter((entry) => entry.id !== stop.id))}>
                Remove Stop
              </Button>
            </View>
          ))}
          <Button
            variant="secondary"
            icon="add"
            testID={AgentUiIds.travel.transport.addStop}
            onPress={() => update('stops', [...value.stops, {
              id: newId('route-stop'),
              name: '',
              address: '',
              arrivalDate: '',
              arrivalMinutes: null,
              notes: '',
            }])}>
            Add Route Stop
          </Button>
        </View>
      ) : null}

      {error ? <ErrorMessage message={error} selectable /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {},
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1, minWidth: 0 },
  stop: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 16 },
});
