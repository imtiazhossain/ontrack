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
 * need dump/hit/overlay → source lookup.
 *
 * Production skips registry wiring, but still wraps when `style` is set so
 * layout (absolute FABs, gaps, hit boxes) is not dropped outside __DEV__.
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
    if (style == null) {
      return <>{children}</>;
    }
    return <View style={style}>{children}</View>;
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
