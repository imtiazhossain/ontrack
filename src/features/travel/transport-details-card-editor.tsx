import { useState } from 'react';
import { View } from 'react-native';

import { TravelDetailsCardActions } from '@/features/travel/travel-details-card-actions';
import { TransportDetailsEditor } from '@/features/travel/transport-details-editor';
import {
  transportDetailsDraft,
  validateTransportDetails,
} from '@/features/travel/transport-details';
import { TravelRangeFields } from '@/features/travel/travel-range-fields';
import {
  travelRangeScheduleDraft,
  validateTravelRangeSchedule,
  type TravelRangeScheduleDraft,
} from '@/features/travel/travel-range-schedule';
import type { TravelItineraryItem, TravelTransportDetails } from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { AgentUiIds } from '@/utils/agent-ui';

export function TransportDetailsCardEditor({
  item,
  planStartDate,
  planEndDate,
  onSave,
  onCancel,
  onRemove,
}: {
  item: TravelItineraryItem;
  planStartDate: string;
  planEndDate: string;
  onSave: (details: TravelTransportDetails, schedule: TravelRangeScheduleDraft) => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  const { spacing } = useResponsive();
  const [draft, setDraft] = useState(() => transportDetailsDraft(item.transport));
  const [schedule, setSchedule] = useState(() => travelRangeScheduleDraft(
    item,
    item.transport?.arrivalDate,
    item.transport?.arrivalMinutes,
  ));
  const [error, setError] = useState<string>();
  const updateSchedule = (next: TravelRangeScheduleDraft) => {
    setSchedule(next);
    setDraft((current) => ({
      ...current,
      arrivalDate: next.endDate,
      arrivalMinutes: next.endMinutes,
    }));
  };
  const save = () => {
    const scheduleResult = validateTravelRangeSchedule(schedule, {
      start: 'departure',
      end: 'arrival',
    });
    if (!scheduleResult.ok) return setError(scheduleResult.error);
    const detailsResult = validateTransportDetails({
      draft: {
        ...draft,
        arrivalDate: schedule.endDate,
        arrivalMinutes: schedule.endMinutes,
      },
      departureDate: schedule.startDate,
      departureMinutes: scheduleResult.value.startMinutes,
      planStartDate,
      planEndDate,
    });
    if (!detailsResult.ok) return setError(detailsResult.error);
    setError(undefined);
    onSave(detailsResult.value, schedule);
  };
  return (
    <View style={{ gap: spacing.md }}>
      <TravelRangeFields
        value={schedule}
        startDateLabel="Departure Date"
        startTimeLabel="Departure Time"
        endDateLabel="Arrival Date"
        endTimeLabel="Arrival Time"
        minimumDate={planStartDate}
        maximumDate={planEndDate}
        startDateTestID={AgentUiIds.travel.transport.editDepartureDate}
        startTimeTestID={AgentUiIds.travel.transport.editDepartureTime}
        endDateTestID={AgentUiIds.travel.transport.editArrivalDate}
        endTimeTestID={AgentUiIds.travel.transport.editArrivalTime}
        onChange={updateSchedule}
      />
      <TransportDetailsEditor
        value={draft}
        onChange={setDraft}
        planStartDate={planStartDate}
        planEndDate={planEndDate}
        error={error}
        hideArrivalFields
      />
      <TravelDetailsCardActions
        itemId={item.id}
        itemTitle={item.title}
        saveLabel="Save Transport Details"
        onSave={save}
        onCancel={onCancel}
        onRemove={onRemove}
      />
    </View>
  );
}
