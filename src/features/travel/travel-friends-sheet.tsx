import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import {
  AppText,
  appPrompt,
  Button,
  Symbol,
} from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { resolveSelfDisplayName } from '@/features/account/self-display-name';
import { useAuthSession } from '@/features/auth/auth-provider';
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
import { itinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';
import { TravelSheetModal } from '@/features/travel/travel-sheet';
import { TravelSurfaceCard } from '@/features/travel/travel-surface';
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
import {
  isTravelExpenseMemberId,
  publishTravelTripExpenses,
} from '@/services/travel/expense-collaboration';
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

function tripNameSlug(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'trip';
}

/** Pretty join path for display — always uses the trip name. Copy/share keep the real code URL. */
function displayJoinLink(tripTitle: string, realUrl: string): string {
  try {
    const host = new URL(realUrl).host.replace(/^www\./, '');
    return `${host}/j/${tripNameSlug(tripTitle)}`;
  } catch {
    return `ontrack--links.expo.app/j/${tripNameSlug(tripTitle)}`;
  }
}

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
  const ensuredOpenJoinForPlanRef = useRef<string | undefined>(undefined);

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
  const rosterMembers = useMemo(() => {
    const fromServer = roster.filter(
      (person) => person.role === 'member' || person.role === 'cohost',
    );
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
  const hostFallbackName = resolveSelfDisplayName({
    preferencesName,
    user,
    fallback: 'Host',
  });
  const hostPerson = (() => {
    const isSelfHost = Boolean(
      user?.id && hostFromRoster?.userId === user.id,
    );
    // Prefer the signed-in profile name for yourself — roster/JWT helpers can
    // fall back to a generic label like "You" / "Traveler".
    // Never claim host on a member copy before roster confirms — that duplicated
    // a friend into the host slot after rename.
    if (isSelfHost || (isSoleHost && !memberPlan && !hostFromRoster)) {
      return {
        name: hostFallbackName,
        email: user?.email ?? hostFromRoster?.email,
        isSelf: true,
        userId: user?.id ?? hostFromRoster?.userId,
      };
    }
    if (hostFromRoster) {
      return {
        name: hostFromRoster.displayName,
        email: hostFromRoster.email,
        isSelf: false,
        userId: hostFromRoster.userId,
      };
    }
    if (memberPlan && plan.hostDisplayName?.trim()) {
      return { name: plan.hostDisplayName.trim(), isSelf: false };
    }
    if (!memberPlan) {
      return {
        name: hostFallbackName,
        email: user?.email,
        isSelf: true,
        userId: user?.id,
      };
    }
    return { name: 'Host', isSelf: false };
  })();

  const visibleParticipants = useMemo(() => {
    const hostEmail = hostPerson.email?.trim().toLowerCase();
    const hostName = hostPerson.name.trim().toLowerCase();
    const rosterLoaded = roster.length > 0;
    const rosterEmails = new Set(
      roster
        .map((person) => person.email?.trim().toLowerCase())
        .filter((value): value is string => Boolean(value)),
    );
    return plan.participants.filter((person) => {
      const email = person.email?.trim().toLowerCase();
      const name = person.name.trim().toLowerCase();
      // Never list the host again under an older invite / display name.
      if (hostEmail && email && email === hostEmail) return false;
      if (hostName && name === hostName) return false;
      if (
        hostFromRoster &&
        name &&
        hostFromRoster.displayName.trim().toLowerCase() === name
      ) {
        return false;
      }
      // Member copies: once the server roster is in, hide stale accepted
      // local rows (they duplicate host/friends under prior names).
      if (memberPlan && rosterLoaded && person.acceptedAt) return false;
      if (email && rosterEmails.has(email) && person.acceptedAt) return false;
      return true;
    });
  }, [
    hostFromRoster,
    hostPerson.email,
    hostPerson.name,
    memberPlan,
    plan.participants,
    roster,
  ]);

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

  // Keep the displayed code in sync when the plan already has one — without
  // toggling busy state (that was flickering the Join Link card).
  useEffect(() => {
    if (!visible) return;
    if (plan.openJoinCode && plan.openJoinCode !== openJoinCode) {
      setOpenJoinCode(plan.openJoinCode);
    }
  }, [visible, plan.openJoinCode, openJoinCode]);

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
      ensuredOpenJoinForPlanRef.current = undefined;
      return;
    }

    let active = true;
    const latest =
      useTravel.getState().plans.find((item) => item.id === plan.id) ?? plan;
    const canonicalId = canonicalTravelTripId(latest);
    const isMember = isTravelMemberPlan(latest);
    const savePlan = (next: TravelPlan) => onSavePlanRef.current(next);

    const syncRosterIntoPlan = (people: TravelTripRosterPerson[]) => {
      const current =
        useTravel.getState().plans.find((item) => item.id === plan.id) ?? latest;
      const host = people.find((person) => person.role === 'host');
      let next = current;
      let changed = false;

      if (
        host?.displayName &&
        current.hostDisplayName !== host.displayName &&
        (isTravelMemberPlan(current) || current.hostDisplayName)
      ) {
        next = {
          ...next,
          hostDisplayName: host.displayName,
        };
        changed = true;
      }

      // Keep local invite labels in sync with roster names so trip-card
      // initials match Co-Travelers (e.g. "Farhana Tasmin" vs truncated "Farhana").
      const participants = next.participants.map((person) => {
        const match = people.find(
          (member) =>
            (member.role === 'member' || member.role === 'cohost') &&
            (member.inviteCode === person.inviteCode ||
              (member.email &&
                person.email &&
                member.email.toLowerCase() === person.email.toLowerCase())),
        );
        if (!match?.displayName || match.displayName === person.name) return person;
        changed = true;
        return { ...person, name: match.displayName };
      });
      if (changed) {
        savePlan({
          ...next,
          participants,
          updatedAt: new Date().toISOString(),
        });
      }
    };

    void refreshRoster(canonicalId).then((people) => {
      if (!active || !people) return;
      syncRosterIntoPlan(people);
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
            savePlan({
              ...current,
              participants,
              updatedAt: new Date().toISOString(),
            });
          }
        })
        .catch(() => undefined);
    }

    if (!isMember) {
      const alreadyHaveCode = Boolean(latest.openJoinCode);
      const alreadyEnsured = ensuredOpenJoinForPlanRef.current === plan.id;
      if (!alreadyHaveCode && !alreadyEnsured) {
        ensuredOpenJoinForPlanRef.current = plan.id;
        setOpenJoinBusy(true);
        void ensureTravelOpenJoinLink(latest)
          .then((code) => {
            if (!active) return;
            setOpenJoinCode(code);
            setOpenJoinError(undefined);
            const current =
              useTravel.getState().plans.find((item) => item.id === plan.id) ??
              latest;
            if (current.openJoinCode !== code) {
              const next = {
                ...current,
                openJoinCode: code,
                updatedAt: new Date().toISOString(),
              };
              savePlan(next);
              void publishTravelTripExpenses(next).catch(() => undefined);
            }
            return refreshJoinRequests(canonicalId);
          })
          .catch((reason: unknown) => {
            if (!active) return;
            ensuredOpenJoinForPlanRef.current = undefined;
            setOpenJoinError(
              reason instanceof Error
                ? reason.message
                : 'The open join link could not be created.',
            );
          })
          .finally(() => {
            if (active) setOpenJoinBusy(false);
          });
      } else if (alreadyHaveCode) {
        setOpenJoinCode(latest.openJoinCode);
        void refreshJoinRequests(canonicalId);
      }
    }

    const poll = setInterval(() => {
      void refreshRoster(canonicalId).then((people) => {
        if (!active || !people) return;
        syncRosterIntoPlan(people);
      });
      if (!isMember) void refreshJoinRequests(canonicalId);
    }, 5000);

    return () => {
      active = false;
      clearInterval(poll);
    };
  }, [visible, plan.id, refreshJoinRequests, refreshRoster]);

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
              <TravelSurfaceCard bodyStyle={styles.openJoinCard}>
                <View style={[styles.joinHeader, { gap: rs.sm }]}>
                  <View
                    style={[
                      styles.joinIcon,
                      {
                        width: Math.max(36, s(36)),
                        height: Math.max(36, s(36)),
                        borderRadius: radii.pill,
                        backgroundColor: chrome.icons.link.bg,
                      },
                    ]}>
                    <Symbol name="link" size="sm" color={chrome.icons.link.fg} />
                  </View>
                  <View style={styles.joinHeaderCopy}>
                    <AppText variant="subheading" fit numberOfLines={1}>
                      Join Link
                    </AppText>
                    <AppText variant="caption" color="secondary" fit numberOfLines={1}>
                      Anyone can request to join.
                    </AppText>
                  </View>
                </View>

                {openJoinUrl ? (
                  <View
                    style={[
                      styles.urlField,
                      {
                        backgroundColor: chrome.fieldBg,
                        borderColor: chrome.fieldBorder,
                        minHeight: Math.max(44, s(44)),
                        paddingLeft: rs.md,
                        gap: rs.sm,
                      },
                    ]}>
                    <AppText
                      variant="caption"
                      color="secondary"
                      fit
                      numberOfLines={1}
                      style={styles.urlText}
                      selectable>
                      {displayJoinLink(plan.title, openJoinUrl)}
                    </AppText>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Copy open join link"
                      hitSlop={8}
                      disabled={!openJoinCode || openJoinBusy}
                      onPress={() => {
                        haptics.tap();
                        void copyOpenJoinLink();
                      }}
                      style={({ pressed }) => [
                        styles.urlCopy,
                        {
                          width: Math.max(40, s(40)),
                          height: Math.max(40, s(40)),
                          opacity: pressed ? 0.6 : 1,
                        },
                      ]}>
                      <Symbol
                        name="copy"
                        size="sm"
                        color={copiedOpenJoin ? chrome.ctaFrom : chrome.label}
                      />
                    </Pressable>
                  </View>
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
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Copy open join link"
                    disabled={!openJoinCode || openJoinBusy}
                    onPress={() => {
                      haptics.tap();
                      void copyOpenJoinLink();
                    }}
                    style={({ pressed }) => [
                      styles.joinAction,
                      {
                        backgroundColor: chrome.fieldBg,
                        borderColor: chrome.fieldBorder,
                        minHeight: Math.max(44, s(48)),
                        opacity: !openJoinCode || openJoinBusy ? 0.45 : pressed ? 0.72 : 1,
                      },
                    ]}>
                    <Symbol name="link" size="sm" color={chrome.label} />
                    <AppText variant="callout" fit numberOfLines={1}>
                      {copiedOpenJoin ? 'Copied' : 'Copy Link'}
                    </AppText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Share open join link"
                    disabled={!openJoinCode || openJoinBusy}
                    onPress={() => {
                      haptics.tap();
                      void shareOpenJoin();
                    }}
                    style={({ pressed }) => [
                      styles.joinAction,
                      {
                        backgroundColor: chrome.fieldBg,
                        borderColor: chrome.fieldBorder,
                        minHeight: Math.max(44, s(48)),
                        opacity: !openJoinCode || openJoinBusy ? 0.45 : pressed ? 0.72 : 1,
                      },
                    ]}>
                    <Symbol name="share" size="sm" color={chrome.label} />
                    <AppText variant="callout" fit numberOfLines={1}>
                      Share
                    </AppText>
                  </Pressable>
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
    <TravelRemoveConfirmModal
      payload={removeConfirm}
      onCancel={() => setRemoveConfirm(null)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  openJoinCard: { gap: spacing.md },
  joinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  joinIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  joinHeaderCopy: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    gap: 2,
  },
  urlField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  urlText: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  urlCopy: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  linksSection: { gap: spacing.sm },
  linkCard: { gap: spacing.sm },
  linkActions: { flexDirection: 'row', gap: spacing.sm },
  linkAction: { flex: 1, minWidth: 0 },
  joinAction: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
  },
});
