import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  ErrorMessage,
  LoadingBlock,
  Screen,
  Symbol,
} from '@/components/primitives';
import { spacing } from '@/design-system';
import { useAuthSession } from '@/features/auth/auth-provider';
import { travelCalendarDrafts } from '@/features/travel/calendar';
import {
  createInstalledTravelOpenJoinUrl,
  isOpenTravelJoinCode,
  loadTravelOpenJoinStatus,
  ONTRACK_APP_STORE_URL,
  previewTravelOpenJoin,
  requestTravelOpenJoin,
  resolveTravelOpenJoin,
  travelInviteLocalId,
} from '@/features/travel/share';
import { travelOverlineStyle } from '@/features/travel/travel-chrome';
import type { TravelOpenJoinPreview, TravelOpenJoinStatus } from '@/features/travel/types';
import { FeatureThemeProvider } from '@/hooks/use-theme';
import { useAddons } from '@/store/addons';
import { usePreferences } from '@/store/preferences';
import { useSchedule } from '@/store/schedule';
import { useTravel } from '@/store/travel';
import { formatDateLong } from '@/utils/date';

export function TravelOpenJoinLanding({ code }: { code?: string }) {
  return (
    <FeatureThemeProvider feature="travel">
      <TravelOpenJoinLandingContent code={code} />
    </FeatureThemeProvider>
  );
}

