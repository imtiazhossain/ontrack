import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  appPrompt,
  Button,
  ErrorMessage,
  StatusBadge,
} from '@/components/primitives';
import { radii } from '@/design-system';
import { useAuthSession } from '@/features/auth/auth-provider';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useCloudSyncStatus } from '@/services/cloud/sync';
import { AgentUiIds } from '@/utils/agent-ui';;

export function CloudAccountCard() {
  const router = useRouter();
  const theme = useTheme();
  const { spacing } = useResponsive();
  const sync = useCloudSyncStatus();
  const { isGuest, user, signOutCurrentDevice } = useAuthSession();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string>();

  const provider = String(user?.app_metadata.provider ?? 'account');
  const providerLabel =
    provider === 'google' ? 'Google' : provider === 'apple' ? 'Apple' : 'Existing account';

  const syncTone =
    sync.state === 'syncing' ? 'neutral' : sync.state === 'error' ? 'warning' : 'success';
  const syncLabel =
    sync.state === 'syncing' ? 'Syncing' : sync.state === 'error' ? 'Attention' : 'Synced';

  const signOut = async (force = false) => {
    setWorking(true);
    setMessage(undefined);
    try {
      const result = await signOutCurrentDevice(force);
      if (result.status === 'sync-failed') {
        setMessage(result.message);
        appPrompt.alert(
          'Changes are not synced',
          `${result.message}\n\nSigning out anyway removes this device’s local data. Cloud data and photos in your system library are not deleted.`,
          [
            { text: 'Stay Signed In', style: 'cancel' },
            { text: 'Retry Sync', onPress: () => void signOut(false) },
            {
              text: 'Sign Out Anyway',
              style: 'destructive',
              onPress: () => void signOut(true),
            },
          ],
        );
      } else if (result.status === 'cleanup-failed') {
        // Device is already signed out; do not offer "Stay Signed In".
        setMessage(result.message);
      }
    } catch (signOutError) {
      setMessage(signOutError instanceof Error ? signOutError.message : 'Sign out failed.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          gap: spacing.sm,
          padding: spacing.sm,
          backgroundColor: theme.backgroundElevated,
          borderColor: theme.separator,
        },
      ]}>
      {isGuest ? (
        <>
          <View style={[styles.heading, { gap: spacing.sm }]}>
            <View style={[styles.flex, { gap: spacing.xxs, minWidth: 0 }]}>
              <AppText variant="callout" fit>
                Guest mode
              </AppText>
              <AppText variant="caption" color="secondary" numberOfLines={2}>
                Sign in to back up plans and continue on other devices.
              </AppText>
            </View>
            <StatusBadge label="This device" tone="neutral" showDot={false} />
          </View>
          <Button
            size="sm"
            onPress={() => router.push('/account' as never)}
            accessibilityLabel="Create or Sign In to an account">
            Create or Sign In
          </Button>
        </>
      ) : (
        <>
          <View style={[styles.heading, { gap: spacing.sm }]}>
            <View style={[styles.flex, { gap: spacing.xxs, minWidth: 0 }]}>
              <AppText variant="callout" fit numberOfLines={1}>
                {user?.email ?? 'Signed in'}
              </AppText>
              <AppText variant="caption" color="secondary" fit>
                {providerLabel}
              </AppText>
            </View>
            <StatusBadge label={syncLabel} tone={syncTone} />
          </View>
          {sync.state === 'error' ? (
            <ErrorMessage message={sync.message ?? 'Cloud sync needs attention.'} variant="caption" />
          ) : null}
          <Button
            size="sm"
            variant="secondary"
            disabled={working}
            testID={AgentUiIds.profile.signOut}
            onPress={() => void signOut()}
            accessibilityLabel="Sign Out of This Device">
            {working ? 'Working…' : 'Sign Out'}
          </Button>
        </>
      )}
      {message ? <ErrorMessage message={message} variant="caption" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    borderCurve: 'continuous',
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex: { flex: 1 },
});
