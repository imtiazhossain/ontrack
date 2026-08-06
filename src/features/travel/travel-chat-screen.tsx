import { FlashList } from '@shopify/flash-list';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
    Keyboard,
    Platform,
    StyleSheet,
    View,
    type KeyboardEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
    AppText,
    Button,
    EmptyState,
    ErrorMessage,
    IconButton,
    Input,
    LoadingBlock,
} from '@/components/primitives';
import { ALL_ACCOUNTS_TEST_TRIP } from '@/constants/travel';
import { layout, radii, spacing } from '@/design-system';
import { useAuthSession } from '@/features/auth/auth-provider';
import {
    buildTravelChatListItems,
    chatNotificationsAreEnabled,
    enableTravelChatNotifications,
    getTravelChatDeviceId,
    loadTravelChatMessages,
    sendTravelChatMessage,
    travelChatAccessCode,
    type TravelChatListItem,
    type TravelChatMessage,
} from '@/features/travel/chat';
import {
    TravelChatDateSeparator,
    TravelChatDestinationStamp,
    TravelChatLandscape,
    TravelChatMemberStack,
    travelChatPalette,
    type TravelChatMember,
} from '@/features/travel/travel-chat-chrome';
import { resolveTravelCoTravelerPeople } from '@/features/travel/travel-cotraveler-people';
import {
    listMyTravelChatAccess,
    matchTravelChatAccessCapability,
    planPatchFromTravelChatCapability,
    planPatchFromTravelChatRoster,
    resolveTravelChatAccessFromRoster,
    resolveTravelChatMembersFromRoster,
} from '@/features/travel/travel-chat-roster';
import { TravelSheetHeader } from '@/features/travel/travel-sheet';
import { useTravelPageStyle } from '@/features/travel/travel-surface';
import {
    canonicalTravelTripId,
    listTravelTripRoster,
} from '@/features/travel/trip-roster';
import type { TravelTripRosterPerson } from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/store/preferences';
import { useTravel } from '@/store/travel';
import { AgentUiIds } from '@/utils/agent-ui';
import { newId } from '@/utils/id';
import { goBackOrReplace } from '@/utils/navigation';

type OptimisticTravelChatMessage = TravelChatMessage & { pending?: boolean };

