import type { TravelPlan } from '@/features/travel/types';

/** Match trips by title, destination, origin, or notes (case-insensitive substring). */
export function filterTravelPlansByQuery(
  plans: readonly TravelPlan[],
  query: string,
): TravelPlan[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...plans];
  return plans.filter((plan) => {
    const haystack = [plan.title, plan.destination, plan.origin, plan.notes]
      .filter((part): part is string => Boolean(part?.trim()))
      .join('\n')
      .toLowerCase();
    return haystack.includes(needle);
  });
}
