import { useState } from 'react';
import { View } from 'react-native';

import { RentalDetailsEditor } from '@/features/travel/rental-details-editor';
import type { RentalDetailsDraft } from '@/features/travel/rental-details';
import { TravelDetailsCardActions } from '@/features/travel/travel-details-card-actions';
import { TravelRangeFields } from '@/features/travel/travel-range-fields';
import {
  travelRangeScheduleDraft,
  type TravelRangeScheduleDraft,
} from '@/features/travel/travel-range-schedule';
import type { TravelItineraryItem } from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';

function optionalMinutes(value: string): number | undefined {
  const parsed = Number(value);
  return value.trim() && Number.isFinite(parsed) ? parsed : undefined;
}

export function RentalDetailsCardEditor({
  value,
  error,
  importedFileName,
  importing,
  item,
  planStartDate,
  planEndDate,
  onChange,
  onImport,
  onSave,
  onCancel,
  onRemove,
}: {
  value: RentalDetailsDraft;
  error?: string;
  importedFileName?: string;
  importing: boolean;
  item: TravelItineraryItem;
  planStartDate: string;
  planEndDate: string;
  onChange: (value: RentalDetailsDraft) => void;
  onImport: () => void;
  onSave: (schedule: TravelRangeScheduleDraft) => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  const { spacing: rs } = useResponsive();
  const [schedule, setSchedule] = useState(() =>
    travelRangeScheduleDraft(
      item,
      value.dropoffDate || undefined,
      optionalMinutes(value.dropoffMinutes),
    ),
  );

  const updateSchedule = (next: TravelRangeScheduleDraft) => {
    setSchedule(next);
    onChange({
      ...value,
      dropoffDate: next.endDate,
      dropoffMinutes: next.endMinutes === null ? '' : String(next.endMinutes),
    });
  };

  return (
    <View style={{ gap: rs.md }}>
      <RentalDetailsEditor
        value={value}
        onChange={onChange}
        error={error}
        importedFileName={importedFileName}
        importing={importing}
        onImport={onImport}
        planStartDate={planStartDate}
        planEndDate={planEndDate}
        hideDropoffFields
        scheduleFields={
          <TravelRangeFields
            value={schedule}
            startDateLabel="Pick-Up Date"
            startTimeLabel="Pick-Up Time"
            endDateLabel="Drop-Off Date"
            endTimeLabel="Drop-Off Time"
            minimumDate={planStartDate}
            maximumDate={planEndDate}
            onChange={updateSchedule}
          />
        }
      />
      <TravelDetailsCardActions
        itemId={item.id}
        itemTitle={item.title}
        saveLabel="Save Rental Details"
        onSave={() => onSave(schedule)}
        onCancel={onCancel}
        onRemove={onRemove}
      />
    </View>
  );
}
