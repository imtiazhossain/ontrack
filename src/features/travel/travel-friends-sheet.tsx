import * as Clipboard from 'expo-clipboard';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';

import {
  AppText,
  appPrompt,
  Button,
} from '@/components/primitives';
import { spacing } from '@/design-system';
import { useAuthSession } from '@/features/auth/auth-provider';
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
import { TravelSurfaceCard } from '@/features/travel/travel-surface';
import { TravelSheetPrimaryAction } from '@/features/travel/travel-list-actions';
import { TravelSheetModal } from '@/features/travel/travel-sheet';
import { TripPeople } from '@/features/travel/trip-people';
import {
  canonicalTravelTripId,
  isTravelMemberPlan,
  leaveTravelTrip,
  listTravelTripRoster,
  transferTravelTripHost,
  transferTravelTripHostByInvite,
} from '@/features/travel/trip-roster';
import type {
  TravelOpenJoinRequest,
  TravelParticipant,
  TravelPlan,
  TravelTripRosterPerson,
} from '@/features/travel/types';
import type { FriendProfile } from '@/services/friends';
import {
  isTravelExpenseMemberId,
  publishTravelTripExpenses,
} from '@/services/travel/expense-collaboration';
import { useFriends } from '@/store/friends';
import { usePreferences } from '@/store/preferences';
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
  const { user } = useAuthSession();
  const preferencesName = usePreferences((state) => state.name);
  const removePlan = useTravel((state) => state.removePlan);
  const [editingInvite, setEditingInvite] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState<string>();
  const [sharingInvite, setSharingInvite] = useState(false);
  const [managingParticipantId, setManagingParticipantId] = useState<string>();
  const [transferringUserId, setTransferringUserId] = useState<string>();
  const [copiedCode, setCopiedCode] = useState<string>();
  const [openJoinCode, setOpenJoinCode] = useState<string | undefined>(plan.openJoinCode);
  const [openJoinBusy, setOpenJoinBusy] = useState(false);
  const [openJoinError, setOpenJoinError] = useState<string>();
  const [copiedOpenJoin, setCopiedOpenJoin] = useState(false);
  const [joinRequests, setJoinRequests] = useState<TravelOpenJoinRequest[]>([]);
  const [decidingRequestId, setDecidingRequestId] = useState<string>();
  const [pickingFriends, setPickingFriends] = useState(false);
  const [roster, setRoster] = useState<TravelTripRosterPerson[]>([]);
  const hydrateFriends = useFriends((state) => state.hydrate);

  const tripId = canonicalTravelTripId(plan);
  const memberPlan = isTravelMemberPlan(plan);
  const myRosterRole = useMemo(() => {
    if (!user?.id) return undefined;
    return roster.find((person) => person.userId === user.id)?.role;
  }, [roster, user?.id]);
  // Roster is authoritative when present. Otherwise, invite/open-join copies
  // usually have an empty local participants list; host plans keep invitees.
  const canManage =
    myRosterRole === 'host' ||
    (myRosterRole !== 'member' &&
      (!memberPlan || plan.participants.length > 0));

  const hostFromRoster = roster.find((person) => person.role === 'host');
  const rosterMembers = useMemo(() => {
    const fromServer = roster.filter((person) => person.role === 'member');
    if (fromServer.length > 0) return fromServer;
    // Fallback before list_travel_trip_roster is available: expense sync
    // stores accepted friends as member:<auth_uid>.
    const byUserId = new Map<string, TravelTripRosterPerson>();
    for (const person of plan.sharedExpensePeople ?? []) {
      if (!isTravelExpenseMemberId(person.id)) continue;
      const userId = person.id.slice('member:'.length);
      if (!userId || (user?.id && userId === user.id)) continue;
      const match = plan.participants.find(
        (participant) =>
          Boolean(participant.acceptedAt) &&
          participant.name.trim().toLowerCase() === person.name.trim().toLowerCase(),
      );
      byUserId.set(userId, {
        userId,
        displayName: person.name,
        role: 'member',
        ...(match?.email ? { email: match.email } : {}),
        ...(match?.inviteCode ? { inviteCode: match.inviteCode } : {}),
        ...(match?.acceptedAt ? { acceptedAt: match.acceptedAt } : {}),
      });
    }
    return [...byUserId.values()];
  }, [roster, plan.sharedExpensePeople, plan.participants, user?.id]);
  const hostFallbackName = (() => {
    const fromPrefs = preferencesName.trim();
    if (fromPrefs && !/^you$/i.test(fromPrefs)) return fromPrefs;
    const meta = user?.user_metadata ?? {};
    const fromMeta =
      (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
      (typeof meta.name === 'string' && meta.name.trim()) ||
      '';
    if (fromMeta && !/^you$/i.test(fromMeta)) return fromMeta;
    const fromEmail = user?.email?.split('@')[0]?.trim();
    if (fromEmail) return fromEmail;
    return 'Host';
  })();
  const hostPerson = (() => {
    const isSelfHost = Boolean(
      user?.id && hostFromRoster?.userId === user.id,
    );
    // Prefer the signed-in profile name for yourself — roster/JWT helpers can
    // fall back to a generic label like "You" / "Traveler".
    if (canManage || isSelfHost) {
      return {
        name: hostFallbackName,
        email: user?.email ?? hostFromRoster?.email,
        isSelf: true,
      };
    }
    if (hostFromRoster) {
      return {
        name: hostFromRoster.displayName,
        email: hostFromRoster.email,
        isSelf: false,
      };
    }
    if (plan.hostDisplayName?.trim()) {
      return { name: plan.hostDisplayName.trim(), isSelf: false };
    }
    return { name: 'Host', isSelf: false };
  })();

  const refreshJoinRequests = useCallback(async (canonicalTripId: string) => {
    try {
      const requests = await listTravelOpenJoinRequests(canonicalTripId);
      setJoinRequests(requests);
    } catch {
      // Host may be offline / unsigned; leave the last known list.
    }
  }, []);

  const refreshRoster = useCallback(async (canonicalTripId: string) => {
    try {
      const people = await listTravelTripRoster(canonicalTripId);
      setRoster(people);
      return people;
    } catch {
      return undefined;
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      setEditingInvite(false);
      setInviteName('');
      setInviteEmail('');
      setInviteError(undefined);
      setManagingParticipantId(undefined);
      setTransferringUserId(undefined);
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
    const canonicalId = canonicalTravelTripId(latest);
    const isMember = isTravelMemberPlan(latest);
    setOpenJoinCode(latest.openJoinCode);

    void refreshRoster(canonicalId).then((people) => {
      if (!active || !people) return;
      const host = people.find((person) => person.role === 'host');
      if (!host?.displayName) return;
      const current =
        useTravel.getState().plans.find((item) => item.id === plan.id) ?? latest;
      if (current.hostDisplayName === host.displayName) return;
      if (isTravelMemberPlan(current) || current.hostDisplayName) {
        onSavePlan({
          ...current,
          hostDisplayName: host.displayName,
          updatedAt: new Date().toISOString(),
        });
      }
    });

    const inviteCodes = latest.participants.map((person) => person.inviteCode);
    if (inviteCodes.length > 0 && !isMember) {
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

    if (!isMember) {
      setOpenJoinBusy(true);
      void ensureTravelOpenJoinLink(latest)
        .then((code) => {
          if (!active) return;
          setOpenJoinCode(code);
          setOpenJoinError(undefined);
          const current =
            useTravel.getState().plans.find((item) => item.id === plan.id) ?? latest;
          if (current.openJoinCode !== code) {
            const next = {
              ...current,
              openJoinCode: code,
              updatedAt: new Date().toISOString(),
            };
            onSavePlan(next);
            void publishTravelTripExpenses(next).catch(() => undefined);
          } else {
            void publishTravelTripExpenses(current).catch(() => undefined);
          }
          return refreshJoinRequests(canonicalId);
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
    }

    const poll = setInterval(() => {
      void refreshRoster(canonicalId);
      if (!isMember) void refreshJoinRequests(canonicalId);
    }, 5000);

    return () => {
      active = false;
      clearInterval(poll);
    };
  }, [
    visible,
    plan.id,
    onSavePlan,
    refreshJoinRequests,
    refreshRoster,
    hydrateFriends,
  ]);

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
      const next: TravelPlan = {
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
      };
      onSavePlan(next);
      void publishTravelTripExpenses(next).catch(() => undefined);
      setInviteName('');
      setInviteEmail('');
      setEditingInvite(false);
      void refreshRoster(tripId);
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
      void publishTravelTripExpenses(current).catch(() => undefined);
      void refreshRoster(tripId);
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
      void refreshRoster(tripId);
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

  const applyFormerHostLocalState = (
    result: Awaited<ReturnType<typeof transferTravelTripHost>>,
  ) => {
    const current =
      useTravel.getState().plans.find((item) => item.id === plan.id) ?? plan;
    onSavePlan({
      ...current,
      chatAccessCode: result.formerHostInviteCode,
      hostTripId: canonicalTravelTripId(current),
      hostDisplayName: result.newHostDisplayName,
      openJoinCode: undefined,
      updatedAt: new Date().toISOString(),
    });
  };

  const transferHost = (member: TravelTripRosterPerson, leaveAfter: boolean) => {
    confirmDestructiveAction({
      title: leaveAfter ? 'Transfer & leave?' : 'Make host?',
      message: leaveAfter
        ? `${member.displayName} becomes the host and you leave this trip.`
        : `${member.displayName} becomes the host. You stay as a trip friend.`,
      actionLabel: leaveAfter ? 'Transfer & leave' : 'Make host',
      onConfirm: () => {
        void (async () => {
          setTransferringUserId(member.userId);
          try {
            const result = await transferTravelTripHost(tripId, member.userId);
            if (leaveAfter) {
              try {
                await leaveTravelTrip(tripId);
              } catch {
                // Local leave still clears the plan if the RPC fails after transfer.
              }
              removePlan(plan.id);
              onClose();
              return;
            }
            applyFormerHostLocalState(result);
            await refreshRoster(tripId);
            appPrompt.alert(
              'Host Transferred',
              `${member.displayName} is now the host. You can leave whenever you’re ready.`,
            );
          } catch (reason) {
            appPrompt.alert(
              'Couldn’t Transfer Host',
              reason instanceof Error
                ? reason.message
                : 'Host status could not be transferred.',
            );
          } finally {
            setTransferringUserId(undefined);
          }
        })();
      },
    });
  };

  const transferHostByParticipant = (
    participant: TravelParticipant,
    leaveAfter: boolean,
  ) => {
    confirmDestructiveAction({
      title: leaveAfter ? 'Transfer & leave?' : 'Make host?',
      message: leaveAfter
        ? `${participant.name} becomes the host and you leave this trip.`
        : `${participant.name} becomes the host. You stay as a trip friend.`,
      actionLabel: leaveAfter ? 'Transfer & leave' : 'Make host',
      onConfirm: () => {
        void (async () => {
          setTransferringUserId(participant.id);
          try {
            const result = await transferTravelTripHostByInvite(
              tripId,
              participant.inviteCode,
            );
            if (leaveAfter) {
              try {
                await leaveTravelTrip(tripId);
              } catch {
                // Local leave still clears the plan if the RPC fails after transfer.
              }
              removePlan(plan.id);
              onClose();
              return;
            }
            applyFormerHostLocalState(result);
            await refreshRoster(tripId);
            appPrompt.alert(
              'Host Transferred',
              `${participant.name} is now the host. You can leave whenever you’re ready.`,
            );
          } catch (reason) {
            appPrompt.alert(
              'Couldn’t Transfer Host',
              reason instanceof Error
                ? reason.message
                : 'Host status could not be transferred. Apply the latest travel migration, then try again.',
            );
          } finally {
            setTransferringUserId(undefined);
          }
        })();
      },
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
      await refreshJoinRequests(tripId);
      await refreshRoster(tripId);
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
    <Fragment>
      <TravelSheetModal
        visible={visible}
        eyebrow="Friends"
        title={plan.title}
        subtitle={
          canManage
            ? 'Plan Together · Share the Adventure'
            : 'Plan Together · Trip Friends'
        }
        closeAccessibilityLabel="Close Friends"
        onClose={onClose}
        footer={
          canManage ? (
            <TravelSheetPrimaryAction
              label="Add from Friends"
              icon="people"
              onPress={() => setPickingFriends(true)}
            />
          ) : undefined
        }>
            {canManage ? (
              <TravelSurfaceCard bodyStyle={styles.openJoinCard}>
                <AppText variant="overline" color="tertiary" style={travelOverlineStyle} fit>
                  Open Join Link
                </AppText>
                <AppText variant="subheading" fit>
                  Anyone Can Request
                </AppText>
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
              </TravelSurfaceCard>
            ) : null}

            {canManage && joinRequests.length > 0 ? (
              <View style={styles.linksSection}>
                <AppText variant="overline" color="tertiary" style={travelOverlineStyle} fit>
                  Waiting for Approval
                </AppText>
                {joinRequests.map((request) => {
                  const deciding = decidingRequestId === request.id;
                  return (
                    <TravelSurfaceCard key={request.id} bodyStyle={styles.linkCard}>
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
                    </TravelSurfaceCard>
                  );
                })}
              </View>
            ) : null}

            <TripPeople
              host={hostPerson}
              participants={plan.participants}
              rosterMembers={rosterMembers}
              canManage={canManage}
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
              transferringUserId={transferringUserId}
              onResend={(participant) => void resendInvite(participant)}
              onRemove={confirmRemoveParticipant}
              onMakeHost={(member) => transferHost(member, false)}
              onTransferAndLeave={(member) => transferHost(member, true)}
              onMakeHostParticipant={(participant) =>
                transferHostByParticipant(participant, false)
              }
              onTransferAndLeaveParticipant={(participant) =>
                transferHostByParticipant(participant, true)
              }
            />

            {canManage && pending.length > 0 ? (
              <View style={styles.linksSection}>
                <AppText variant="overline" color="tertiary" style={travelOverlineStyle} fit>
                  Private Invite Links
                </AppText>
                {pending.map((participant) => {
                  const url = createTravelInviteUrl(
                    participant.inviteCode,
                    process.env.EXPO_PUBLIC_TRAVEL_SHARE_BASE_URL,
                  );
                  const copied = copiedCode === participant.inviteCode;
                  return (
                    <TravelSurfaceCard key={participant.id} bodyStyle={styles.linkCard}>
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
                    </TravelSurfaceCard>
                  );
                })}
              </View>
            ) : null}
      </TravelSheetModal>
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
    </Fragment>
  );
}

const styles = StyleSheet.create({
  openJoinCard: { gap: spacing.sm },
  linksSection: { gap: spacing.sm },
  linkCard: { gap: spacing.sm },
  linkActions: { flexDirection: 'row', gap: spacing.sm },
  linkAction: { flex: 1, minWidth: 0 },
});