function TravelOpenJoinLandingContent({ code }: { code?: string }) {
  const router = useRouter();
  const { user, continueWithProvider, workingProvider } = useAuthSession();
  const hasOnboarded = usePreferences((state) => state.hasOnboarded);
  const plans = useTravel((state) => state.plans);
  const savePlan = useTravel((state) => state.savePlan);
  const replaceTravelActivities = useSchedule((state) => state.replaceTravelActivities);
  const setAddonEnabled = useAddons((state) => state.setEnabled);
  const isWeb = process.env.EXPO_OS === 'web';
  const validCode = Boolean(code && isOpenTravelJoinCode(code));
  const [preview, setPreview] = useState<TravelOpenJoinPreview>();
  const [previewError, setPreviewError] = useState<string>();
  const [status, setStatus] = useState<TravelOpenJoinStatus>();
  const [grantedInviteCode, setGrantedInviteCode] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(validCode);
  const openedApproved = useRef(false);

  useEffect(() => {
    if (!validCode || !code) {
      setLoadingPreview(false);
      setPreviewError('This join link is invalid or incomplete.');
      return;
    }
    let active = true;
    setLoadingPreview(true);
    void previewTravelOpenJoin(code)
      .then((result) => {
        if (!active) return;
        if (!result) {
          setPreview(undefined);
          setPreviewError('This join link is invalid or has expired.');
          return;
        }
        setPreview(result);
        setPreviewError(undefined);
      })
      .catch(() => {
        if (!active) return;
        setPreviewError('This join link could not be opened.');
      })
      .finally(() => {
        if (active) setLoadingPreview(false);
      });
    return () => {
      active = false;
    };
  }, [code, validCode]);

  const refreshStatus = useCallback(async () => {
    if (!code || !user || !validCode) return;
    const result = await loadTravelOpenJoinStatus(code);
    if (!result) {
      setStatus(undefined);
      return;
    }
    setStatus(result.status);
    setGrantedInviteCode(result.grantedInviteCode);
  }, [code, user, validCode]);

  useEffect(() => {
    if (isWeb || !user || !validCode) return;
    let active = true;
    void refreshStatus().catch((error: unknown) => {
      if (!active) return;
      setActionError(
        error instanceof Error ? error.message : 'Join status could not be loaded.',
      );
    });
    return () => {
      active = false;
    };
  }, [isWeb, refreshStatus, user, validCode]);

  useEffect(() => {
    if (isWeb || !user || status !== 'pending' || !code) return;
    const timer = setInterval(() => {
      void refreshStatus().catch(() => undefined);
    }, 4000);
    return () => clearInterval(timer);
  }, [code, isWeb, refreshStatus, status, user]);

  const openApprovedTrip = useCallback(async () => {
    if (!code || openedApproved.current) return;
    openedApproved.current = true;
    setBusy(true);
    setActionError(undefined);
    try {
      const resolved = await resolveTravelOpenJoin(code);
      const chatCode = resolved.grantedInviteCode ?? grantedInviteCode;
      const existing =
        (chatCode
          ? plans.find((plan) => plan.chatAccessCode === chatCode) ??
            plans.find((plan) => plan.id === travelInviteLocalId(chatCode))
          : undefined) ??
        plans.find((plan) => plan.id === travelInviteLocalId(code)) ??
        plans.find((plan) => plan.id === resolved.tripId);

      if (existing) {
        savePlan({
          ...existing,
          ...(chatCode ? { chatAccessCode: chatCode } : {}),
          openJoinCode: code,
          updatedAt: new Date().toISOString(),
        });
        setAddonEnabled('travel', true);
        router.replace(
          hasOnboarded
            ? (`/travel/${existing.id}` as never)
            : ({ pathname: '/onboarding', params: { returnTo: '/travel' } } as never),
        );
        return;
      }

      const now = new Date().toISOString();
      const planId = chatCode
        ? travelInviteLocalId(chatCode)
        : travelInviteLocalId(code);
      const plan = {
        ...resolved.plan,
        id: planId,
        ...(chatCode ? { chatAccessCode: chatCode } : {}),
        openJoinCode: code,
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
    } catch (error) {
      openedApproved.current = false;
      setActionError(
        error instanceof Error
          ? error.message
          : 'The trip host has not approved your join request yet.',
      );
    } finally {
      setBusy(false);
    }
  }, [
    code,
    grantedInviteCode,
    hasOnboarded,
    plans,
    replaceTravelActivities,
    router,
    savePlan,
    setAddonEnabled,
  ]);

  useEffect(() => {
    if (isWeb || !user) return;
    if (status === 'approved' || status === 'host') {
      void openApprovedTrip();
    }
  }, [isWeb, openApprovedTrip, status, user]);

  const sendJoinRequest = async () => {
    if (!code) return;
    setBusy(true);
    setActionError(undefined);
    try {
      const result = await requestTravelOpenJoin(code);
      setStatus(result.status);
      setGrantedInviteCode(result.grantedInviteCode);
      if (result.status === 'approved' || result.status === 'host') {
        await openApprovedTrip();
      }
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Your join request could not be sent.',
      );
    } finally {
      setBusy(false);
    }
  };

  if (isWeb) {
    const customSchemeUrl = code ? createInstalledTravelOpenJoinUrl(code) : 'ontrack:///travel';
    return (
      <Screen contentStyle={styles.webPage} bottomInset={false}>
        <View style={styles.brand}>
          <AppText variant="overline" color="accent" style={travelOverlineStyle}>
            onTrack Travel
          </AppText>
          <AppText variant="display">Join This Trip ✈️</AppText>
          <AppText variant="body" color="secondary">
            Anyone with this link can request to join. The trip host approves each new friend.
          </AppText>
        </View>

        <Card style={styles.inviteCard}>
          {loadingPreview ? (
            <LoadingBlock label="Loading trip…" />
          ) : previewError ? (
            <ErrorMessage message={previewError} variant="body" />
          ) : preview ? (
            <>
              <AppText variant="title">{preview.title}</AppText>
              <AppText variant="body" color="secondary">
                {preview.destination}
              </AppText>
              <AppText variant="callout" color="secondary">
                {formatDateLong(preview.startDate)} – {formatDateLong(preview.endDate)}
              </AppText>
              <AppText variant="caption" color="tertiary">
                Open in onTrack to request access. If you don’t have the app yet, download it first.
              </AppText>
            </>
          ) : (
            <ErrorMessage message="This join link is invalid or incomplete." variant="body" />
          )}
        </Card>

        {validCode && !previewError ? (
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
          New here? Install onTrack, return to this link, then tap Open in onTrack. The host still
          needs to approve your request.
        </AppText>
      </Screen>
    );
  }

  if (!user) {
    const returnTo = code ? `/j/${code}` : '/travel';
    return (
      <Screen contentStyle={styles.center}>
        <Symbol name="airplane" size={44} />
        <AppText variant="display" align="center">
          Join This Trip ✈️
        </AppText>
        {preview ? (
          <AppText variant="body" color="secondary" align="center">
            {preview.title} · {preview.destination}
          </AppText>
        ) : null}
        <AppText variant="body" color="secondary" align="center">
          Sign in to request to join. The trip host will approve new friends before you can open the
          itinerary.
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
    );
  }

  if (loadingPreview && !preview) {
    return (
      <Screen contentStyle={styles.center}>
        <LoadingBlock label="Loading trip…" />
      </Screen>
    );
  }

  if (previewError) {
    return (
      <Screen contentStyle={styles.center}>
        <Symbol name="airplane" size={44} />
        <ErrorMessage message={previewError} variant="heading" align="center" />
        <Button onPress={() => router.replace('/' as never)}>Go to onTrack</Button>
      </Screen>
    );
  }

  if (status === 'approved' || status === 'host') {
    return (
      <Screen contentStyle={styles.center}>
        <Symbol name="airplane" size={44} />
        <AppText variant="heading" align="center">
          Opening your trip…
        </AppText>
        {actionError ? <ErrorMessage message={actionError} align="center" /> : null}
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.center}>
      <Symbol name="airplane" size={44} />
      <AppText variant="display" align="center">
        Join This Trip ✈️
      </AppText>
      {preview ? (
        <View style={styles.previewBlock}>
          <AppText variant="title" align="center">
            {preview.title}
          </AppText>
          <AppText variant="body" color="secondary" align="center">
            {preview.destination}
          </AppText>
          <AppText variant="callout" color="secondary" align="center">
            {formatDateLong(preview.startDate)} – {formatDateLong(preview.endDate)}
          </AppText>
        </View>
      ) : null}

      {status === 'pending' ? (
        <>
          <AppText variant="body" color="secondary" align="center">
            Request sent. Waiting for the trip host to approve you.
          </AppText>
          <Button variant="secondary" disabled={busy} onPress={() => void refreshStatus()}>
            Check Again
          </Button>
        </>
      ) : status === 'rejected' ? (
        <>
          <ErrorMessage
            message="The trip host declined this join request."
            variant="body"
            align="center"
          />
          <Button onPress={() => router.replace('/' as never)}>Go to onTrack</Button>
        </>
      ) : (
        <>
          <AppText variant="body" color="secondary" align="center">
            Request to join. The host approves each new friend before the itinerary opens.
          </AppText>
          <Button disabled={busy} onPress={() => void sendJoinRequest()}>
            {busy ? 'Sending…' : 'Request to Join'}
          </Button>
        </>
      )}
      {actionError ? <ErrorMessage message={actionError} align="center" /> : null}
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
  previewBlock: { gap: spacing.xs, alignItems: 'center' },
});
