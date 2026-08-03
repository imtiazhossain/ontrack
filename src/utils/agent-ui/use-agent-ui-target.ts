import { useCallback, useEffect, useRef } from 'react';
import { type LayoutChangeEvent, type View } from 'react-native';

import {
  isAgentUiEnabled,
  registerAgentUiTarget,
  unregisterAgentUiTarget,
} from './registry';

type AgentUiTargetOptions = {
  label?: string;
  onPress?: () => void;
};

/**
 * Registers a native view with the __DEV__ agent-ui registry so dump/tap
 * deep links can find it without screenshot coordinates.
 */
export function useAgentUiTarget(
  testID: string | undefined,
  options: AgentUiTargetOptions = {},
) {
  const ref = useRef<View>(null);
  const label = options.label;
  const onPress = options.onPress;
  const enabled = isAgentUiEnabled() && Boolean(testID);

  const measureAndRegister = useCallback(() => {
    if (!enabled || !testID) return;
    const node = ref.current;
    if (!node) {
      registerAgentUiTarget(testID, { label, press: onPress, frame: null });
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      registerAgentUiTarget(testID, {
        label,
        press: onPress,
        frame: { x, y, width, height },
      });
    });
  }, [enabled, testID, label, onPress]);

  useEffect(() => {
    if (!enabled || !testID) return;
    measureAndRegister();
    return () => unregisterAgentUiTarget(testID);
  }, [enabled, testID, measureAndRegister]);

  const onLayout = useCallback(
    (_event?: LayoutChangeEvent) => {
      measureAndRegister();
    },
    [measureAndRegister],
  );

  if (!enabled) {
    return { ref, onLayout: undefined as undefined, testID };
  }

  return { ref, onLayout, testID };
}
