import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppText,
  appPrompt,
  Button,
  Card,
  IconButton,
} from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { PeoplePicker } from '@/features/social/people-picker';
import {
  createTravelInviteUrl,
  createTravelOpenJoinUrl,
  decideTravelOpenJoin,
  ensureTravelOpenJoinLink,
  listTravelOpenJoinRequests,
  loadTravelInviteStatuses,
  resendTravelInvite,
  revokeTravelInvite,
  shareTravelOpenJoinLink,
  shareTravelPlan,
} from '@/features/travel/share';
import { travelOverlineStyle } from '@/features/travel/travel-chrome';
import {
  TravelSkyHeader,
} from '@/features/travel/travel-surface';
import { TripPeople } from '@/features/travel/trip-people';
import type {
  TravelOpenJoinRequest,
  TravelParticipant,
  TravelPlan,
} from '@/features/travel/types';
import { useTheme } from '@/hooks/use-theme';
import type { FriendProfile } from '@/services/friends';
import { useFriends } from '@/store/friends';
import { useTravel } from '@/store/travel';
import { confirmDestructiveAction } from '@/utils/confirm-destructive';
import { newId } from '@/utils/id';

export function TravelFriendsSheet({
  plan,
  visible,
  onClose,
  onSavePlan,
}: {
  plan: TravelPlan;
  visible: boolean;
  onClose: () => void;
  onSavePlan: (plan: TravelPlan) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [editingInvite, setEditingInvite] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState<string>();
  const [sharingInvite, setSharingInvite] = useState(false);
  const [managingParticipantId, setManagingParticipantId] = useState<string>();
  const [copiedCode, setCopiedCode] = useState<string>();
  const [openJoinCode, setOpenJoinCode] = useState<string | undefined>(plan.openJoinCode);
  const [openJoinBusy, setOpenJoinBusy] = useState(false);
  const [openJoinError, setOpenJoinError] = useState<string>();
  const [copiedOpenJoin, setCopiedOpenJoin] = useState(false);
  const [joinRequests, setJoinRequests] = useState<TravelOpenJoinRequest[]>([]);
  const [decidingRequestId, setDecidingRequestId] = useState<string>();
  const [pickingFriends, setPickingFriends] = useState(false);
  const hydrateFriends = useFriends((state) => state.hydrate);

  const refreshJoinRequests = useCallback(async (tripId: string) => {
    try {
      const requests = await listTravelOpenJoinRequests(tripId);
      setJoinRequests(requests);
    } catch {
      // Host may be offline / unsigned; leave the last known list.
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      setEditingInvite(false);
      setInviteName('');
      setInviteEmail('');
      setInviteError(undefined);
      setManagingParticipantId(undefined);
      setCopiedCode(undefined);
      setOpenJoinError(undefined);
      setCopiedOpenJoin(false);
      setDecidingRequestId(undefined);
      setPickingFriends(false);
      return;
    }

    void hydrateFriends().catch(() => undefined);

    let active = true;
    const latest =
      useTravel.getState().plans.find((item) => item.id === plan.id) ?? plan;
    setOpenJoinCode(latest.openJoinCode);

    const inviteCodes = latest.participants.map((person) => person.inviteCode);
    if (inviteCodes.length > 0) {
      void loadTravelInviteStatuses(inviteCodes)
        .then((statuses) => {
          if (!active || Object.keys(statuses).length === 0) return;
          const current =
            useTravel.getState().plans.find((item) => item.id === plan.id) ?? latest;
          let changed = false;
          const participants = current.participants.map((person) => {
            const acceptedAt = statuses[person.inviteCode];
            if (!acceptedAt || person.acceptedAt === acceptedAt) return person;
            changed = true;
            return { ...person, acceptedAt };
          });
          if (changed) {
            onSavePlan({
              ...current,
              participants,
              updatedAt: new Date().toISOString(),
            });
          }
        })
        .catch(() => undefined);
    }

    setOpenJoinBusy(true);
    void ensureTravelOpenJoinLink(latest)
      .then((code) => {
        if (!active) return;
        setOpenJoinCode(code);
        setOpenJoinError(undefined);
        const current =
          useTravel.getState().plans.find((item) => item.id === plan.id) ?? latest;
        if (current.openJoinCode !== code) {
          onSavePlan({
            ...current,
            openJoinCode: code,
            updatedAt: new Date().toISOString(),
          });
        }
        return refreshJoinRequests(latest.id);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setOpenJoinError(
          reason instanceof Error
            ? reason.message
            : 'The open join link could not be created.',
        );
      })
      .finally(() => {
        if (active) setOpenJoinBusy(false);
      });

    const poll = setInterval(() => {
      void refreshJoinRequests(latest.id);
    }, 5000);

    return () => {
      active = false;
      clearInterval(poll);
    };
  }, [visible, plan.id, onSavePlan, refreshJoinRequests, hydrateFriends]);

  const inviteFriend = async () => {
    setInviteError(undefined);
    const name = inviteName.trim();
    const email = inviteEmail.trim().toLowerCase();
    if (!name) return setInviteError('Add your friend’s name.');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setInviteError(
        'Enter the email address your friend uses to sign in to onTrack.',
      );
    }
    setSharingInvite(true);
    try {
      const code = await shareTravelPlan(plan, { name, email });
      if (!code) return;
      const now = new Date().toISOString();
      onSavePlan({
        ...plan,
        participants: [
          ...plan.participants,
          {
            id: newId('trip-person'),
            name,
            email,
            inviteCode: code,
            invitedAt: now,
          },
        ],
        updatedAt: now,
      });
      setInviteName('');
      setInviteEmail('');
      setEditingInvite(false);
    } catch (shareError) {
      setInviteError(
        shareError instanceof Error
          ? shareError.message
          : 'The invitation could not be created. Please try again.',
      );
    } finally {
      setSharingInvite(false);
    }
  };

  const inviteFromFriends = async (friends: FriendProfile[]) => {
    if (!friends.length) return;
    setSharingInvite(true);
    setInviteError(undefined);
    try {
      let current =
        useTravel.getState().plans.find((item) => item.id === plan.id) ?? plan;
      for (const friend of friends) {
        const email = friend.email.trim().toLowerCase();
        if (
          current.participants.some(
            (person) => person.email?.toLowerCase() === email,
          )
        ) {
          continue;
        }
        const code = await shareTravelPlan(current, {
          name: friend.displayName,
          email,
        });
        if (!code) continue;
        const now = new Date().toISOString();
        current = {
          ...current,
          participants: [
            ...current.participants,
            {
              id: newId('trip-person'),
              name: friend.displayName,
              email,
              inviteCode: code,
              invitedAt: now,
            },
          ],
          updatedAt: now,
        };
        onSavePlan(current);
      }
    } catch (shareError) {
      setInviteError(
        shareError instanceof Error
          ? shareError.message
          : 'Friends could not be invited. Please try again.',
      );
    } finally {
      setSharingInvite(false);
    }
  };

  const resendInvite = async (participant: TravelParticipant) => {
    setManagingParticipantId(participant.id);
    try {
      await resendTravelInvite(
        plan,
        { name: participant.name, email: participant.email ?? '' },
        participant.inviteCode,
      );
    } catch (reason) {
      appPrompt.alert(
        'Couldn’t Resend Invitation',
        reason instanceof Error
          ? reason.message
          : 'The invitation could not be shared. Please try again.',
      );
    } finally {
      setManagingParticipantId(undefined);
    }
  };

  const removeParticipant = async (participant: TravelParticipant) => {
    setManagingParticipantId(participant.id);
    try {
      await revokeTravelInvite(participant.inviteCode);
      onSavePlan({
        ...plan,
        participants: plan.participants.filter(
          (person) => person.id !== participant.id,
        ),
        updatedAt: new Date().toISOString(),
      });
    } catch (reason) {
      appPrompt.alert(
        participant.acceptedAt ? 'Couldn’t Remove Friend' : 'Couldn’t Remove Invitation',
        reason instanceof Error
          ? reason.message
          : 'This person could not be removed. Please try again.',
      );
    } finally {
      setManagingParticipantId(undefined);
    }
  };

  const confirmRemoveParticipant = (participant: TravelParticipant) => {
    const accepted = Boolean(participant.acceptedAt);
    confirmDestructiveAction({
      title: accepted ? 'Remove Friend?' : 'Remove Invitation?',
      message: accepted
        ? `${participant.name} will be removed from this trip and their invite link will stop working.`
        : `${participant.name}’s invite link will stop working.`,
      actionLabel: accepted ? 'Remove Friend' : 'Remove Invite',
      onConfirm: () => void removeParticipant(participant),
    });
  };

  const copyInviteLink = async (participant: TravelParticipant) => {
    const url = createTravelInviteUrl(
      participant.inviteCode,
      process.env.EXPO_PUBLIC_TRAVEL_SHARE_BASE_URL,
    );
    await Clipboard.setStringAsync(url);
    setCopiedCode(participant.inviteCode);
  };

  const copyOpenJoinLink = async () => {
    if (!openJoinCode) return;
    const url = createTravelOpenJoinUrl(
      openJoinCode,
      process.env.EXPO_PUBLIC_TRAVEL_SHARE_BASE_URL,
    );
    await Clipboard.setStringAsync(url);
    setCopiedOpenJoin(true);
  };

  const shareOpenJoin = async () => {
    if (!openJoinCode) return;
    setOpenJoinBusy(true);
    try {
      await shareTravelOpenJoinLink(plan, openJoinCode);
    } catch (reason) {
      appPrompt.alert(
        'Couldn’t Share Join Link',
        reason instanceof Error
          ? reason.message
          : 'The open join link could not be shared.',
      );
    } finally {
      setOpenJoinBusy(false);
    }
  };

  const decideRequest = async (request: TravelOpenJoinRequest, approve: boolean) => {
    setDecidingRequestId(request.id);
    try {
      const result = await decideTravelOpenJoin(request.id, approve);
      if (approve && result.grantedInviteCode && result.requesterName) {
        const now = new Date().toISOString();
        const current =
          useTravel.getState().plans.find((item) => item.id === plan.id) ?? plan;
        const already = current.participants.some(
          (person) =>
            person.inviteCode === result.grantedInviteCode ||
            (result.requesterEmail &&
              person.email?.toLowerCase() === result.requesterEmail.toLowerCase()),
        );
        if (!already) {
          onSavePlan({
            ...current,
            participants: [
              ...current.participants,
              {
                id: newId('trip-person'),
                name: result.requesterName,
                email: result.requesterEmail,
                inviteCode: result.grantedInviteCode,
                invitedAt: now,
                acceptedAt: now,
              },
            ],
            updatedAt: now,
          });
        }
      }
      await refreshJoinRequests(plan.id);
    } catch (reason) {
      appPrompt.alert(
        approve ? 'Couldn’t Approve Friend' : 'Couldn’t Decline Request',
        reason instanceof Error
          ? reason.message
          : 'The join request could not be updated.',
      );
    } finally {
      setDecidingRequestId(undefined);
    }
  };

  const pending = plan.participants.filter((person) => !person.acceptedAt);
  const openJoinUrl = openJoinCode
    ? createTravelOpenJoinUrl(
        openJoinCode,
        process.env.EXPO_PUBLIC_TRAVEL_SHARE_BASE_URL,
      )
    : undefined;

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}>
      <View
        style={[
          styles.modalRoot,
          { backgroundColor: theme.overlayScrim, paddingTop: insets.top },
        ]}>
        <Pressable
          accessibilityLabel="Close friends"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.backgroundPrimary,
              paddingBottom: Math.max(insets.bottom, spacing.lg),
              overflow: 'hidden',
            },
          ]}>
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: theme.separator }]} />
          </View>
          <TravelSkyHeader
            eyebrow="Friends"
            title={plan.title}
            subtitle="Private Invites · Open Link Needs Your Approval"
            trailing={
              <IconButton
                icon="close"
                size={36}
                background="transparent"
                borderColor={theme.separator}
                accessibilityLabel="Close Friends"
                onPress={onClose}
              />
            }
          />

          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}>
            <Card variant="sunken" style={styles.openJoinCard}>
              <AppText variant="overline" color="tertiary" style={travelOverlineStyle}>
                Open Join Link
              </AppText>
              <AppText variant="subheading">Anyone Can Request</AppText>
              <AppText variant="caption" color="secondary">
                Share this link freely. New friends request to join, and you approve each one before
                they see the itinerary. Without the app, they’ll be prompted to download it.
              </AppText>
              {openJoinUrl ? (
                <AppText variant="caption" color="secondary" selectable>
                  {openJoinUrl}
                </AppText>
              ) : openJoinError ? (
                <AppText variant="caption" color="danger">
                  {openJoinError}
                </AppText>
              ) : (
                <AppText variant="caption" color="secondary">
                  {openJoinBusy ? 'Creating link…' : 'Sign in to create an open join link.'}
                </AppText>
              )}
              <View style={styles.linkActions}>
                <Button
                  variant="secondary"
                  style={styles.linkAction}
                  disabled={!openJoinCode || openJoinBusy}
                  accessibilityLabel="Copy open join link"
                  onPress={() => void copyOpenJoinLink()}>
                  {copiedOpenJoin ? 'Copied' : 'Copy Link'}
                </Button>
                <Button
                  variant="secondary"
                  style={styles.linkAction}
                  disabled={!openJoinCode || openJoinBusy}
                  accessibilityLabel="Share open join link"
                  onPress={() => void shareOpenJoin()}>
                  Share
                </Button>
              </View>
            </Card>

            {joinRequests.length > 0 ? (
              <View style={styles.linksSection}>
                <AppText variant="overline" color="tertiary" style={travelOverlineStyle}>
                  Waiting for Approval
                </AppText>
                {joinRequests.map((request) => {
                  const deciding = decidingRequestId === request.id;
                  return (
                    <Card key={request.id} variant="sunken" style={styles.linkCard}>
                      <AppText variant="subheading" fit>
                        {request.requesterName}
                      </AppText>
                      <AppText variant="caption" color="secondary" selectable>
                        {request.requesterEmail}
                      </AppText>
                      <View style={styles.linkActions}>
                        <Button
                          style={styles.linkAction}
                          disabled={deciding}
                          accessibilityLabel={`Approve ${request.requesterName}`}
                          onPress={() => void decideRequest(request, true)}>
                          {deciding ? 'Working…' : 'Approve'}
                        </Button>
                        <Button
                          variant="secondary"
                          style={styles.linkAction}
                          disabled={deciding}
                          accessibilityLabel={`Decline ${request.requesterName}`}
                          onPress={() => void decideRequest(request, false)}>
                          Decline
                        </Button>
                      </View>
                    </Card>
                  );
                })}
              </View>
            ) : null}

            <Button
              icon="people"
              variant="secondary"
              disabled={sharingInvite}
              onPress={() => setPickingFriends(true)}>
              Add from Friends
            </Button>

            <TripPeople
              participants={plan.participants}
              editing={editingInvite}
              name={inviteName}
              email={inviteEmail}
              error={inviteError}
              inviting={sharingInvite}
              showHeader={false}
              onNameChange={setInviteName}
              onEmailChange={setInviteEmail}
              onBeginInvite={() => {
                setInviteError(undefined);
                setEditingInvite(true);
              }}
              onCancelInvite={() => {
                setInviteError(undefined);
                setEditingInvite(false);
              }}
              onInvite={() => void inviteFriend()}
              managingParticipantId={managingParticipantId}
              onResend={(participant) => void resendInvite(participant)}
              onRemove={confirmRemoveParticipant}
            />

            {pending.length > 0 ? (
              <View style={styles.linksSection}>
                <AppText variant="overline" color="tertiary" style={travelOverlineStyle}>
                  Private Invite Links
                </AppText>
                {pending.map((participant) => {
                  const url = createTravelInviteUrl(
                    participant.inviteCode,
                    process.env.EXPO_PUBLIC_TRAVEL_SHARE_BASE_URL,
                  );
                  const copied = copiedCode === participant.inviteCode;
                  return (
                    <Card key={participant.id} variant="sunken" style={styles.linkCard}>
                      <AppText variant="subheading" fit>
                        {participant.name}
                      </AppText>
                      <AppText variant="caption" color="secondary" selectable>
                        {url}
                      </AppText>
                      <View style={styles.linkActions}>
                        <Button
                          variant="secondary"
                          style={styles.linkAction}
                          accessibilityLabel={`Copy invite link for ${participant.name}`}
                          onPress={() => void copyInviteLink(participant)}>
                          {copied ? 'Copied' : 'Copy Link'}
                        </Button>
                        <Button
                          variant="secondary"
                          style={styles.linkAction}
                          disabled={managingParticipantId === participant.id}
                          accessibilityLabel={`Share invite link for ${participant.name}`}
                          onPress={() => void resendInvite(participant)}>
                          Share
                        </Button>
                      </View>
                    </Card>
                  );
                })}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
      <PeoplePicker
        visible={pickingFriends}
        title="Add Trip Friends"
        confirmLabel="Invite"
        excludeIds={plan.participants
          .map((person) => person.email)
          .filter((email): email is string => Boolean(email))}
        onClose={() => setPickingFriends(false)}
        onConfirm={(friends) => void inviteFromFriends(friends)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  handleRow: { alignItems: 'center', paddingTop: spacing.sm },
  handle: { width: 36, height: 4, borderRadius: radii.pill },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  flex: { flex: 1, minWidth: 0, gap: spacing.xxs },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  openJoinCard: { gap: spacing.sm },
  linksSection: { gap: spacing.sm },
  linkCard: { gap: spacing.sm },
  linkActions: { flexDirection: 'row', gap: spacing.sm },
  linkAction: { flex: 1, minWidth: 0 },
});
