import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { RefreshControl, type RefreshControlProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { refreshAppData } from '@/services/cloud/sync';

/** Shared pull-to-refresh: cloud pull + optional page-specific work. */
export function usePullToRefresh(extra?: () => void | Promise<void>) {
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void (async () => {
      try {
        await refreshAppData();
        await extra?.();
      } catch {
        // Surface stays usable; page can show its own error UI if needed.
      } finally {
        setRefreshing(false);
      }
    })();
  }, [extra]);

  const refreshControl = useMemo(
    (): ReactElement<RefreshControlProps> => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={theme.accentPrimary}
        colors={[theme.accentPrimary]}
      />
    ),
    [onRefresh, refreshing, theme.accentPrimary],
  );

  return { refreshing, onRefresh, refreshControl };
}
