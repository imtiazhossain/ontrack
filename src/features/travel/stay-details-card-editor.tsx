import { useMemo, useState } from 'react';
import { View } from 'react-native';

import type { StayDetailsDraft } from '@/features/travel/stay-details';
import { StayDetailsEditor } from '@/features/travel/stay-details-editor';
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

export function StayDetailsCardEditor({
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
  value: StayDetailsDraft;
  error?: string;
  importedFileName?: string;
  importing: boolean;
  item: TravelItineraryItem;
  planStartDate: string;
  planEndDate: string;
  onChange: (value: StayDetailsDraft) => void;
  onImport: () => void;
  onSave: (schedule: TravelRangeScheduleDraft) => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  const { spacing: rs } = useResponsive();
  const [start, setStart] = useState(() => ({
    startDate: item.date,
    startMinutes: item.startMinutes as number | null,
  }));

  // Checkout always follows `value` so confirmation import is not overwritten by
  // stale local schedule state on save.
  const schedule = useMemo<TravelRangeScheduleDraft>(() => {
    const seeded = travelRangeScheduleDraft(
      item,
      value.checkoutDate || undefined,
      optionalMinutes(value.checkoutMinutes),
    );
    return {
      startDate: start.startDate || seeded.startDate,
      startMinutes:
        start.startMinutes !== null ? start.startMinutes : seeded.startMinutes,
      endDate: value.checkoutDate.trim() || seeded.endDate,
      endMinutes:
        optionalMinutes(value.checkoutMinutes) !== undefined
          ? optionalMinutes(value.checkoutMinutes)!
          : seeded.endMinutes,
    };
  }, [item, start, value.checkoutDate, value.checkoutMinutes]);

  const updateSchedule = (next: TravelRangeScheduleDraft) => {
    setStart({
      startDate: next.startDate,
      startMinutes: next.startMinutes,
    });
    onChange({
      ...value,
      checkoutDate: next.endDate,
      checkoutMinutes: next.endMinutes === null ? '' : String(next.endMinutes),
    });
  };

  return (
    <View style={{ gap: rs.md }}>
      <StayDetailsEditor
        value={value}
        onChange={onChange}
        error={error}
        importedFileName={importedFileName}
        importing={importing}
        onImport={onImport}
        planStartDate={planStartDate}
        planEndDate={planEndDate}
        hideCheckoutFields
        scheduleFields={
          <TravelRangeFields
            value={schedule}
            startDateLabel="Check-In Date"
            startTimeLabel="Check-In Time"
            endDateLabel="Check-Out Date"
            endTimeLabel="Check-Out Time"
            minimumDate={planStartDate}
            maximumDate={planEndDate}
            onChange={updateSchedule}
          />
        }
      />
      <TravelDetailsCardActions
        itemId={item.id}
        itemTitle={item.title}
        saveLabel="Save Stay Details"
        onSave={() => onSave(schedule)}
        onCancel={onCancel}
        onRemove={onRemove}
      />
    </View>
  );
}
