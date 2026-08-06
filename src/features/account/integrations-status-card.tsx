import { View } from 'react-native';

import {
  AppText,
  Card,
  PanelTitle,
  StatusBadge,
  type StatusBadgeTone,
} from '@/components/primitives';
import { useResponsive } from '@/hooks/use-responsive';
import type { ApiUsageSnapshot } from '@/services/http/api-usage-catalog';
import { AgentUiIds } from '@/utils/agent-ui';

function countTone(
  key: keyof ApiUsageSnapshot['healthSummary'],
): StatusBadgeTone {
  switch (key) {
    case 'healthy':
      return 'success';
    case 'degraded':
      return 'warning';
    case 'down':
    case 'unconfigured':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function IntegrationsStatusCard({
  summary,
}: {
  summary: ApiUsageSnapshot['healthSummary'];
}) {
  const { spacing } = useResponsive();
  const chips = (
    [
      ['healthy', summary.healthy],
      ['degraded', summary.degraded],
      ['down', summary.down],
      ['unconfigured', summary.unconfigured],
      ['unchecked', summary.unchecked],
    ] as const
  ).filter(([, count]) => count > 0);

  const a11y = chips.map(([key, count]) => `${count} ${key}`).join(' · ');

  return (
    <Card
      style={{ gap: spacing.md }}
      testID={AgentUiIds.apiUsage.healthSummary}
      accessibilityLabel={`Status Overview. ${a11y || 'No services'}`}>
      <PanelTitle>Status overview</PanelTitle>
      {chips.length > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.sm,
          }}>
          {chips.map(([key, count]) => (
            <StatusBadge
              key={key}
              tone={countTone(key)}
              label={`${count} ${key}`}
            />
          ))}
        </View>
      ) : (
        <AppText variant="body" fit>
          No services
        </AppText>
      )}
      <AppText variant="caption" color="secondary">
        Paid providers use circuit state. Public APIs get a lightweight reachability check.
      </AppText>
    </Card>
  );
}
