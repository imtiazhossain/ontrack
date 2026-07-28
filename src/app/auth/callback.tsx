import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText, Button, ErrorMessage, Screen } from '@/components/primitives';
import { spacing } from '@/design-system';
import { useAuthSession } from '@/features/auth/auth-provider';
import { useTheme } from '@/hooks/use-theme';
import { accessibleAuthError } from '@/services/cloud/account';

export default function OAuthCallbackScreen() {
  const theme = useTheme();
  const router = useRouter();
  const incomingUrl = Linking.useURL();
  const { phase, error, isGuest, completeOAuthCallback, clearError } = useAuthSession();
  const attempted = useRef(false);
  const [localError, setLocalError] = useState<string>();

  useEffect(() => {
    if (!incomingUrl || attempted.current) return;
    attempted.current = true;
    void completeOAuthCallback(incomingUrl).catch((callbackError: unknown) => {
      setLocalError(accessibleAuthError(callbackError));
    });
  }, [completeOAuthCallback, incomingUrl]);

  useEffect(() => {
    if (phase === 'authenticated') router.replace('/' as never);
    if (phase === 'resolving-data') router.replace('/auth/data-choice' as never);
  }, [phase, router]);

  const message =
    localError ??
    error ??
    (!incomingUrl ? 'The sign-in response did not include a callback URL.' : undefined);

  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <View style={styles.center}>
        {message ? (
          <>
            <AppText variant="heading">Sign-in needs another try</AppText>
            <ErrorMessage message={message} />
            <Button
              onPress={() => {
                clearError();
                router.replace((isGuest ? '/account' : '/welcome') as never);
              }}
              accessibilityLabel="Return to sign in">
              Return to sign in
            </Button>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color={theme.accentPrimary} />
            <AppText variant="heading" align="center">Finishing sign-in…</AppText>
            <AppText variant="body" color="secondary" align="center">
              Your plans are staying put while we open your account.
            </AppText>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
  center: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
});
