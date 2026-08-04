import { useState } from 'react';
import { View } from 'react-native';

import type { FlightDetailsDraft } from '@/features/travel/flight-details';
import { FlightDetailsEditor } from '@/features/travel/flight-details-editor';
import {
  flightScheduleDraft,
  type FlightScheduleDraft,
} from '@/features/travel/flight-schedule';
import { TravelDetailsCardActions } from '@/features/travel/travel-details-card-actions';
import { TravelRangeFields } from '@/features/travel/travel-range-fields';
import type { TravelItineraryItem } from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';

export function FlightDetailsCardEditor({
  value,
  error,
  importedFileName,
  importing,
  item,
  onChange,
  onImport,
  onSave,
  onCancel,
  onRemove,
}: {
  value: FlightDetailsDraft;
  error?: string;
  importedFileName?: string;
  importing: boolean;
  item: TravelItineraryItem;
  onChange: (value: FlightDetailsDraft) => void;
  onImport: () => void;
  onSave: (schedule: FlightScheduleDraft) => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  const { spacing: rs } = useResponsive();
  const [schedule, setSchedule] = useState(() => flightScheduleDraft(item));

  return (
    <View style={{ gap: rs.md }}>
      <FlightDetailsEditor
        value={value}
        onChange={onChange}
        error={error}
        importedFileName={importedFileName}
        importing={importing}
        onImport={onImport}
        scheduleFields={
          <TravelRangeFields
            value={{
              startDate: schedule.departureDate,
              startMinutes: schedule.departureMinutes,
              endDate: schedule.arrivalDate,
              endMinutes: schedule.arrivalMinutes,
            }}
            startDateLabel="Departure Date"
            startTimeLabel="Departure Time"
            endDateLabel="Arrival Date"
            endTimeLabel="Arrival Time"
            onChange={(next) =>
              setSchedule({
                departureDate: next.startDate,
                departureMinutes: next.startMinutes,
                arrivalDate: next.endDate,
                arrivalMinutes: next.endMinutes,
              })
            }
          />
        }
      />
      <TravelDetailsCardActions
        itemId={item.id}
        itemTitle={item.title}
        saveLabel="Save Flight Details"
        onSave={() => onSave(schedule)}
        onCancel={onCancel}
        onRemove={onRemove}
      />
    </View>
  );
}
