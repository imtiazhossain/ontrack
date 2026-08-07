import { type ReactNode, useCallback, useMemo, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import {
  canUseDeveloperTools,
  useCanUseDeveloperTools,
} from '@/features/account/dev-access';
import { isDevModeEnabled, useDevMode } from '@/store/dev-mode';

import {
  isAgentUiOverlayEnabled,
  setAgentUiOverlayEnabled,
  subscribeAgentUiOverlay,
} from './overlay';
import { isAgentUiEnabled } from './registry';

type Props = {
  children: ReactNode;
};

/**
 * When overlay paint is off, a page-wide long-press turns it on (and shows the FAB) —
 * only for developer-flagged accounts with Dev Mode on (agent-ui still __DEV__).
 * Wraps app content (not FullWindowOverlay) so touches stay pass-through.
 */
export function AgentUiFabRestoreHost({ children }: Props) {
  const overlayOn = useSyncExternalStore(
    subscribeAgentUiOverlay,
    isAgentUiOverlayEnabled,
    () => false,
  );
  const canUseDevTools = useCanUseDeveloperTools();
  const devModeEnabled = useDevMode((state) => state.enabled);
  const listening =
    isAgentUiEnabled() && canUseDevTools && devModeEnabled && !overlayOn;

  const onRestore = useCallback(() => {
    if (!canUseDeveloperTools() || !isDevModeEnabled()) return;
    setAgentUiOverlayEnabled(true);
  }, []);

  const gesture = useMemo(
    () =>
      Gesture.LongPress()
        .enabled(listening)
        .minDuration(700)
        .maxDistance(12)
        .cancelsTouchesInView(false)
        .onStart(() => {
          runOnJS(onRestore)();
        }),
    [listening, onRestore],
  );

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.fill} collapsable={false}>
        {children}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