export function TravelChatScreen({ planId }: { planId: string }) {
  const theme = useTheme();
  const travelStyle = useTravelPageStyle(theme);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { layout: responsiveLayout, spacing: rs, s } = useResponsive();
  const palette = travelChatPalette(theme);
  const listRef =
    useRef<ComponentRef<typeof FlashList<TravelChatListItem>>>(null);
  const plan = useTravel((state) => state.plans.find((item) => item.id === planId));
  const savePlan = useTravel((state) => state.savePlan);
  const { user } = useAuthSession();
  const senderName = usePreferences((state) => state.name).trim() || 'Trip member';
  const localAccessCode = plan ? travelChatAccessCode(plan) : undefined;
  const [roster, setRoster] = useState<TravelTripRosterPerson[]>([]);
  const [rosterAccessCode, setRosterAccessCode] = useState<string>();
  const [rosterReady, setRosterReady] = useState(false);
  const accessCode = localAccessCode ?? rosterAccessCode;
  const [deviceId, setDeviceId] = useState('');
  const [messages, setMessages] = useState<OptimisticTravelChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(Boolean(localAccessCode));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const closeChat = () => {
    const fallback: Href = planId
      ? { pathname: '/travel/[id]', params: { id: planId } }
      : ('/(tabs)/travel' as Href);
    goBackOrReplace(router, fallback);
  };
  const [notificationsAvailable, setNotificationsAvailable] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [enablingNotifications, setEnablingNotifications] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const listItems = buildTravelChatListItems(messages);
  const canonicalTripId = plan ? canonicalTravelTripId(plan) : undefined;

  const fallbackMembers = useMemo<TravelChatMember[]>(() => {
    if (!plan) return [];
    return resolveTravelCoTravelerPeople(plan, senderName).map((person) => ({
      id: person.id,
      name: person.name,
      isSelf: person.isSelf,
      userId: person.userId,
    }));
  }, [plan, senderName]);

  const members = useMemo(
    () =>
      resolveTravelChatMembersFromRoster({
        roster,
        selfUserId: user?.id,
        selfDisplayName: senderName,
        fallback: fallbackMembers,
      }),
    [fallbackMembers, roster, senderName, user?.id],
  );

  const memberSubtitle = useMemo(() => {
    if (!plan) return 'Plan Together · Stay Connected';
    if (plan.id === ALL_ACCOUNTS_TEST_TRIP.id) return 'Shared Test Chat · Plan Together';
    const count = Math.max(members.length, plan.participants.length + 1);
    return `${count} ${count === 1 ? 'Trip Member' : 'Trip Members'} · Plan Together`;
  }, [members.length, plan]);

  const refresh = useCallback(async () => {
    if (!accessCode) return;
    try {
      const next = await loadTravelChatMessages(accessCode);
      setMessages((current) => [
        ...next,
        ...current.filter(
          (message) =>
            message.pending &&
            !next.some((remote) => remote.id === message.id),
        ),
      ]);
      setError(undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Messages could not be loaded.');
    }
  }, [accessCode]);

  useEffect(() => {
    if (!planId || !canonicalTripId) {
      setRoster([]);
      setRosterAccessCode(undefined);
      setRosterReady(true);
      return;
    }

    let active = true;
    setRosterReady(false);

    const recoverChat = async () => {
      const latest = useTravel.getState().plans.find((item) => item.id === planId);
      if (!latest || !active) return;

      let working = latest;
      let people: TravelTripRosterPerson[] = [];
      try {
        people = await listTravelTripRoster(canonicalTravelTripId(working));
      } catch {
        people = [];
      }
      if (!active) return;

      // Always scan memberships. First-trip forks can look like a local host
      // roster (unlocking the wrong trip’s chat) while the real shared trip is
      // the one where this account is an accepted member.
      const capabilities = await listMyTravelChatAccess();
      if (!active) return;
      const matched = matchTravelChatAccessCapability(working, capabilities);
      let recovered =
        matched?.role === 'member'
          ? matched.accessCode
          : resolveTravelChatAccessFromRoster({
              plan: working,
              roster: people,
              selfUserId: user?.id,
            });

      if (matched && (matched.role === 'member' || !recovered)) {
        recovered = matched.accessCode;
        const remapped = planPatchFromTravelChatCapability({
          plan: working,
          capability: matched,
        });
        if (remapped) {
          working = remapped;
          savePlan(remapped);
        }
        if (matched.tripId !== canonicalTravelTripId(latest)) {
          try {
            people = await listTravelTripRoster(matched.tripId);
          } catch {
            // Keep prior roster (may be empty).
          }
        }
      }

      if (!recovered) {
        recovered = resolveTravelChatAccessFromRoster({
          plan: working,
          roster: people,
          selfUserId: user?.id,
        });
      }

      if (!active) return;
      setRoster(people);
      setRosterAccessCode(recovered);
      const patched = planPatchFromTravelChatRoster({
        plan: working,
        roster: people,
        selfUserId: user?.id,
        accessCode: recovered,
      });
      if (patched) savePlan(patched);
    };

    void recoverChat()
      .catch(() => {
        if (!active) return;
        setRoster([]);
        setRosterAccessCode(undefined);
      })
      .finally(() => {
        if (active) setRosterReady(true);
      });

    return () => {
      active = false;
    };
  }, [canonicalTripId, planId, savePlan, user?.id]);

  useEffect(() => {
    let active = true;
    void getTravelChatDeviceId().then((value) => {
      if (active) setDeviceId(value);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!accessCode) {
      if (rosterReady) setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    void refresh().then(() => {
      if (active) setLoading(false);
    });
    const timer = setInterval(() => void refresh(), 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [accessCode, refresh, rosterReady]);

  useEffect(() => {
    if (!accessCode || !deviceId) return;
    let active = true;
    void chatNotificationsAreEnabled()
      .then(async (enabled) => {
        if (!enabled) return false;
        await enableTravelChatNotifications(accessCode, deviceId);
        return true;
      })
      .then((enabled) => {
        if (active) setNotificationsEnabled(enabled);
      })
      .catch((reason: unknown) => {
        if (
          active &&
          reason instanceof Error &&
          reason.message.startsWith('Push alerts are unavailable')
        ) {
          setNotificationsAvailable(false);
        }
      });
    return () => {
      active = false;
    };
  }, [accessCode, deviceId]);

  useEffect(() => {
    if (listItems.length === 0) return;
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(timer);
  }, [listItems.length]);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const updateInset = (event: KeyboardEvent) => {
      Keyboard.scheduleLayoutAnimation(event);
      setKeyboardInset(
        Math.max(0, event.endCoordinates.height - insets.bottom),
      );
    };
    const showSubscription = Keyboard.addListener(showEvent, updateInset);
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [insets.bottom]);

  const send = async () => {
    if (!accessCode || !deviceId || !draft.trim() || sending) return;
    const body = draft.trim();
    const optimisticId = newId('chat-pending');
    const optimisticMessage: OptimisticTravelChatMessage = {
      id: optimisticId,
      senderName,
      senderDeviceId: deviceId,
      body,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((current) => [...current, optimisticMessage]);
    setDraft('');
    setSending(true);
    setError(undefined);
    try {
      const message = await sendTravelChatMessage({
        accessCode,
        senderName,
        senderDeviceId: deviceId,
        body,
      });
      setMessages((current) => {
        const withoutOptimistic = current.filter((item) => item.id !== optimisticId);
        return withoutOptimistic.some((item) => item.id === message.id)
          ? withoutOptimistic
          : [...withoutOptimistic, message];
      });
    } catch (reason) {
      setMessages((current) => current.filter((item) => item.id !== optimisticId));
      setDraft((current) => current || body);
      const detail =
        reason instanceof Error ? reason.message : 'Your message could not be sent.';
      setError(`Message not sent. Your draft was restored. ${detail}`);
    } finally {
      setSending(false);
    }
  };

  const enableNotifications = async () => {
    if (!accessCode || !deviceId || enablingNotifications) return;
    setEnablingNotifications(true);
    setError(undefined);
    try {
      await enableTravelChatNotifications(accessCode, deviceId);
      setNotificationsEnabled(true);
    } catch (reason) {
      if (
        reason instanceof Error &&
        reason.message.startsWith('Push alerts are unavailable')
      ) {
        setNotificationsAvailable(false);
      } else {
        setError(
          reason instanceof Error
            ? reason.message
            : 'Notifications could not be enabled.',
        );
      }
    } finally {
      setEnablingNotifications(false);
    }
  };

  const composerBottomPad = Math.max(insets.bottom, spacing.sm);
  const sendSize = Math.max(44, s(44));

  if (!plan) {
    return (
      <View
        style={[
          styles.fill,
          travelStyle,
          { paddingHorizontal: responsiveLayout.screenPadding },
        ]}>
        <TravelSheetHeader
          eyebrow="Group Chat"
          title="Travel"
          subtitle="Plan Together · Stay Connected"
          closeAccessibilityLabel="Close Group Chat"
          closeTestID={AgentUiIds.travel.chat.close}
          paddingTop={rs.sm}
          onClose={closeChat}
        />
        <EmptyState icon="chat" title="Trip Not Found" message="This trip is no longer available." />
      </View>
    );
  }

  if (!accessCode) {
    const waitingOnRoster = !rosterReady;
    const signedInElsewhere =
      rosterReady &&
      Boolean(user?.id) &&
      roster.length > 0 &&
      !roster.some((person) => person.userId === user?.id);
    return (
      <View
        style={[
          styles.fill,
          travelStyle,
        ]}>
        <TravelChatLandscape color={palette.mountainColor} />
        <View style={{ paddingHorizontal: responsiveLayout.screenPadding, zIndex: 1 }}>
          <TravelSheetHeader
            eyebrow="Group Chat"
            title={plan.title}
            subtitle={memberSubtitle}
            closeAccessibilityLabel="Close Group Chat"
            closeTestID={AgentUiIds.travel.chat.close}
            paddingTop={rs.sm}
            onClose={closeChat}
          />
          <TravelChatMemberStack members={members} />
        </View>
        <View style={[styles.center, { zIndex: 1 }]}>
          {waitingOnRoster ? (
            <LoadingBlock label="Opening shared chat…" />
          ) : (
            <EmptyState
              icon="people"
              title={
                signedInElsewhere
                  ? 'Sign In With the Account That Joined'
                  : 'Couldn’t Open Shared Chat'
              }
              message={
                signedInElsewhere
                  ? 'This trip is linked to a different onTrack account on this device. Sign in with the account that accepted the invite, or open the join link again.'
                  : 'Force-quit onTrack and reopen to install the latest update, then open Group Chat again. If it still fails, open the host’s join link while signed in.'
              }
            />
          )}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.fill,
        travelStyle,
      ]}>
      <TravelChatLandscape color={palette.mountainColor} />
      <TravelChatDestinationStamp
        title={plan.title}
        destination={plan.destination}
        color={palette.stamp}
      />

      <View style={{ paddingHorizontal: responsiveLayout.screenPadding, zIndex: 1 }}>
        <TravelSheetHeader
          eyebrow="Group Chat"
          title={plan.title}
          subtitle={memberSubtitle}
          closeAccessibilityLabel="Close Group Chat"
          closeTestID={AgentUiIds.travel.chat.close}
          paddingTop={rs.sm}
          onClose={closeChat}
        />
        <View style={{ marginTop: -rs.md, marginBottom: rs.md }}>
          <TravelChatMemberStack members={members} />
        </View>
      </View>

      {notificationsAvailable && !notificationsEnabled ? (
        <View
          style={[
            styles.notificationBanner,
            {
              backgroundColor: palette.bubbleTheirs,
              borderColor: palette.bubbleBorder,
              marginHorizontal: responsiveLayout.screenPadding,
              marginBottom: rs.sm,
              zIndex: 1,
            },
          ]}>
          <View style={styles.bannerCopy}>
            <AppText variant="callout" color="accent" fit>
              Get New-Message Alerts
            </AppText>
            <AppText variant="caption" color="secondary" fit>
              Stay in the Loop When the App Is Closed.
            </AppText>
          </View>
          <Button
            testID={AgentUiIds.travel.chat.enableNotifications}
            loading={enablingNotifications}
            disabled={!deviceId}
            onPress={() => void enableNotifications()}>
            Turn On
          </Button>
        </View>
      ) : null}

      {error ? (
        <View style={[styles.error, { zIndex: 1 }]}>
          <ErrorMessage message={error} selectable />
        </View>
      ) : null}

      {loading ? (
        <View style={[styles.center, { zIndex: 1 }]}>
          <LoadingBlock label="Loading messages…" />
        </View>
      ) : (
        <FlashList<TravelChatListItem>
          ref={listRef}
          data={listItems}
          keyExtractor={(item) => item.id}
          getItemType={(item) => item.type}
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={[
            styles.messages,
            listItems.length === 0 ? styles.emptyMessages : undefined,
            { paddingBottom: rs.xl, flexGrow: 1 },
          ]}
          style={styles.list}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              icon="chat"
              title="Start the Conversation"
              message="Share ideas, arrival plans, reservations, and anything the group should know."
            />
          }
          renderItem={({ item }) => {
            if (item.type === 'date') {
              return <TravelChatDateSeparator label={item.label} />;
            }

            const message = item.message as OptimisticTravelChatMessage;
            const mine = message.senderDeviceId === deviceId;
            return (
              <View style={[styles.messageRow, mine ? styles.myMessageRow : undefined]}>
                {!mine ? (
                  <AppText
                    variant="caption"
                    style={[
                      styles.sender,
                      {
                        color: palette.senderName,
                        fontSize: Math.max(12, s(13)),
                      },
                    ]}>
                    {message.senderName}
                  </AppText>
                ) : null}
                <View
                  style={[
                    styles.bubble,
                    message.pending ? styles.pendingBubble : undefined,
                    {
                      backgroundColor: mine ? palette.bubbleMine : palette.bubbleTheirs,
                      borderColor: palette.bubbleBorder,
                      borderRadius: radii.pill,
                      boxShadow: palette.bubbleShadow,
                      paddingHorizontal: Math.max(rs.lg, s(18)),
                      paddingVertical: Math.max(rs.md, s(12)),
                    },
                  ]}>
                  <AppText
                    selectable
                    style={{
                      color: palette.senderName,
                      fontSize: Math.max(16, s(17)),
                      lineHeight: Math.max(22, s(24)),
                    }}>
                    {message.body}
                  </AppText>
                </View>
                <AppText
                  variant="caption"
                  style={[
                    mine ? styles.myTimestamp : undefined,
                    {
                      color: palette.timestamp,
                      fontSize: Math.max(11, s(12)),
                      marginTop: rs.xs,
                      paddingHorizontal: spacing.sm,
                    },
                  ]}>
                  {message.pending
                    ? 'Sending…'
                    : new Intl.DateTimeFormat(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                      }).format(new Date(message.createdAt))}
                </AppText>
              </View>
            );
          }}
        />
      )}

      <View
        style={[
          styles.composerArea,
          {
            paddingBottom: composerBottomPad,
            marginBottom: keyboardInset,
            paddingHorizontal: responsiveLayout.screenPadding,
            zIndex: 2,
          },
        ]}>
        <View
          style={[
            styles.composerDock,
            {
              minHeight: Math.max(56, s(58)),
              padding: rs.xs,
              gap: rs.xs,
              backgroundColor: theme.backgroundElevated,
              borderColor: theme.separator,
            },
          ]}>
          <Input
            testID={AgentUiIds.travel.chat.composer}
            value={draft}
            onChangeText={setDraft}
            placeholder="Message the Trip…"
            multiline
            maxLength={2000}
            accessibilityLabel="Trip Message"
            containerStyle={styles.composerInput}
            fieldBackground="transparent"
            style={[styles.input, { paddingVertical: rs.sm }]}
          />
          <IconButton
            icon="arrow-up"
            accessibilityLabel="Send message"
            testID={AgentUiIds.travel.chat.send}
            loading={sending}
            disabled={!draft.trim() || !deviceId}
            color={theme.textOnAccent}
            background={theme.accentPrimary}
            size={sendSize}
            onPress={() => void send()}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: layout.screenPadding,
  },
  notificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    boxShadow: '0 3px 12px rgba(51, 39, 28, 0.10)',
  },
  bannerCopy: { flex: 1, gap: spacing.xxs, minWidth: 0, flexShrink: 1 },
  error: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.sm },
  list: { flex: 1, zIndex: 1 },
  messages: { flexGrow: 1, gap: spacing.md, padding: layout.screenPadding },
  emptyMessages: { justifyContent: 'center' },
  messageRow: { alignItems: 'flex-start', maxWidth: '84%' },
  myMessageRow: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  sender: { paddingHorizontal: spacing.sm, paddingBottom: spacing.xs },
  bubble: {
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  pendingBubble: { opacity: 0.66 },
  myTimestamp: { textAlign: 'right' },
  composerArea: {
    paddingTop: spacing.sm,
  },
  composerDock: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.pill,
    borderCurve: 'continuous',
    boxShadow: '0 4px 18px rgba(17, 74, 110, 0.16)',
  },
  composerInput: {
    flex: 1,
    minWidth: 0,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    maxHeight: 112,
  },
});
