import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, appPrompt, Button, ErrorMessage } from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { useAuthSession } from '@/features/auth/auth-provider';
import { useTheme } from '@/hooks/use-theme';
import { useCloudSyncStatus } from '@/services/cloud/sync';
import { confirmDestructiveAction } from '@/utils/confirm-destructive';
import { AgentUiIds } from '@/utils/agent-ui';

export function CloudAccountCard() {
  const router = useRouter();
  const theme = useTheme();
  const sync = useCloudSyncStatus();
  const { isGuest, user, signOutCurrentDevice, deleteAccount } = useAuthSession();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string>();

  const provider = String(user?.app_metadata.provider ?? 'account');
  const providerLabel =
    provider === 'google' ? 'Google' : provider === 'apple' ? 'Apple' : 'Existing account';

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
      }
    } catch (signOutError) {
      setMessage(signOutError instanceof Error ? signOutError.message : 'Sign out failed.');
    } finally {
      setWorking(false);
    }
  };

  const confirmDeleteAccount = () => {
    confirmDestructiveAction({
      title: 'Delete Account?',
      message:
        'This permanently deletes your onTrack account, synced cloud data, and app-owned cloud photos. Shared trips or lists you host become unavailable to others. This cannot be undone.',
      actionLabel: 'Delete Account',
      onConfirm: () => {
        void (async () => {
          setWorking(true);
          setMessage(undefined);
          try {
            const result = await deleteAccount();
            if (result.status === 'failed') {
              setMessage(result.message ?? 'Account deletion failed.');
            }
          } catch (deleteError) {
            setMessage(
              deleteError instanceof Error ? deleteError.message : 'Account deletion failed.',
            );
          } finally {
            setWorking(false);
          }
        })();
      },
    });
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundSunken, borderColor: theme.separator }]}>
      {isGuest ? (
        <>
          <View style={styles.heading}>
            <AppText variant="bodyMedium">You’re using guest mode</AppText>
            <View style={[styles.pill, { backgroundColor: theme.accentFaint }]}>
              <AppText variant="overline" color="accent">This device</AppText>
            </View>
          </View>
          <AppText variant="caption" color="secondary">
            Create or sign in to back up your plans, protect app-owned photos, and continue on another device.
          </AppText>
          <Button
            onPress={() => router.push('/account' as never)}
            accessibilityLabel="Create or Sign In to an account">
            Create or Sign In
          </Button>
        </>
      ) : (
        <>
          <View style={styles.heading}>
            <View style={styles.flex}>
              <AppText variant="bodyMedium">{user?.email ?? 'Signed in'}</AppText>
              <AppText variant="caption" color="secondary">{providerLabel}</AppText>
            </View>
            <View style={[styles.pill, { backgroundColor: theme.accentFaint }]}>
              <AppText variant="overline" color="accent">
                {sync.state === 'syncing' ? 'Syncing' : sync.state === 'error' ? 'Attention' : 'Synced'}
              </AppText>
            </View>
          </View>
          {sync.state === 'error' ? (
            <ErrorMessage message={sync.message ?? 'Cloud sync needs attention.'} variant="caption" />
          ) : (
            <AppText variant="caption" color="secondary">
              Your account data follows you across signed-in devices and remains available between syncs.
            </AppText>
          )}
          <Button
            variant="secondary"
            disabled={working}
            testID={AgentUiIds.profile.signOut}
            onPress={() => void signOut()}
            accessibilityLabel="Sign Out of This Device">
            {working ? 'Working…' : 'Sign Out of This Device'}
          </Button>
          <Button
            variant="danger"
            disabled={working}
            testID={AgentUiIds.profile.deleteAccount}
            onPress={confirmDeleteAccount}
            accessibilityLabel="Delete Account">
            Delete Account
          </Button>
        </>
      )}
      {message ? <ErrorMessage message={message} variant="caption" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.pill },
});
