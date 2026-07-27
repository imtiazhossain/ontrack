import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, ErrorMessage, Input } from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import {
  createAccountWithEmail,
  signInWithEmail,
  signOutCloudAccount,
} from '@/services/cloud/account';
import { getSupabaseClient } from '@/services/cloud/supabase';
import { useCloudSyncStatus } from '@/services/cloud/sync';

export function CloudAccountCard() {
  const theme = useTheme();
  const sync = useCloudSyncStatus();
  const configured = Boolean(getSupabaseClient());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean }>();

  const submit = async (mode: 'signin' | 'signup') => {
    setMessage(undefined);
    if (!email.trim() || password.length < 8) {
      setMessage({
        text: 'Enter an email and a password with at least 8 characters.',
        isError: true,
      });
      return;
    }
    setWorking(true);
    try {
      const user =
        mode === 'signin'
          ? await signInWithEmail(email, password)
          : await createAccountWithEmail(email, password);
      setMessage({
        text: user
          ? 'Signed in. This device will now sync.'
          : 'Check your email to confirm the account, then sign in.',
        isError: false,
      });
      setPassword('');
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : 'Account request failed.',
        isError: true,
      });
    } finally {
      setWorking(false);
    }
  };

  const signOut = async () => {
    setWorking(true);
    setMessage(undefined);
    try {
      await signOutCloudAccount();
      setMessage({ text: 'Signed out. Local data remains on this device.', isError: false });
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : 'Sign out failed.',
        isError: true,
      });
    } finally {
      setWorking(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundSunken, borderColor: theme.separator }]}>
      {sync.email ? (
        <>
          <AppText variant="bodyMedium">{sync.email}</AppText>
          {sync.state === 'error' ? (
            <ErrorMessage
              message={sync.message ?? 'Sync needs attention.'}
              variant="caption"
            />
          ) : (
            <AppText variant="caption" color="secondary">
              {sync.state === 'syncing'
                ? 'Syncing…'
                : 'Cloud sync is on. Add-ons, agents, and app data follow this account.'}
            </AppText>
          )}
          <Button variant="secondary" disabled={working} onPress={() => void signOut()} accessibilityLabel="Sign out of cloud sync">
            Sign out
          </Button>
        </>
      ) : configured ? (
        <>
          <AppText variant="bodyMedium">Sync between devices</AppText>
          <AppText variant="caption" color="secondary">
            Use one onTrack account on every device. The app still works offline between syncs.
          </AppText>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
          />
          <View style={styles.actions}>
            <Button disabled={working} style={styles.flex} onPress={() => void submit('signin')} accessibilityLabel="Sign in">
              Sign in
            </Button>
            <Button variant="secondary" disabled={working} style={styles.flex} onPress={() => void submit('signup')} accessibilityLabel="Create account">
              Create account
            </Button>
          </View>
        </>
      ) : (
        <>
          <AppText variant="bodyMedium">Local test mode</AppText>
          <AppText variant="caption" color="secondary">
            This build works without a server. Add the existing Supabase URL and publishable key to the TestFlight environment to enable account sync.
          </AppText>
        </>
      )}
      {message ? (
        message.isError ? (
          <ErrorMessage message={message.text} variant="caption" />
        ) : (
          <AppText variant="caption" color="secondary">{message.text}</AppText>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
