import { useIsFocused, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useTravel } from '@/store/travel';
import {
    isReservedAgentUiTripId,
    recoverMissingReservedTravelPlan,
} from '@/utils/agent-ui/fixtures';

/**
 * Reserved agent-ui trip routes after sandbox purge show Trip Not Found until
 * something moves navigation. Recover by re-seeding (sandbox still on) or
 * replacing to Travel (cold start / verify-both release).
 */
export function useRecoverReservedTravelPlan(planId: string | undefined): void {
  const router = useRouter();
  const isFocused = useIsFocused();
  const plan = useTravel((state) =>
    typeof planId === 'string'
      ? state.plans.find((item) => item.id === planId)
      : undefined,
  );

  useEffect(() => {
    // Prefetched stack screens can't use imperative router — wait for focus.
    if (!isFocused || !planId || plan) return;
    if (!isReservedAgentUiTripId(planId)) return;

    const recovered = recoverMissingReservedTravelPlan(planId);
    if (recovered) return;

    // agentUiNavigate may be unset before AgentUiRouteSync mounts (cold start).
    try {
      router.replace('/travel' as never);
    } catch {
      // Expo Router can throw if the navigator is not ready yet.
    }
  }, [isFocused, plan, planId, router]);
}
