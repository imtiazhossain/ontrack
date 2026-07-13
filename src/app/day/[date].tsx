import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/primitives';
import { spacing } from '@/design-system';
import { DayHeader } from '@/features/daily-tracking/day-header';
import { DayView } from '@/features/daily-tracking/day-view';
import { todayKey } from '@/utils/date';

export default function DayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date: string }>();
  const date = typeof params.date === 'string' ? params.date : todayKey();
  const insets = useSafeAreaInsets();

  const changeDate = (next: string) => router.setParams({ date: next });

  return (
    <View style={styles.fill}>
      <DayView
        date={date}
        onChangeDate={changeDate}
        renderHeader={({ completion, nowLine, summaryLine, topInset }) => (
          <DayHeader
            date={date}
            completion={completion}
            nowLine={nowLine}
            summaryLine={summaryLine}
            onChangeDate={changeDate}
            topInset={topInset + 44}
          />
        )}
      />
      <View style={[styles.back, { top: insets.top + spacing.xs }]}>
        <IconButton
          icon="chevron.down"
          accessibilityLabel="Back to calendar"
          background="transparent"
          onPress={() => router.back()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  back: {
    position: 'absolute',
    left: spacing.md,
  },
});
