import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { EmptyState, Screen, useSafeAreaChrome } from '@/components/primitives';
import { TravelScreenHeader } from '@/features/travel/travel-screen-header';
import {
  travelSafeAreaBackground,
  useTravelPageStyle,
} from '@/features/travel/travel-surface';
import { useRecoverReservedTravelPlan } from '@/features/travel/use-recover-reserved-travel-plan';
import { useTheme } from '@/hooks/use-theme';
import { useTravel } from '@/store/travel';
import { AgentUiIds } from '@/utils/agent-ui';

type TravelTripHubScreenProps = {
  planId: string;
};

/**
 * Legacy `/travel/<id>/hub` entry — trip tools now live on plan detail.
 * Redirects to the itinerary so deep links and openHub taps still land correctly.
 */
export function TravelTripHubScreen({ planId }: TravelTripHubScreenProps) {
  const theme = useTheme();
  const travelStyle = useTravelPageStyle(theme);
  useSafeAreaChrome(travelSafeAreaBackground(theme));
  const router = useRouter();
  useRecoverReservedTravelPlan(planId);
  const plan = useTravel((state) => state.plans.find((item) => item.id === planId));

  useEffect(() => {
    if (!planId || !plan) return;
    router.replace({
      pathname: '/travel/[id]',
      params: { id: planId },
    } as never);
  }, [plan, planId, router]);

  if (!plan) {
    return (
      <Screen style={travelStyle} refresh={false}>
        <TravelScreenHeader
          title="Trip"
          subtitle="Tools"
          onClose={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/travel' as never);
          }}
          closeAccessibilityLabel="Close trip tools"
          closeTestID={AgentUiIds.travel.hub.close}
        />
        <EmptyState
          icon="flight"
          title="Trip not found"
          message="This trip is no longer available."
          actionLabel="Back to Travel"
          actionTestID={AgentUiIds.travel.hub.backToTravel}
          onAction={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/travel' as never);
          }}
        />
      </Screen>
    );
  }

  return <Screen style={travelStyle} refresh={false} />;
}
