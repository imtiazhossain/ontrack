import { useState } from 'react';

import { DayHeader } from '@/features/daily-tracking/day-header';
import { DayView } from '@/features/daily-tracking/day-view';
import { todayKey } from '@/utils/date';

export default function TodayScreen() {
  const [date, setDate] = useState(todayKey());

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
