import { StyleSheet, View } from 'react-native';

import { AppText, DateField, Input, TimeField } from '@/components/primitives';
import {
    itinerarySheetChrome,
    itinerarySheetFieldProps,
} from '@/features/travel/travel-itinerary-sheet-chrome';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds } from '@/utils/agent-ui';

import type { FlightDetailsDraft } from './flight-details';
import type { FlightLegScheduleDraft } from './flight-roundtrip-draft';
import { travelOverlineStyle } from './travel-chrome';

export function FlightReturnLegFields({
  title,
  details,
  schedule,
  onTitleChange,
  onDetailsChange,
  onScheduleChange,
}: {
  title: string;
  details: FlightDetailsDraft;
  schedule: FlightLegScheduleDraft;
  planStartDate: string;
  planEndDate: string;
  onTitleChange: (value: string) => void;
  onDetailsChange: (value: FlightDetailsDraft) => void;
  onScheduleChange: (value: FlightLegScheduleDraft) => void;
}) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { spacing: rs } = useResponsive();
  const updateDetails = (patch: Partial<FlightDetailsDraft>) => {
    onDetailsChange({ ...details, ...patch });
  };
  const updateSchedule = (patch: Partial<FlightLegScheduleDraft>) => {
    onScheduleChange({ ...schedule, ...patch });
  };

  return (
    <View style={[styles.root, { gap: rs.sm }]}>
      <AppText variant="overline" color="accent" fit style={travelOverlineStyle}>
        Returning
      </AppText>
      <Input
        testID={AgentUiIds.travel.itineraryAdd.returnTitle}
        icon="flight"
        stackedLabel="Returning Name *"
        value={title}
        onChangeText={onTitleChange}
        placeholder="Returning Name"
        accessibilityLabel="Returning Name, required"
        {...itinerarySheetFieldProps(chrome, 'flight')}
      />
      <Input
        testID={AgentUiIds.travel.itineraryAdd.returnAirline}
        icon="flight"
        stackedLabel="Airline"
        value={details.airline}
        onChangeText={(airline) => updateDetails({ airline })}
        placeholder="Airline"
        {...itinerarySheetFieldProps(chrome, 'flight')}
      />
      <Input
        testID={AgentUiIds.travel.itineraryAdd.returnFlightNumber}
        icon="flight"
        stackedLabel="Flight Number"
        value={details.flightNumber}
        onChangeText={(flightNumber) => updateDetails({ flightNumber })}
        placeholder="Flight Number"
        autoCapitalize="characters"
        {...itinerarySheetFieldProps(chrome, 'flight')}
      />
      <View style={[styles.twoColumns, { gap: rs.sm }]}>
        <View style={styles.flex}>
          <DateField
            testID={AgentUiIds.travel.itineraryAdd.returnDate}
            value={schedule.date}
            stackedLabel="Departure *"
            placeholder="Select date"
            onChange={(date) => updateSchedule({ date })}
            accessibilityLabel="Returning departure date, required"
            {...itinerarySheetFieldProps(chrome, 'calendar')}
          />
        </View>
        <View style={styles.flex}>
          <TimeField
            testID={AgentUiIds.travel.itineraryAdd.returnTime}
            value={schedule.startMinutes}
            stackedLabel="Time"
            placeholder="Select time"
            showChevron
            onChange={(startMinutes) => updateSchedule({ startMinutes })}
            accessibilityLabel="Returning departure time, required"
            {...itinerarySheetFieldProps(chrome, 'clock')}
          />
        </View>
      </View>
      <View style={[styles.twoColumns, { gap: rs.sm }]}>
        <View style={styles.flex}>
          <DateField
            testID={AgentUiIds.travel.itineraryAdd.returnEndDate}
            value={schedule.endDate}
            stackedLabel="Arrival *"
            placeholder="Select date"
            minimumDate={schedule.date || undefined}
            onChange={(endDate) => updateSchedule({ endDate })}
            accessibilityLabel="Returning arrival date, required"
            {...itinerarySheetFieldProps(chrome, 'calendar')}
          />
        </View>
        <View style={styles.flex}>
          <TimeField
            testID={AgentUiIds.travel.itineraryAdd.returnEndTime}
            value={schedule.endMinutes}
            stackedLabel="Time"
            placeholder="Select time"
            showChevron
            onChange={(endMinutes) => updateSchedule({ endMinutes })}
            accessibilityLabel="Returning arrival time, required"
            {...itinerarySheetFieldProps(chrome, 'clock')}
          />
        </View>
      </View>
      <Input
        testID={AgentUiIds.travel.itineraryAdd.returnFrom}
        icon="location"
        stackedLabel="From"
        value={details.departureAirport}
        onChangeText={(departureAirport) => updateDetails({ departureAirport })}
        placeholder="From"
        autoCapitalize="characters"
        maxLength={8}
        {...itinerarySheetFieldProps(chrome, 'location')}
      />
      <Input
        testID={AgentUiIds.travel.itineraryAdd.returnTo}
        icon="location"
        stackedLabel="To"
        value={details.arrivalAirport}
        onChangeText={(arrivalAirport) => updateDetails({ arrivalAirport })}
        placeholder="To"
        autoCapitalize="characters"
        maxLength={8}
        {...itinerarySheetFieldProps(chrome, 'location')}
      />
      <Input
        testID={AgentUiIds.travel.itineraryAdd.returnLayoverDuration}
        accessibilityLabel="Returning layover duration"
        icon="clock"
        stackedLabel="Layover"
        value={details.layoverMinutesAfter ?? ''}
        onChangeText={(layoverMinutesAfter) =>
          updateDetails({ layoverMinutesAfter })
        }
        placeholder="Layover"
        autoCapitalize="none"
        autoCorrect={false}
        {...itinerarySheetFieldProps(chrome, 'clock')}
      />
      <Input
        testID={AgentUiIds.travel.itineraryAdd.returnConnectionAirport}
        accessibilityLabel="Returning connection airport"
        icon="location"
        stackedLabel="Connection Airport"
        value={details.connectionAirport ?? ''}
        onChangeText={(connectionAirport) =>
          updateDetails({ connectionAirport })
        }
        placeholder="Connection Airport"
        autoCapitalize="characters"
        {...itinerarySheetFieldProps(chrome, 'flight')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {},
  twoColumns: {
    flexDirection: 'row',
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
});
