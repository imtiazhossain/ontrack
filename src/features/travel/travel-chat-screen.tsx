import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppText,
  BackButton,
  Button,
  EmptyState,
  ErrorMessage,
  IconButton,
} from '@/components/primitives';
import { layout, radii, spacing, typography } from '@/design-system';
import {
  chatNotificationsAreEnabled,
  enableTravelChatNotifications,
  getTravelChatDeviceId,
  loadTravelChatMessages,
  sendTravelChatMessage,
  travelChatAccessCode,
  type TravelChatMessage,
} from '@/features/travel/chat';
import { FeatureThemeProvider, useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/store/preferences';
import { useTravel } from '@/store/travel';

export function TravelChatScreen({ planId }: { planId: string }) {
  return (
    <FeatureThemeProvider feature="travel">
      <TravelChatScreenContent planId={planId} />
    </FeatureThemeProvider>
  );
}

function TravelChatScreenContent({ planId }: { planId: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<TravelChatMessage>>(null);
  const plan = useTravel((state) => state.plans.find((item) => item.id === planId));
  const senderName = usePreferences((state) => state.name).trim() || 'Trip member';
  const accessCode = plan ? travelChatAccessCode(plan) : undefined;
  const [deviceId, setDeviceId] = useState('');
  const [messages, setMessages] = useState<TravelChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(Boolean(accessCode));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [enablingNotifications, setEnablingNotifications] = useState(false);

  const refresh = useCallback(async () => {
    if (!accessCode) return;
    try {
      const next = await loadTravelChatMessages(accessCode);
      setMessages(next);
      setError(undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Messages could not be loaded.');
    }
  }, [accessCode]);

  useEffect(() => {
    let active = true;
    void getTravelChatDeviceId().then((value) => {
      if (active) setDeviceId(value);
    });
    const initialTimer = setTimeout(() => {
      void refresh().then(() => {
        if (active) setLoading(false);
      });
    }, 0);
    const timer = setInterval(() => void refresh(), 5000);
    return () => {
      active = false;
      clearTimeout(initialTimer);
      clearInterval(timer);
    };
  }, [refresh]);

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
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [accessCode, deviceId]);

  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(timer);
  }, [messages.length]);

  const send = async () => {
    if (!accessCode || !deviceId || !draft.trim() || sending) return;
    setSending(true);
    setError(undefined);
    try {
      const message = await sendTravelChatMessage({
        accessCode,
        senderName,
        senderDeviceId: deviceId,
        body: draft,
      });
      setMessages((current) =>
        current.some((item) => item.id === message.id) ? current : [...current, message],
      );
      setDraft('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Your message could not be sent.');
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
      setError(reason instanceof Error ? reason.message : 'Notifications could not be enabled.');
    } finally {
      setEnablingNotifications(false);
    }
  };

  if (!plan) {
    return (
      <View style={[styles.fill, { backgroundColor: theme.backgroundPrimary }]}>
        <View style={styles.paddedHeader}><BackButton /></View>
        <EmptyState icon="message" title="Trip not found" message="This trip is no longer available." />
      </View>
    );
  }

  if (!accessCode) {
    return (
      <View style={[styles.fill, { backgroundColor: theme.backgroundPrimary }]}>
        <View style={styles.paddedHeader}>
          <BackButton />
          <AppText variant="title">Trip chat</AppText>
        </View>
        <View style={styles.center}>
          <EmptyState
            icon="person.2.fill"
            title="Chat opens when a friend joins"
            message="Invite someone to this trip. Once they accept, everyone can start planning here."
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined}
      style={[styles.fill, { backgroundColor: theme.backgroundPrimary }]}>
      <View style={[styles.header, { borderBottomColor: theme.separator }]}>
        <BackButton accessibilityLabel="Back to trip" />
        <View style={styles.headerCopy}>
          <AppText variant="heading" numberOfLines={1}>{plan.title}</AppText>
          <AppText variant="caption" color="secondary">
            {plan.participants.length + 1} trip members
          </AppText>
        </View>
      </View>

      {!notificationsEnabled ? (
        <View style={[styles.notificationBanner, { backgroundColor: theme.accentFaint }]}>
          <View style={styles.bannerCopy}>
            <AppText variant="callout" color="accent">Get new-message alerts</AppText>
            <AppText variant="caption" color="secondary">Stay in the loop when the app is closed.</AppText>
          </View>
          <Button
            disabled={enablingNotifications || !deviceId}
            onPress={() => void enableNotifications()}>
            {enablingNotifications ? 'Turning on…' : 'Turn on'}
          </Button>
        </View>
      ) : null}

      {error ? (
        <View style={styles.error}>
          <ErrorMessage message={error} selectable />
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.accentPrimary} />
          <AppText variant="body" color="secondary">Loading messages…</AppText>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={[
            styles.messages,
            messages.length === 0 ? styles.emptyMessages : undefined,
          ]}
          keyboardDismissMode={process.env.EXPO_OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              icon="message.fill"
              title="Start the conversation"
              message="Share ideas, arrival plans, reservations, and anything the group should know."
            />
          }
          renderItem={({ item }) => {
            const mine = item.senderDeviceId === deviceId;
            return (
              <View style={[styles.messageRow, mine ? styles.myMessageRow : undefined]}>
                {!mine ? (
                  <AppText variant="caption" color="secondary" style={styles.sender}>
                    {item.senderName}
                  </AppText>
                ) : null}
                <View
                  style={[
                    styles.bubble,
                    {
                      backgroundColor: mine ? theme.accentPrimary : theme.backgroundSunken,
                    },
                  ]}>
                  <AppText selectable color={mine ? 'onAccent' : 'primary'}>
                    {item.body}
                  </AppText>
                </View>
                <AppText
                  variant="caption"
                  color="tertiary"
                  style={mine ? styles.myTimestamp : undefined}>
                  {new Intl.DateTimeFormat(undefined, {
                    hour: 'numeric',
                    minute: '2-digit',
                  }).format(new Date(item.createdAt))}
                </AppText>
              </View>
            );
          }}
        />
      )}

      <View
        style={[
          styles.composer,
          {
            borderTopColor: theme.separator,
            backgroundColor: theme.backgroundPrimary,
            paddingBottom: Math.max(insets.bottom, spacing.sm),
          },
        ]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Message the trip…"
          placeholderTextColor={theme.textTertiary}
          multiline
          maxLength={2000}
          accessibilityLabel="Trip message"
          style={[
            styles.input,
            typography.body,
            { color: theme.textPrimary, backgroundColor: theme.backgroundSunken },
          ]}
        />
        <IconButton
          icon="arrow.up"
          accessibilityLabel="Send message"
          disabled={!draft.trim() || !deviceId || sending}
          color={theme.textOnAccent}
          background={theme.accentPrimary}
          onPress={() => void send()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  paddedHeader: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.sm },
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCopy: { flex: 1, gap: spacing.xxs },
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
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.sm,
  },
  bannerCopy: { flex: 1, gap: spacing.xxs },
  error: { paddingHorizontal: layout.screenPadding, paddingTop: spacing.sm },
  messages: { flexGrow: 1, gap: spacing.md, padding: layout.screenPadding },
  emptyMessages: { justifyContent: 'center' },
  messageRow: { alignItems: 'flex-start', maxWidth: '84%' },
  myMessageRow: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  sender: { paddingHorizontal: spacing.sm, paddingBottom: spacing.xs },
  bubble: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
  },
  myTimestamp: { textAlign: 'right' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
  },
});
