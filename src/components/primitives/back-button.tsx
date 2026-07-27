import { type Href, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/design-system';
import { goBackOrReplace } from '@/utils/navigation';

import { IconButton } from './button';

export function BackButton({
  accessibilityLabel = 'Go back',
  fallback = '/(tabs)',
}: {
  accessibilityLabel?: string;
  fallback?: Href;
}) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <IconButton
        icon="chevron.left"
        accessibilityLabel={accessibilityLabel}
        background="transparent"
        onPress={() => goBackOrReplace(router, fallback)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'flex-start', marginBottom: spacing.sm },
});
