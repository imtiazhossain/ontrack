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
 * Thin __DEV__ registration wrapper for custom Pressables / layout anchors
 * that cannot use Button/Input primitives. Pass `onPress` for tappable
 * controls; omit it for non-interactive section/panel anchors that still
 * need dump/hit/overlay → source lookup. Production passes children through.
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
