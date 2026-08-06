import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Card,
  StatusBadge,
  type StatusBadgeTone,
} from '@/components/primitives';
import { useResponsive } from '@/hooks/use-responsive';
import type {
  ApiServiceHealth,
  ApiUsageServiceSnapshot,
} from '@/services/http/api-usage-catalog';
import { AgentUiIds } from '@/utils/agent-ui';

function healthTone(health: ApiServiceHealth): StatusBadgeTone {
  switch (health) {
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

function usageHeadline(service: ApiUsageServiceSnapshot): string {
  if (service.used != null && service.max != null && service.remaining != null) {
    return `${service.used} used · ${service.remaining} left of ${service.max}`;
  }
  if (service.metering === 'local') return 'Local · unlimited';
  if (service.metering === 'route-limit') return 'Route-limited';
  if (service.metering === 'provider-account') return 'Provider account';
  return 'Not metered';
}

export function IntegrationsServiceCard({
  service,
}: {
  service: ApiUsageServiceSnapshot;
}) {
  const { spacing } = useResponsive();
  const detail = [
    service.healthDetail,
    service.healthLatencyMs != null ? `${service.healthLatencyMs}ms` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card
      style={{ gap: spacing.sm }}
      testID={AgentUiIds.apiUsage.service(service.id)}
      accessibilityLabel={`${service.name}. ${service.healthLabel}. ${usageHeadline(service)}. Used by ${service.usedBy.join(', ')}`}>
      <View style={[styles.rowTop, { gap: spacing.sm }]}>
        <View style={[styles.titleCol, { gap: spacing.xxs, minWidth: 0, flexShrink: 1 }]}>
          <AppText variant="callout" bold fit numberOfLines={1}>
            {service.name}
          </AppText>
          <AppText variant="caption" color="secondary" fit numberOfLines={1}>
            {service.provider}
          </AppText>
        </View>
        <StatusBadge tone={healthTone(service.health)} label={service.healthLabel} />
      </View>

      <AppText variant="body" fit numberOfLines={1}>
        {usageHeadline(service)}
      </AppText>
      {detail ? (
        <AppText variant="caption" color="secondary" numberOfLines={2}>
          {detail}
        </AppText>
      ) : null}
      <AppText variant="caption" color="tertiary" numberOfLines={2}>
        Used by {service.usedBy.join(' · ')}
      </AppText>
      {service.note ? (
        <AppText variant="caption" color="tertiary" numberOfLines={2}>
          {service.note}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleCol: {
    flex: 1,
  },
});
