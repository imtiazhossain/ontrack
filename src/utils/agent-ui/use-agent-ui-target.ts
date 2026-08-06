import { useCallback, useEffect, useRef, type RefCallback } from 'react';
import { type LayoutChangeEvent, type View } from 'react-native';

import {
    isAgentUiEnabled,
    registerAgentUiTarget,
    unregisterAgentUiTarget,
} from './registry';

type AgentUiTargetOptions = {
  label?: string;
  /** Live field value for agent-ui --contains (does not change a11y label). */
  value?: string;
  onPress?: () => void;
};

export type AgentUiTarget = {
  ref: RefCallback<View | null>;
  onLayout: ((event?: LayoutChangeEvent) => void) | undefined;
  testID: string | undefined;
};

/**
 * Registers a native view with the __DEV__ agent-ui registry so dump/tap
 * deep links can find it without screenshot coordinates.
 */
export function useAgentUiTarget(
  testID: string | undefined,
  options: AgentUiTargetOptions = {},
): AgentUiTarget {
  const ref = useRef<View | null>(null);
  const label = options.label;
  const value = options.value;
  const onPress = options.onPress;
  const enabled = isAgentUiEnabled() && Boolean(testID);

  const measureAndRegister = useCallback(() => {
    if (!enabled || !testID) return;
    const node = ref.current;
    if (!node) {
      registerAgentUiTarget(testID, {
        label,
        value,
        press: onPress,
        frame: null,
        node: null,
      });
      return;
    }
    registerAgentUiTarget(testID, { label, value, press: onPress, node });
    node.measureInWindow((x, y, width, height) => {
      registerAgentUiTarget(testID, {
        label,
        value,
        press: onPress,
        node,
        frame: { x, y, width, height },
      });
    });
  }, [enabled, testID, label, value, onPress]);

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

  const setRef = useCallback<RefCallback<View | null>>(
    (node) => {
      ref.current = node;
      if (enabled && testID) {
        registerAgentUiTarget(testID, { label, value, press: onPress, node });
        if (node) measureAndRegister();
      }
    },
    [enabled, testID, label, value, onPress, measureAndRegister],
  );

  if (!enabled) {
    return { ref: setRef, onLayout: undefined as undefined, testID };
  }

  return { ref: setRef, onLayout, testID };
}
