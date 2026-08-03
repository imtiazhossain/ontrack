import { type Href, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/design-system';
import { goBackOrReplace } from '@/utils/navigation';

import { AgentUiIds } from '@/utils/agent-ui';

import { IconButton } from './button';

export function BackButton({
  accessibilityLabel = 'Go Back',
  fallback = '/(tabs)',
  testID = AgentUiIds.chrome.back,
}: {
  accessibilityLabel?: string;
  fallback?: Href;
  testID?: string;
}) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <IconButton
        icon="chevron-left"
        accessibilityLabel={accessibilityLabel}
        background="transparent"
        testID={testID}
        onPress={() => goBackOrReplace(router, fallback)}
      />
    </View>
  );
}

/** Back control used by the shared native stack header on every non-root route. */
export function HeaderBackButton({
  accessibilityLabel = 'Go Back',
  fallback = '/(tabs)',
  alwaysNavigateTo,
  testID = AgentUiIds.chrome.headerBack,
}: {
  accessibilityLabel?: string;
  fallback?: Href;
  /** When set, always navigate here instead of popping the stack. */
  alwaysNavigateTo?: Href;
  testID?: string;
}) {
  const router = useRouter();

  return (
    <IconButton
      icon="back"
      accessibilityLabel={accessibilityLabel}
      background="transparent"
      testID={testID}
      onPress={() =>
        alwaysNavigateTo
          ? router.replace(alwaysNavigateTo)
          : goBackOrReplace(router, fallback)
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'flex-start', marginBottom: spacing.sm },
});
