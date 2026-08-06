import type { CoTravelerAvatarPerson } from '@/features/travel/travel-cotraveler-stack';
import { isTravelMemberPlan } from '@/features/travel/trip-roster';
import type { TravelPlan } from '@/features/travel/types';

/**
 * People for the trip-card co-traveler stack.
 * Host plans: self + invitees. Member copies: self + host (hostDisplayName)
 * so the host is visible even when local participants are empty.
 */
export function resolveTravelCoTravelerPeople(
  plan: TravelPlan,
  selfDisplayName: string,
): CoTravelerAvatarPerson[] {
  const selfName = selfDisplayName.trim() || 'You';
  const people: CoTravelerAvatarPerson[] = [
    { id: `${plan.id}-self`, name: selfName, isSelf: true },
  ];

  if (isTravelMemberPlan(plan)) {
    const hostName = plan.hostDisplayName?.trim();
    if (hostName && hostName.toLowerCase() !== selfName.toLowerCase()) {
      people.push({
        id: `${plan.id}-host`,
        name: hostName,
      });
    }
  }

  const seen = new Set(
    people.map((person) => person.name.trim().toLowerCase()).filter(Boolean),
  );
  for (const person of plan.participants) {
    const name = person.name.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    people.push({ id: person.id, name });
  }

  return people;
}
