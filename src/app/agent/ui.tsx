import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { LoadingBlock } from '@/components/primitives';
import { getLastAgentUiContentRoute, handleAgentUiRequest, isAgentUiEnabled } from '@/utils/agent-ui';

/**
 * Cold-start fallback for agent dump/tap/exists ops.
 * Prefer the root Linking listener (keeps the current screen mounted).
 * Host scripts open `ontrack:///agent/ui?op=dump|tap|exists&id=…`.
 */
export default function AgentUiRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ op?: string; id?: string }>();

  useEffect(() => {
    let active = true;
    const returnTo = getLastAgentUiContentRoute() ?? '/';
    // Linking listener usually handles this first; re-run is idempotent for dump/exists.
    void handleAgentUiRequest(params).finally(() => {
      if (!active) return;
      // A pressed control may navigate. Give that navigation a frame to become
      // the latest content route; otherwise restore the route that initiated the op.
      setTimeout(() => {
        if (!active) return;
        router.replace((getLastAgentUiContentRoute() ?? returnTo) as never);
      }, 100);
    });
    return () => {
      active = false;
    };
  }, [params, router]);

  if (!isAgentUiEnabled()) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <LoadingBlock label="Agent UI…" />
    </View>
  );
}
