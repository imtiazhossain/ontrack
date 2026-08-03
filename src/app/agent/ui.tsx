import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { LoadingBlock } from '@/components/primitives';
import { handleAgentUiRequest, isAgentUiEnabled } from '@/utils/agent-ui';

/**
 * Cold-start fallback for agent dump/tap/exists ops.
 * Prefer the root Linking listener (keeps the current screen mounted).
 * Host scripts open `ontrack:///agent/ui?op=dump|tap|exists&id=…`.
 */
export default function AgentUiRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ op?: string; id?: string }>();
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    // Linking listener usually handles this first; re-run is idempotent for dump/exists.
    void handleAgentUiRequest(params).finally(() => {
      if (!active) return;
      setDone(true);
      if (router.canGoBack()) {
        router.back();
      }
    });
    return () => {
      active = false;
    };
  }, [params, router]);

  if (!isAgentUiEnabled()) {
    return <Redirect href="/(tabs)" />;
  }

  if (done && !router.canGoBack()) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <LoadingBlock label="Agent UI…" />
    </View>
  );
}
