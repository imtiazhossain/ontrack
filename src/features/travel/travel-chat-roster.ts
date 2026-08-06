import { travelChatAccessCode } from '@/features/travel/chat';
import { isTravelMemberPlan } from '@/features/travel/trip-roster';
import type {
  TravelChatMember,
} from '@/features/travel/travel-chat-chrome';
import type { TravelPlan, TravelTripRosterPerson } from '@/features/travel/types';
import { newId } from '@/utils/id';

/**
 * Chat capability from local plan fields, or recovered from the live server
 * roster when a member lost `chatAccessCode` / a host never wrote acceptedAt.
 */
export function resolveTravelChatAccessFromRoster(input: {
  plan: TravelPlan;
  roster: TravelTripRosterPerson[];
  selfUserId?: string;
}): string | undefined {
  const existing = travelChatAccessCode(input.plan);
  if (existing) return existing;
  if (!input.selfUserId || input.roster.length === 0) return undefined;

  const me = input.roster.find((person) => person.userId === input.selfUserId);
  if (!me) return undefined;

  if (me.role === 'member' || me.role === 'cohost') {
    return me.inviteCode;
  }

  const accepted = input.roster
    .filter(
      (person) =>
        (person.role === 'member' || person.role === 'cohost') &&
        person.inviteCode &&
        person.acceptedAt,
    )
    .sort((a, b) => (b.acceptedAt ?? '').localeCompare(a.acceptedAt ?? ''));
  return accepted[0]?.inviteCode;
}

/** Overlapping chat header discs — prefer roster so custom avatars resolve. */
export function resolveTravelChatMembersFromRoster(input: {
  roster: TravelTripRosterPerson[];
  selfUserId?: string;
  selfDisplayName: string;
  fallback: TravelChatMember[];
}): TravelChatMember[] {
  if (input.roster.length === 0) return input.fallback;

  const selfName = input.selfDisplayName.trim() || 'Trip member';
  const ordered = [...input.roster].sort((a, b) => {
    const aSelf = a.userId === input.selfUserId ? 0 : 1;
    const bSelf = b.userId === input.selfUserId ? 0 : 1;
    if (aSelf !== bSelf) return aSelf - bSelf;
    if (a.role === 'host' && b.role !== 'host') return -1;
    if (b.role === 'host' && a.role !== 'host') return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  return ordered.map((person) => {
    const isSelf = Boolean(input.selfUserId && person.userId === input.selfUserId);
    return {
      id: person.userId,
      name: isSelf ? selfName : person.displayName,
      userId: person.userId,
      isSelf,
    };
  });
}

/**
 * Persist recovered chat access + accepted friends so chat stays unlocked
 * without reopening Co-Travelers. Never writes `chatAccessCode` onto a host
 * plan (that flag marks member copies).
 */
export function planPatchFromTravelChatRoster(input: {
  plan: TravelPlan;
  roster: TravelTripRosterPerson[];
  selfUserId?: string;
  accessCode?: string;
}): TravelPlan | undefined {
  const { plan, roster, selfUserId, accessCode } = input;
  if (roster.length === 0) return undefined;

  const me = selfUserId
    ? roster.find((person) => person.userId === selfUserId)
    : undefined;
  const memberCopy =
    me?.role === 'member' ||
    me?.role === 'cohost' ||
    (!me && isTravelMemberPlan(plan));

  let next: TravelPlan = plan;
  let changed = false;

  if (memberCopy && accessCode && plan.chatAccessCode !== accessCode) {
    next = { ...next, chatAccessCode: accessCode };
    changed = true;
  }

  const host = roster.find((person) => person.role === 'host');
  if (
    memberCopy &&
    host?.displayName &&
    next.hostDisplayName !== host.displayName
  ) {
    next = { ...next, hostDisplayName: host.displayName };
    changed = true;
  }

  if (!memberCopy) {
    const now = new Date().toISOString();
    let participants = next.participants;
    for (const member of roster) {
      if (member.role !== 'member' && member.role !== 'cohost') continue;
      if (!member.inviteCode || !member.acceptedAt) continue;
      const index = participants.findIndex(
        (person) =>
          person.inviteCode === member.inviteCode ||
          (member.email &&
            person.email &&
            person.email.toLowerCase() === member.email.toLowerCase()),
      );
      if (index >= 0) {
        const current = participants[index]!;
        if (
          current.acceptedAt === member.acceptedAt &&
          current.name === member.displayName
        ) {
          continue;
        }
        changed = true;
        participants = participants.map((person, i) =>
          i === index
            ? {
                ...person,
                name: member.displayName,
                acceptedAt: member.acceptedAt,
                ...(member.email ? { email: member.email } : {}),
              }
            : person,
        );
        continue;
      }
      changed = true;
      participants = [
        ...participants,
        {
          id: newId('trip-person'),
          name: member.displayName,
          ...(member.email ? { email: member.email } : {}),
          inviteCode: member.inviteCode,
          invitedAt: member.acceptedAt ?? now,
          acceptedAt: member.acceptedAt ?? now,
        },
      ];
    }
    if (participants !== next.participants) {
      next = { ...next, participants };
    }
  }

  if (!changed) return undefined;
  return { ...next, updatedAt: new Date().toISOString() };
}
