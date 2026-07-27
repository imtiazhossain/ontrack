import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, ErrorMessage, Screen, Symbol } from '@/components/primitives';
import { spacing } from '@/design-system';
import { travelCalendarDrafts } from '@/features/travel/calendar';
import {
  createInstalledTravelInviteUrl,
  decodeTravelInvite,
  isShortTravelInvite,
  ONTRACK_APP_STORE_URL,
  resolveTravelInvite,
  travelInviteKey,
} from '@/features/travel/share';
import { FeatureThemeProvider } from '@/hooks/use-theme';
import { useAddons } from '@/store/addons';
import { usePreferences } from '@/store/preferences';
import { useSchedule } from '@/store/schedule';
import { useTravel } from '@/store/travel';

export function TravelInviteLanding({ invite }: { invite?: string }) {
  return (
    <FeatureThemeProvider feature="travel">
      <TravelInviteLandingContent invite={invite} />
    </FeatureThemeProvider>
  );
}

function TravelInviteLandingContent({ invite }: { invite?: string }) {
  const router = useRouter();
  const hasOnboarded = usePreferences((state) => state.hasOnboarded);
  const savePlan = useTravel((state) => state.savePlan);
  const replaceTravelActivities = useSchedule((state) => state.replaceTravelActivities);
  const setAddonEnabled = useAddons((state) => state.setEnabled);
  const isShortInvite = Boolean(invite && isShortTravelInvite(invite));
  const embeddedDecoded = useMemo(
    () => (invite && !isShortInvite ? decodeTravelInvite(invite) : undefined),
    [invite, isShortInvite],
  );
  const [remoteResult, setRemoteResult] = useState<{
    invite: string;
    plan?: Awaited<ReturnType<typeof resolveTravelInvite>>;
    error?: string;
  }>();
  const currentRemoteResult = remoteResult?.invite === invite ? remoteResult : undefined;
  const remoteDecoded = currentRemoteResult?.plan;
  const inviteError = currentRemoteResult?.error;
  const decoded = isShortInvite ? remoteDecoded : embeddedDecoded;
  const resolving = isShortInvite && !decoded && !inviteError;
  const isWeb = process.env.EXPO_OS === 'web';
  const nativeError =
    !invite
      ? 'This travel invitation is invalid or incomplete.'
      : inviteError ??
        (!resolving && !decoded ? 'This travel invitation is invalid or expired.' : undefined);

  useEffect(() => {
    if (!invite || !isShortInvite) return;

    let active = true;
    void resolveTravelInvite(invite)
      .then((plan) => {
        if (!active) return;
        setRemoteResult(
          plan
            ? { invite, plan }
            : { invite, error: 'This travel invitation is invalid or expired.' },
        );
      })
      .catch((error: unknown) => {
        if (!active) return;
        setRemoteResult({
          invite,
          error: error instanceof Error ? error.message : 'This invitation could not be opened.',
        });
      });
    return () => {
      active = false;
    };
  }, [invite, isShortInvite]);

  useEffect(() => {
    if (isWeb) return;
    if (!invite || !decoded) return;
    const now = new Date().toISOString();
    const plan = {
      ...decoded,
      id: `trip-invite-${travelInviteKey(invite)}`,
      createdAt: now,
      updatedAt: now,
    };
    savePlan(plan);
    replaceTravelActivities(plan.id, travelCalendarDrafts(plan));
    setAddonEnabled('travel', true);
    router.replace(
      hasOnboarded
        ? ('/travel' as never)
        : ({ pathname: '/onboarding', params: { returnTo: '/travel' } } as never),
    );
  }, [
    decoded,
    hasOnboarded,
    invite,
    isWeb,
    replaceTravelActivities,
    router,
    savePlan,
    setAddonEnabled,
  ]);

  if (!isWeb) {
    return (
      <Screen contentStyle={styles.center}>
        <Symbol name="airplane" size={44} />
        {nativeError ? (
          <ErrorMessage message={nativeError} variant="heading" align="center" />
        ) : (
          <AppText variant="heading" align="center">Opening your trip…</AppText>
        )}
        {nativeError ? (
          <Button onPress={() => router.replace('/' as never)}>Go to onTrack</Button>
        ) : null}
      </Screen>
    );
  }

  const customSchemeUrl = createInstalledTravelInviteUrl(invite);

  return (
    <Screen contentStyle={styles.webPage} bottomInset={false}>
      <View style={styles.brand}>
        <AppText variant="overline" color="accent">
          onTrack travel
        </AppText>
        <AppText variant="display">You’re invited ✈️</AppText>
        <AppText variant="body" color="secondary">
          Open the trip in onTrack to add its dates and full itinerary to your calendar.
        </AppText>
      </View>

      <Card style={styles.inviteCard}>
        {resolving ? (
          <AppText variant="body" color="secondary">
            Loading your invitation…
          </AppText>
        ) : decoded ? (
          <>
            <AppText variant="heading">{decoded.title}</AppText>
            <AppText variant="subheading" color="accent">
              {decoded.destination}
            </AppText>
            <AppText variant="body" color="secondary">
              {decoded.startDate} → {decoded.endDate}
            </AppText>
            <AppText variant="caption" color="secondary">
              {decoded.itinerary.length} itinerary{' '}
              {decoded.itinerary.length === 1 ? 'item' : 'items'}
            </AppText>
          </>
        ) : (
          <ErrorMessage
            message={inviteError ?? 'This invitation is invalid or incomplete.'}
            variant="body"
          />
        )}
      </Card>

      {decoded ? (
        <View style={styles.buttons}>
          <Button
            size="lg"
            icon="arrow.up.forward.app"
            onPress={() => void Linking.openURL(customSchemeUrl)}>
            Open in onTrack
          </Button>
          <Button
            size="lg"
            variant="secondary"
            icon="square.and.arrow.down"
            onPress={() => void Linking.openURL(ONTRACK_APP_STORE_URL)}>
            Download from the App Store
          </Button>
        </View>
      ) : null}
      <AppText variant="caption" color="secondary" align="center">
        New here? Install onTrack, return to this invitation, then tap Open in onTrack. The invite
        stays in this link.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  webPage: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    justifyContent: 'center',
    minHeight: '100%',
    gap: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  brand: { gap: spacing.sm },
  inviteCard: { gap: spacing.sm },
  buttons: { gap: spacing.md },
});
