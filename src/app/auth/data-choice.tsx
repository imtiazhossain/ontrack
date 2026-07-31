import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, appPrompt, Button, ErrorMessage, Screen } from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { useAuthSession, type DataResolution } from '@/features/auth/auth-provider';
import { useTheme } from '@/hooks/use-theme';

export default function DataChoiceScreen() {
  const theme = useTheme();
  const { error, resolveDataConflict } = useAuthSession();
  const [working, setWorking] = useState<DataResolution>();

  const resolve = async (choice: DataResolution) => {
    setWorking(choice);
    try {
      await resolveDataConflict(choice);
    } catch {
      // The coordinator keeps the route active and exposes an accessible error.
    } finally {
      setWorking(undefined);
    }
  };

  const confirmDevice = () => {
    appPrompt.alert(
      'Replace cloud account data?',
      'The complete dataset on this device will replace the account dataset on every synced device. This cannot be undone.',
      [
        { text: 'Keep Choosing', style: 'cancel' },
        {
          text: 'Use This Device',
          style: 'destructive',
          onPress: () => void resolve('device'),
        },
      ],
    );
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={[styles.badge, { backgroundColor: theme.accentFaint }]}>
        <AppText variant="overline" color="accent">One careful choice</AppText>
      </View>
      <AppText variant="title">Which plans should onTrack keep?</AppText>
      <AppText variant="body" color="secondary">
        This device and your cloud account both contain changes. Nothing has been replaced yet.
      </AppText>

      <View style={[styles.option, { backgroundColor: theme.backgroundElevated, borderColor: theme.accentPrimary }]}>
        <AppText variant="heading">Use Cloud Account</AppText>
        <AppText variant="body" color="secondary">
          Restore the account’s plans on this device. This is the safest choice when you already use onTrack elsewhere.
        </AppText>
        <Button
          size="lg"
          disabled={Boolean(working)}
          onPress={() => void resolve('cloud')}
          accessibilityLabel="Use Cloud Account data">
          {working === 'cloud' ? 'Restoring…' : 'Use Cloud Account'}
        </Button>
      </View>

      <View style={[styles.option, { backgroundColor: theme.backgroundSunken, borderColor: theme.separator }]}>
        <AppText variant="heading">Use This Device</AppText>
        <AppText variant="body" color="secondary">
          Upload every plan and app-owned photo from this device, replacing the account dataset.
        </AppText>
        <Button
          variant="secondary"
          disabled={Boolean(working)}
          onPress={confirmDevice}
          accessibilityLabel="Use data from this device">
          {working === 'device' ? 'Uploading…' : 'Use This Device'}
        </Button>
      </View>

      {error ? <ErrorMessage message={error} /> : null}

      <Button
        variant="ghost"
        disabled={Boolean(working)}
        onPress={() => void resolve('cancel')}
        accessibilityLabel="Cancel sign in and keep guest data">
        Cancel and keep guest data
      </Button>
      <AppText variant="caption" color="secondary" align="center">
        Cancel signs this account out on this device and leaves the guest dataset unchanged.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.pill },
  option: { padding: spacing.xl, borderWidth: 1, borderRadius: radii.lg, gap: spacing.md },
});
