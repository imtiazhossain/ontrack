import type { PropsWithChildren } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { isAgentUiEnabled } from './registry';
import { useAgentUiTarget } from './use-agent-ui-target';

type AgentTestIdProps = PropsWithChildren<{
  testID?: string;
  label?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}>;

/**
 * Thin __DEV__ registration wrapper for custom Pressables that cannot use
 * Button/Input primitives. Passes through children unchanged in production.
 */
export function AgentTestId({
  testID,
  label,
  onPress,
  style,
  children,
}: AgentTestIdProps) {
  const agent = useAgentUiTarget(testID, { label, onPress });

  if (!isAgentUiEnabled()) {
    return <>{children}</>;
  }

  return (
    <View
      ref={agent.ref}
      testID={testID}
      collapsable={false}
      onLayout={agent.onLayout}
      style={style}>
      {children}
    </View>
  );
}
