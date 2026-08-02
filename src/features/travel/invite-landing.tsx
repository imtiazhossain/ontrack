import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, ErrorMessage, Screen, Symbol } from '@/components/primitives';
import { spacing } from '@/design-system';
import { useAuthSession } from '@/features/auth/auth-provider';
import { travelCalendarDrafts } from '@/features/travel/calendar';
import {
  acceptTravelInvite,
  createInstalledTravelInviteUrl,
  findMatchingTravelPlan,
  isShortTravelInvite,
  ONTRACK_APP_STORE_URL,
  resolveTravelInvite,
  travelInviteLocalId,
  travelPlanIdentityKey,
} from '@/features/travel/share';
import { travelOverlineStyle } from '@/features/travel/travel-chrome';
import { TravelSkyBackdrop, TravelSurfaceCard } from '@/features/travel/travel-surface';
import { useAddons } from '@/store/addons';
import { usePreferences } from '@/store/preferences';
import { useSchedule } from '@/store/schedule';
import { useTravel } from '@/store/travel';

export function TravelInviteLanding({ invite }: { invite?: string }) {
  const router = useRouter();
  const { user, continueWithProvider, workingProvider } = useAuthSession();
  const hasOnboarded = usePreferences((state) => state.hasOnboarded);
  const plans = useTravel((state) => state.plans);
  const savePlan = useTravel((state) => state.savePlan);
  const replaceTravelActivities = useSchedule((state) => state.replaceTravelActivities);
  const setAddonEnabled = useAddons((state) => state.setEnabled);
  const handledInvite = useRef<string | undefined>(undefined);
  const isShortInvite = Boolean(invite && isShortTravelInvite(invite));
  const [remoteResult, setRemoteResult] = useState<{
    invite: string;
    plan?: Awaited<ReturnType<typeof resolveTravelInvite>>;
    error?: string;
  }>();
  const currentRemoteResult = remoteResult?.invite === invite ? remoteResult : undefined;
  const remoteDecoded = currentRemoteResult?.plan;
  const inviteError = currentRemoteResult?.error;
  const decoded = remoteDecoded;
  const existingPlan = useMemo(() => {
    if (!decoded) return undefined;
    // Short invites are unique per code / trip_id on the server. Prefer those
    // keys so two different Paris trips with the same dates cannot merge.
    if (isShortInvite && invite) {
      const code = invite.slice(2);
      return (
        plans.find((plan) => plan.chatAccessCode === code) ??
        plans.find((plan) => plan.id === travelInviteLocalId(code))
      );
    }
    return findMatchingTravelPlan(plans, decoded);
  }, [decoded, invite, isShortInvite, plans]);
  const isWeb = process.env.EXPO_OS === 'web';
  const resolving = !isWeb && Boolean(user) && isShortInvite && !decoded && !inviteError;
  const nativeError =
    !invite
      ? 'This travel invitation is invalid or incomplete.'
      : inviteError ??
        (!resolving && !decoded ? 'This travel invitation is invalid or expired.' : undefined);

  useEffect(() => {
    // The hosted page does not share the installed app's authenticated
    // session. Keep the invite private there and hand the capability to the
    // installed app, where it can be resolved for the signed-in recipient.
    if (isWeb || !user || !invite || !isShortInvite) return;

    let active = true;
    void resolveTravelInvite(invite)
      .then((plan) => {
        if (!active) return;
        setRemoteResult(
          plan
            ? { invite, plan }
            : {
                invite,
                error:
                  'This invitation is unavailable for the signed-in account, or it has expired.',
              },
        );
      })
      .catch((error: unknown) => {
        if (!active) return;
        setRemoteResult({
          invite,
          error:
            error instanceof Error
              ? error.message
              : 'This invitation could not be opened.',
        });
      });
    return () => {
      active = false;
    };
  }, [invite, isShortInvite, isWeb, user]);

  useEffect(() => {
    if (isWeb) return;
    if (!invite || !decoded) return;
    if (handledInvite.current === invite) return;
    handledInvite.current = invite;
    void acceptTravelInvite(invite).catch(() => undefined);

    if (existingPlan) {
      if (isShortInvite) {
        savePlan({
          ...existingPlan,
          chatAccessCode: invite.slice(2),
          ...(decoded.hostTripId ? { hostTripId: decoded.hostTripId } : {}),
          updatedAt: new Date().toISOString(),
        });
      }
      setAddonEnabled('travel', true);
      router.replace(
        hasOnboarded
          ? (`/travel/${existingPlan.id}` as never)
          : ({ pathname: '/onboarding', params: { returnTo: '/travel' } } as never),
      );
      return;
    }

    const now = new Date().toISOString();
    const plan = {
      ...decoded,
      id:
        isShortInvite && invite
          ? travelInviteLocalId(invite.slice(2))
          : `trip-invite-${travelPlanIdentityKey(decoded)}`,
      chatAccessCode: isShortInvite ? invite.slice(2) : undefined,
      createdAt: now,
      updatedAt: now,
    };
    savePlan(plan);
    replaceTravelActivities(plan.id, travelCalendarDrafts(plan));
    setAddonEnabled('travel', true);
    router.replace(
      hasOnboarded
        ? (`/travel/${plan.id}` as never)
        : ({ pathname: '/onboarding', params: { returnTo: '/travel' } } as never),
    );
  }, [
    decoded,
    existingPlan,
    hasOnboarded,
    invite,
    isWeb,
    isShortInvite,
    replaceTravelActivities,
    router,
    savePlan,
    setAddonEnabled,
  ]);

  if (!isWeb) {
    if (invite && isShortInvite && !user) {
      const returnTo = `/i/${invite.slice(2)}`;
      return (
        <View style={styles.shell}>
          <TravelSkyBackdrop />
          <Screen style={styles.transparent} contentStyle={styles.center}>
          <Symbol name="airplane" size={44} />
          <AppText variant="display" align="center">You’re Invited</AppText>
          <AppText variant="body" color="secondary" align="center">
            Sign in with the email address that was invited. Your trip invitation will still be
            here when you return.
          </AppText>
          <Button
            disabled={Boolean(workingProvider)}
            onPress={() => void continueWithProvider('apple', returnTo)}>
            {workingProvider === 'apple' ? 'Opening Apple…' : 'Continue with Apple'}
          </Button>
          <Button
            variant="secondary"
            disabled={Boolean(workingProvider)}
            onPress={() => void continueWithProvider('google', returnTo)}>
            {workingProvider === 'google' ? 'Opening Google…' : 'Continue with Google'}
          </Button>
          </Screen>
        </View>
      );
    }

    return (
      <View style={styles.shell}>
        <TravelSkyBackdrop />
        <Screen style={styles.transparent} contentStyle={styles.center}>
          <Symbol name="airplane" size={44} />
          {nativeError ? (
            <ErrorMessage message={nativeError} variant="heading" align="center" />
          ) : (
            <AppText variant="heading" align="center">
              Opening Your Trip…
            </AppText>
          )}
          {nativeError ? (
            <Button onPress={() => router.replace('/' as never)}>Go to onTrack</Button>
          ) : null}
        </Screen>
      </View>
    );
  }

  const customSchemeUrl = createInstalledTravelInviteUrl(invite);

  return (
    <View style={styles.shell}>
      <TravelSkyBackdrop />
      <Screen style={styles.transparent} contentStyle={styles.webPage} bottomInset={false}>
      <View style={styles.brand}>
        <AppText variant="overline" color="accent" style={travelOverlineStyle}>
          onTrack Travel
        </AppText>
        <AppText variant="display">You’re Invited</AppText>
        <AppText variant="body" color="secondary">
          Open the trip in onTrack to add its dates and full itinerary to your calendar.
        </AppText>
      </View>

      <TravelSurfaceCard>
        {isShortInvite ? (
          <AppText variant="body" color="secondary">
            This is a private trip invitation. Open it in onTrack and sign in with the invited
            email address to view the details.
          </AppText>
        ) : (
          <ErrorMessage
            message="This invitation is invalid or incomplete."
            variant="body"
          />
        )}
      </TravelSurfaceCard>

      {isShortInvite ? (
        <View style={styles.buttons}>
          <Button
            size="lg"
            icon="open-external"
            onPress={() => void Linking.openURL(customSchemeUrl)}>
            Open in onTrack
          </Button>
          <Button
            size="lg"
            variant="secondary"
            icon="download"
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
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  transparent: { backgroundColor: 'transparent' },
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
