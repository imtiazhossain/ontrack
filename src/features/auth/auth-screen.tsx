import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { AppText, ErrorMessage, Screen } from '@/components/primitives';
import { radii, shadows, spacing, timeOfDayGradient } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds, useAgentUiTarget } from '@/utils/agent-ui';

import { AppleProviderButton } from './apple-provider-button';
import { useAuthSession } from './auth-provider';
import { GoogleMark } from './provider-marks';
import { ProviderButton } from './provider-button';

export function AuthScreen({
  variant = 'welcome',
  returnTo,
}: {
  variant?: 'welcome' | 'upgrade';
  returnTo?: string;
}) {
  const theme = useTheme();
  const { height, width } = useWindowDimensions();
  const {
    phase,
    workingProvider,
    error,
    continueWithProvider,
    continueAsGuest,
    clearError,
  } = useAuthSession();
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(16));
  const reduceMotion = useReducedMotion();
  const busy = phase === 'authenticating';
  const guestAgent = useAgentUiTarget(variant === 'welcome' ? AgentUiIds.auth.guest : undefined, {
    label: 'Continue as Guest',
    onPress: busy ? undefined : () => { void continueAsGuest(); },
  });
  const gradient = timeOfDayGradient(theme, new Date().getHours());
  const router = useRouter();

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 420,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [opacity, reduceMotion, translateY]);

  return (
    <LinearGradient colors={gradient} style={styles.fill}>
      <Screen
        padded={false}
        bottomInset={false}
        refresh={false}
        style={styles.transparent}
        contentStyle={{
          ...styles.content,
          minHeight: Math.max(610, height - 80),
          paddingHorizontal: width >= 720 ? spacing.xxl * 2 : spacing.xl,
        }}>
        <Animated.View style={[styles.hero, { opacity, transform: [{ translateY }] }]}>
          <View
            accessibilityElementsHidden
            style={[
              styles.orbit,
              {
                backgroundColor: theme.accentFaint,
                borderColor: theme.accentSoft,
              },
            ]}>
            <View style={[styles.orbitLine, { borderColor: theme.accentPrimary }]} />
            <View style={[styles.orbitDot, { backgroundColor: theme.accentPrimary }]} />
          </View>
          <AppText variant="overline" color="accent">
            onTrack
          </AppText>
          <AppText variant="display" style={styles.headline}>
            {variant === 'welcome' ? 'Make time feel like yours.' : 'Take onTrack with you.'}
          </AppText>
          <AppText variant="body" color="secondary" style={styles.intro}>
            {variant === 'welcome'
              ? 'A calmer place for the plans, rituals, and small moments that shape your day.'
              : 'Sign in to protect your plans and keep them in step across your devices.'}
          </AppText>
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: theme.backgroundElevated,
              borderColor: theme.separator,
              opacity,
              transform: [{ translateY }],
              maxWidth: 520,
            },
          ]}>
          <View style={styles.cardHeading}>
            <AppText variant="heading">
              {variant === 'welcome' ? 'Begin your day' : 'Create or Sign In'}
            </AppText>
            <AppText variant="caption" color="secondary">
              One tap. No password to remember.
            </AppText>
          </View>

          <View style={styles.providers}>
            <AppleProviderButton
              dark={theme.name === 'dark'}
              disabled={busy}
              testID={AgentUiIds.auth.apple}
              onPress={() => void continueWithProvider('apple', returnTo)}
            />
            <ProviderButton
              icon={<GoogleMark />}
              onPress={() => void continueWithProvider('google', returnTo)}
              disabled={busy}
              testID={AgentUiIds.auth.google}
              backgroundColor="#FFFFFF"
              borderColor="#DADCE0"
              textColor="#3C4043"
              accessibilityLabel="Continue with Google">
              Continue with Google
            </ProviderButton>
          </View>

          {error ? (
            <View accessibilityLiveRegion="assertive">
              <ErrorMessage message={error} variant="caption" />
              <Pressable
                ref={guestAgent.ref}
                testID={AgentUiIds.auth.guest}
                onLayout={guestAgent.onLayout}
                accessibilityRole="button"
                accessibilityLabel="Dismiss sign-in error"
                onPress={clearError}
                style={styles.dismiss}>
                <AppText variant="caption" color="accent">Dismiss</AppText>
              </Pressable>
            </View>
          ) : null}

          {variant === 'welcome' ? (
            <>
              <View style={styles.dividerRow} accessibilityElementsHidden>
                <View style={[styles.divider, { backgroundColor: theme.separator }]} />
                <AppText variant="caption" color="tertiary">or</AppText>
                <View style={[styles.divider, { backgroundColor: theme.separator }]} />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue as Guest"
                disabled={busy}
                onPress={() => void continueAsGuest()}
                style={({ pressed }) => [styles.guest, { opacity: pressed ? 0.65 : 1 }]}>
                <AppText variant="bodyMedium" color="accent">Continue as Guest</AppText>
              </Pressable>
              <AppText variant="caption" color="secondary" align="center">
                Guest data stays on this device until you choose to sign in.
              </AppText>
            </>
          ) : null}

          <View style={styles.legalRow}>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Privacy Policy"
              testID={AgentUiIds.auth.privacy}
              disabled={busy}
              onPress={() => router.push('/privacy' as never)}
              style={({ pressed }) => [styles.legalLink, { opacity: pressed ? 0.65 : 1 }]}>
              <AppText variant="caption" color="accent" fit>
                Privacy Policy
              </AppText>
            </Pressable>
            <AppText variant="caption" color="tertiary">
              ·
            </AppText>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Terms of Use"
              testID={AgentUiIds.auth.terms}
              disabled={busy}
              onPress={() => router.push('/terms' as never)}
              style={({ pressed }) => [styles.legalLink, { opacity: pressed ? 0.65 : 1 }]}>
              <AppText variant="caption" color="accent" fit>
                Terms of Use
              </AppText>
            </Pressable>
          </View>

          {workingProvider ? (
            <AppText
              accessibilityLiveRegion="polite"
              variant="caption"
              color="secondary"
              align="center">
              Opening {workingProvider === 'apple' ? 'Apple' : 'Google'}…
            </AppText>
          ) : null}
        </Animated.View>
      </Screen>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  transparent: { backgroundColor: 'transparent' },
  content: {
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.xxl,
  },
  hero: { width: '100%', maxWidth: 620, alignSelf: 'center', gap: spacing.sm },
  orbit: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  orbitLine: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    transform: [{ rotate: '-24deg' }],
  },
  orbitDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    position: 'absolute',
    top: 13,
    right: 14,
  },
  headline: { maxWidth: 560 },
  intro: { maxWidth: 500 },
  card: {
    width: '100%',
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.lg,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 6px 18px rgba(61, 50, 32, 0.12)' }
      : shadows.raised),
  },
  cardHeading: { gap: spacing.xs },
  providers: { gap: spacing.md },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  divider: { flex: 1, height: StyleSheet.hairlineWidth },
  guest: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  dismiss: { alignSelf: 'flex-start', paddingVertical: spacing.xs },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  legalLink: { minHeight: 44, justifyContent: 'center' },
});
