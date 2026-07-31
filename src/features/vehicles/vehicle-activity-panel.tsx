import { View } from 'react-native';

import { AppText, Card, SectionHeader } from '@/components/primitives';
import type { Vehicle } from '@/features/vehicles/types';
import { useResponsive } from '@/hooks/use-responsive';
import { formatDueLabel } from '@/utils/date';

export function VehicleActivityPanel({ vehicle }: { vehicle: Vehicle }) {
  const { spacing: gap } = useResponsive();

  return (
    <View style={{ gap: gap.lg }}>
      <SectionHeader title="Change history" />
      {vehicle.activity.length === 0 ? (
        <AppText variant="caption" color="secondary">
          Edits you and collaborators make will show up here.
        </AppText>
      ) : (
        vehicle.activity.map((event) => (
          <Card key={event.id}>
            <AppText variant="heading" fit numberOfLines={2}>
              {event.summary}
            </AppText>
            <AppText variant="caption" color="secondary" fit numberOfLines={1}>
              {event.actorDisplayName} · {formatDueLabel(event.createdAt.slice(0, 10))}
            </AppText>
          </Card>
        ))
      )}
    </View>
  );
}
