import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  Dropdown,
  ErrorMessage,
  HeaderBackButton,
  LoadingBlock,
  Screen,
  ScreenHeader,
  SectionHeader,
} from '@/components/primitives';
import { useResponsive } from '@/hooks/use-responsive';
import {
  ApiUsageError,
  fetchApiUsageSnapshot,
} from '@/services/http/api-usage-client';
import type {
  ApiUsageServiceSnapshot,
  ApiUsageSnapshot,
} from '@/services/http/api-usage-catalog';
import { AgentTestId, AgentUiIds } from '@/utils/agent-ui';

import { IntegrationsServiceCard } from './integrations-service-card';
import { IntegrationsStatusCard } from './integrations-status-card';
import {
  INTEGRATIONS_SORT_OPTIONS,
  integrationsSortSectionTitle,
  sortIntegrationServices,
  type IntegrationsSortMode,
} from './integrations-sort';

export function ApiUsageScreen() {
  const { spacing } = useResponsive();
  const [services, setServices] = useState<ApiUsageServiceSnapshot[]>([]);
  const [healthSummary, setHealthSummary] = useState<ApiUsageSnapshot['healthSummary']>();
  const [generatedAt, setGeneratedAt] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<IntegrationsSortMode>('status-worst');

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(undefined);
    try {
      const snapshot = await fetchApiUsageSnapshot(signal);
      if (signal?.aborted) return;
      setServices(snapshot.services);
      setHealthSummary(snapshot.healthSummary);
      setGeneratedAt(snapshot.generatedAt);
    } catch (reason) {
      if (reason instanceof Error && reason.name === 'AbortError') return;
      if (signal?.aborted) return;
      const message =
        reason instanceof ApiUsageError
          ? reason.message
          : 'Integrations could not be loaded.';
      setError(message);
      setServices([]);
      setHealthSummary(undefined);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const sorted = useMemo(
    () => sortIntegrationServices(services, sortMode),
    [services, sortMode],
  );

  return (
    <Screen contentStyle={{ gap: spacing.lg }} onRefresh={() => load()}>
      <ScreenHeader
        eyebrow="Development only"
        title="Integrations"
        subtitle="Third-party health and app quotas for this Metro host. Provider billing dashboards are not shown."
        leading={
          <HeaderBackButton
            compact
            accessibilityLabel="Back to profile"
            fallback="/(tabs)/profile"
            testID={AgentUiIds.apiUsage.back}
          />
        }
      />

      <AgentTestId testID={AgentUiIds.apiUsage.screen} label="Integrations screen" style={{ gap: spacing.lg }}>
        {loading && services.length === 0 ? (
          <LoadingBlock label="Checking integrations…" />
        ) : null}

        {error ? (
          <Card style={{ gap: spacing.md }}>
            <ErrorMessage message={error} />
            <Button
              variant="secondary"
              testID={AgentUiIds.apiUsage.retry}
              accessibilityLabel="Retry loading integrations"
              onPress={() => void load()}>
              Retry
            </Button>
          </Card>
        ) : null}

        {healthSummary ? <IntegrationsStatusCard summary={healthSummary} /> : null}

        {services.length > 0 ? (
          <Card variant="sunken" style={{ gap: spacing.md }}>
            <Dropdown
              label="Sort"
              value={sortMode}
              testID={AgentUiIds.apiUsage.sort}
              accessibilityHint="Opens a dropdown to choose another sort order"
              options={INTEGRATIONS_SORT_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
                testID: AgentUiIds.apiUsage.sortOption(option.value),
              }))}
              onChange={setSortMode}
              fieldBackground="transparent"
            />
          </Card>
        ) : null}

        {sorted.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <SectionHeader
              flush
              title={integrationsSortSectionTitle(sortMode)}
              actionLabel="Sync"
              actionTestID={AgentUiIds.apiUsage.sync}
              actionDisabled={loading}
              onAction={() => void load()}
            />
            {sorted.map((service) => (
              <IntegrationsServiceCard key={service.id} service={service} />
            ))}
          </View>
        ) : null}

        {generatedAt ? (
          <AppText variant="caption" color="tertiary">
            Updated {new Date(generatedAt).toLocaleString()}
          </AppText>
        ) : null}
      </AgentTestId>
    </Screen>
  );
}
