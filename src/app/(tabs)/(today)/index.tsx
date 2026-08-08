import { DayHeader } from '@/features/daily-tracking/day-header';
import { DayView } from '@/features/daily-tracking/day-view';
import { useUI } from '@/store/ui';

export default function TodayScreen() {
  const date = useUI((state) => state.selectedDate);
  const setDate = useUI((state) => state.setSelectedDate);

  return (
    <DayView
      date={date}
      onChangeDate={setDate}
      renderHeader={({ completion, nowLine, summaryLine, topInset }) => (
        <DayHeader
          date={date}
          completion={completion}
          nowLine={nowLine}
          summaryLine={summaryLine}
          onChangeDate={setDate}
          topInset={topInset}
        />
      )}
    />
  );
}
