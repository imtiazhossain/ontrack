import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/design-system';

import { IconButton } from './button';

export function BackButton({ accessibilityLabel = 'Go back' }: { accessibilityLabel?: string }) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <IconButton
        icon="chevron.left"
        accessibilityLabel={accessibilityLabel}
        background="transparent"
        onPress={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'flex-start', marginBottom: spacing.sm },
});
