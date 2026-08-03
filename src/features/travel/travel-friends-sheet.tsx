import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  appPrompt,
} from '@/components/primitives';
import { resolveSelfDisplayName } from '@/features/account/self-display-name';
import { useAuthSession } from '@/features/auth/auth-provider';
import {
  createTravelInviteUrl,
  createTravelOpenJoinUrl,
  decideTravelOpenJoin,
  listTravelOpenJoinRequests,
  resendTravelInvite,
  revokeTravelInvite,
  shareTravelOpenJoinLink,
  shareTravelPlan,
} from '@/features/travel/share';
import { itinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';
import { TravelSheetModal } from '@/features/travel/travel-sheet';
import { TripPeople } from '@/features/travel/trip-people';
import {
  canonicalTravelTripId,
  grantTravelTripCohost,
  isTravelMemberPlan,
  leaveTravelTrip,
  listTravelTripRoster,
  resolveIsTravelSoleHost,
  revokeTravelTripCohost,
  transferTravelTripHost,
  transferTravelTripHostByInvite,
} from '@/features/travel/trip-roster';
import { ensureFriendProfile } from '@/services/friends';
import type {
  TravelOpenJoinRequest,
  TravelParticipant,
  TravelPlan,
  TravelTripRosterPerson,
} from '@/features/travel/types';
import { publishTravelTripExpenses } from '@/services/travel/expense-collaboration';
import { usePreferences } from '@/store/preferences';
import { useTravel } from '@/store/travel';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { confirmDestructiveAction } from '@/utils/confirm-destructive';
import { newId } from '@/utils/id';
import { haptics } from '@/utils/haptics';
import {
  TravelRemoveConfirmModal,
  type TravelRemoveConfirmPayload,
} from '@/features/travel/travel-remove-confirm-modal';
import {
  TravelJoinRequestsPanel,
  TravelOpenJoinCard,
  TravelPendingInviteLinks,
} from '@/features/travel/travel-friends-join-panels';
import {
  filterTravelFriendsVisibleParticipants,
  resolveTravelFriendsHostPerson,
  resolveTravelFriendsRosterMembers,
} from '@/features/travel/travel-friends-roster-model';
import { useTravelFriendsSheetSync } from '@/features/travel/use-travel-friends-sheet-sync';

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
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { s, spacing: rs } = useResponsive();
  const preferencesName = usePreferences((state) => state.name);
  const setPreferencesName = usePreferences((state) => state.setName);
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
  const [roster, setRoster] = useState<TravelTripRosterPerson[]>([]);
  const [removeConfirm, setRemoveConfirm] =
    useState<TravelRemoveConfirmPayload | null>(null);
  const onSavePlanRef = useRef(onSavePlan);
  onSavePlanRef.current = onSavePlan;

  const tripId = canonicalTravelTripId(plan);
  const memberPlan = isTravelMemberPlan(plan);
  const myRosterRole = useMemo(() => {
    if (!user?.id) return undefined;
    return roster.find((person) => person.userId === user.id)?.role;
  }, [roster, user?.id]);
  // Sole host owns transfer / co-host grants. Cohosts share invite + friend manage.
  const isSoleHost = resolveIsTravelSoleHost({ myRosterRole, memberPlan });
  const canManage = isSoleHost || myRosterRole === 'cohost';

  const hostFromRoster = roster.find((person) => person.role === 'host');
  const rosterMembers = useMemo(
    () =>
      resolveTravelFriendsRosterMembers({
        roster,
        plan,
        selfUserId: user?.id,
      }),
    [roster, plan, user?.id],
  );
  const hostFallbackName = resolveSelfDisplayName({
    preferencesName,
    user,
    fallback: 'Host',
  });
  const hostPerson = resolveTravelFriendsHostPerson({
    hostFromRoster,
    isSoleHost,
    memberPlan,
    hostFallbackName,
    hostDisplayName: plan.hostDisplayName,
    selfUserId: user?.id,
    selfEmail: user?.email,
  });
  const visibleParticipants = useMemo(
    () =>
      filterTravelFriendsVisibleParticipants({
        participants: plan.participants,
        hostPerson,
        hostFromRoster,
        roster,
        memberPlan,
      }),
    [hostFromRoster, hostPerson, memberPlan, plan.participants, roster],
  );

  const renameSelf = (nextName: string) => {
    setPreferencesName(nextName);
    void ensureFriendProfile({ displayName: nextName }).catch(() => undefined);
    if (user?.id) {
      setRoster((people) =>
        people.map((person) =>
          person.userId === user.id
            ? { ...person, displayName: nextName }
            : person,
        ),
      );
    }
  };

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

  useTravelFriendsSheetSync({
    visible,
    plan,
    onSavePlanRef,
    openJoinCode,
    setOpenJoinCode,
    setOpenJoinBusy,
    setOpenJoinError,
    setCopiedOpenJoin,
    setEditingInvite,
    setInviteName,
    setInviteEmail,
    setInviteError,
    setManagingParticipantId,
    setTransferringUserId,
    setCopiedCode,
    setDecidingRequestId,
    refreshJoinRequests,
    refreshRoster,
  });

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
    setRemoveConfirm({
      title: accepted ? 'Remove Friend?' : 'Remove Invitation?',
      message: accepted
        ? `${participant.name} will be removed from this trip and their invite link will stop working.`
        : `${participant.name}’s invite link will stop working.`,
      actionLabel: accepted ? 'Remove Friend' : 'Remove Invite',
      onConfirm: () => void removeParticipant(participant),
    });
  };

  const confirmRemoveRosterMember = (member: TravelTripRosterPerson) => {
    const matched = plan.participants.find(
      (person) =>
        person.inviteCode === member.inviteCode ||
        (person.email &&
          member.email &&
          person.email.toLowerCase() === member.email.toLowerCase()),
    );
    if (matched) {
      confirmRemoveParticipant(matched);
      return;
    }
    if (!member.inviteCode) {
      appPrompt.alert(
        'Couldn’t Remove Friend',
        'This person can’t be removed from here. Ask them to leave the trip, or remove their invite from another device.',
      );
      return;
    }
    setRemoveConfirm({
      title: 'Remove Friend?',
      message: `${member.displayName} will be removed from this trip and their invite link will stop working.`,
      actionLabel: 'Remove Friend',
      onConfirm: () => {
        void (async () => {
          setTransferringUserId(member.userId);
          try {
            await revokeTravelInvite(member.inviteCode!);
            setRoster((people) =>
              people.filter((person) => person.userId !== member.userId),
            );
            void refreshRoster(tripId);
          } catch (reason) {
            appPrompt.alert(
              'Couldn’t Remove Friend',
              reason instanceof Error
                ? reason.message
                : 'This person could not be removed. Please try again.',
            );
          } finally {
            setTransferringUserId(undefined);
          }
        })();
      },
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
    if (!isSoleHost) return;
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
    if (!isSoleHost) return;
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

  const makeCohost = (member: TravelTripRosterPerson) => {
    if (!isSoleHost) return;
    void (async () => {
      setTransferringUserId(member.userId);
      try {
        await grantTravelTripCohost(tripId, member.userId);
        setRoster((people) =>
          people.map((person) =>
            person.userId === member.userId
              ? { ...person, role: 'cohost' }
              : person,
          ),
        );
        await refreshRoster(tripId);
      } catch (reason) {
        appPrompt.alert(
          'Couldn’t Make Co-host',
          reason instanceof Error
            ? reason.message
            : 'Co-host status could not be granted.',
        );
      } finally {
        setTransferringUserId(undefined);
      }
    })();
  };

  const removeCohost = (member: TravelTripRosterPerson) => {
    if (!isSoleHost) return;
    setRemoveConfirm({
      title: 'Remove Co-host?',
      message: `${member.displayName} will stay on the trip as a friend, but won’t manage invites.`,
      actionLabel: 'Remove Co-host',
      onConfirm: () => {
        void (async () => {
          setTransferringUserId(member.userId);
          try {
            await revokeTravelTripCohost(tripId, member.userId);
            setRoster((people) =>
              people.map((person) =>
                person.userId === member.userId
                  ? { ...person, role: 'member' }
                  : person,
              ),
            );
            await refreshRoster(tripId);
          } catch (reason) {
            appPrompt.alert(
              'Couldn’t Remove Co-host',
              reason instanceof Error
                ? reason.message
                : 'Co-host status could not be removed.',
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
    <>
    <TravelSheetModal
      visible={visible}
      eyebrow="Co-Travelers"
        title={plan.title}
        subtitle={
          canManage
            ? 'Plan together. Share the adventure.'
            : 'Plan together. Trip friends.'
        }
        lockHeight
        closeAccessibilityLabel="Close Co-Travelers"
        onClose={onClose}>
            <TripPeople
              host={hostPerson}
              participants={visibleParticipants}
              rosterMembers={rosterMembers}
              selfUserId={user?.id}
              canManage={canManage}
              editing={editingInvite}
              name={inviteName}
              email={inviteEmail}
              error={inviteError}
              inviting={sharingInvite}
              showHeader={false}
              showInviteButton={false}
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
              onRemoveRosterMember={confirmRemoveRosterMember}
              canPromoteHost={isSoleHost}
              onMakeHost={(member) => transferHost(member, false)}
              onMakeHostParticipant={(participant) =>
                transferHostByParticipant(participant, false)
              }
              onMakeCohost={makeCohost}
              onRemoveCohost={removeCohost}
              onRenameHost={
                isSoleHost
                  ? (nextName) => {
                      renameSelf(nextName);
                      const current =
                        useTravel.getState().plans.find((item) => item.id === plan.id) ??
                        plan;
                      onSavePlan({
                        ...current,
                        hostDisplayName: nextName,
                        updatedAt: new Date().toISOString(),
                      });
                      if (!isTravelMemberPlan(current)) {
                        void publishTravelTripExpenses({
                          ...current,
                          hostDisplayName: nextName,
                        }).catch(() => undefined);
                      }
                    }
                  : undefined
              }
              onRenameSelf={renameSelf}
              onRenameParticipant={
                canManage
                  ? (participant, nextName) => {
                      const current =
                        useTravel
                          .getState()
                          .plans.find((item) => item.id === plan.id) ?? plan;
                      onSavePlan({
                        ...current,
                        participants: current.participants.map((person) =>
                          person.id === participant.id
                            ? { ...person, name: nextName }
                            : person,
                        ),
                        updatedAt: new Date().toISOString(),
                      });
                    }
                  : undefined
              }
              onRenameRosterMember={
                canManage
                  ? (member, nextName) => {
                      if (user?.id && member.userId === user.id) {
                        renameSelf(nextName);
                        return;
                      }
                      const current =
                        useTravel
                          .getState()
                          .plans.find((item) => item.id === plan.id) ?? plan;
                      const matched = current.participants.find(
                        (person) =>
                          person.inviteCode === member.inviteCode ||
                          (person.email &&
                            member.email &&
                            person.email.toLowerCase() ===
                              member.email.toLowerCase()),
                      );
                      if (matched) {
                        onSavePlan({
                          ...current,
                          participants: current.participants.map((person) =>
                            person.id === matched.id
                              ? { ...person, name: nextName }
                              : person,
                          ),
                          updatedAt: new Date().toISOString(),
                        });
                      }
                      setRoster((people) =>
                        people.map((person) =>
                          person.userId === member.userId
                            ? { ...person, displayName: nextName }
                            : person,
                        ),
                      );
                    }
                  : undefined
              }
            />

            {canManage ? (
              <TravelOpenJoinCard
                tripTitle={plan.title}
                openJoinUrl={openJoinUrl}
                openJoinCode={openJoinCode}
                openJoinBusy={openJoinBusy}
                openJoinError={openJoinError}
                copiedOpenJoin={copiedOpenJoin}
                chrome={chrome}
                s={s}
                rs={rs}
                onCopy={() => void copyOpenJoinLink()}
                onShare={() => void shareOpenJoin()}
              />
            ) : null}

            {canManage ? (
              <TravelJoinRequestsPanel
                joinRequests={joinRequests}
                decidingRequestId={decidingRequestId}
                onDecide={(request, approve) => void decideRequest(request, approve)}
              />
            ) : null}

            {canManage ? (
              <TravelPendingInviteLinks
                pending={pending}
                copiedCode={copiedCode}
                managingParticipantId={managingParticipantId}
                onCopy={(participant) => void copyInviteLink(participant)}
                onShare={(participant) => void resendInvite(participant)}
              />
            ) : null}
    </TravelSheetModal>
    <TravelRemoveConfirmModal
      payload={removeConfirm}
      onCancel={() => setRemoveConfirm(null)}
    />
    </>
  );
}

