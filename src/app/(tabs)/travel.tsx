import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    NativeScrollEvent,
    NativeSyntheticEvent,
    ScrollView,
    StyleSheet,
    View,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState, Screen, appPrompt, useSafeAreaChrome } from '@/components/primitives';
import { spacing } from '@/design-system';
import { resolveSelfDisplayName } from '@/features/account/self-display-name';
import { useAuthSession } from '@/features/auth/auth-provider';
import { applyImportedFlightsToPlan } from '@/features/travel/apply-imported-flights';
import { isTravelPlanOnCalendar, travelCalendarDrafts } from '@/features/travel/calendar';
import { validateTravelDateRange } from '@/features/travel/date-range';
import { persistTravelCoverPhoto } from '@/features/travel/destination-cover';
import { currencyFromLocale } from '@/features/travel/expenses/format-money';
import { repairTravelPlansChatAccess } from '@/features/travel/travel-chat-roster';
import { resolveTravelCoTravelerPeople } from '@/features/travel/travel-cotraveler-people';
import { TravelFriendsSheet } from '@/features/travel/travel-friends-sheet';
import {
    TravelHomeBackground,
    travelHomeAtmosphereHeight,
} from '@/features/travel/travel-home-background';
import { TravelHomeHeader } from '@/features/travel/travel-home-header';
import { filterTravelPlansByQuery } from '@/features/travel/travel-home-plan-search';
import { TravelHomeSectionHeader } from '@/features/travel/travel-home-section-header';
import {
    travelHomeFontFamily,
    travelHomeTokens,
} from '@/features/travel/travel-home-tokens';
import { TravelHomeTripCard } from '@/features/travel/travel-home-trip-card';
import { TravelNewTripCard } from '@/features/travel/travel-new-trip-card';
import { validateTravelPlanDetails } from '@/features/travel/travel-plan-details';
import { TravelPlanDetailsEditor } from '@/features/travel/travel-plan-details-editor';
import { useTravelPageStyle } from '@/features/travel/travel-surface';
import type { TravelPlan, TravelPlanMode } from '@/features/travel/types';
import { useNewTripFlightImport } from '@/features/travel/use-new-trip-flight-import';
import { useTravelHomeAtmosphereImage } from '@/features/travel/use-travel-home-atmosphere-image';
import { useResponsive } from '@/hooks/use-responsive';
import { FeatureThemeProvider, useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/store/preferences';
import { useSchedule } from '@/store/schedule';
import { orderTravelPlansByRecency, useTravel } from '@/store/travel';
import { AgentTestId, AgentUiIds } from '@/utils/agent-ui';
import { toDateKey } from '@/utils/date';
import { newId } from '@/utils/id';

/** Primary travel planning tab — trip launcher (tools live on trip hub). */
export default function TravelScreen() {
  return (
    <FeatureThemeProvider feature="travel">
      <TravelScreenContent />
    </FeatureThemeProvider>
  );
}

function isCurrentOrUpcomingTrip(plan: TravelPlan, today: string): boolean {
  return plan.endDate >= today;
}

function TravelScreenContent() {
  const theme = useTheme();
  const travelStyle = useTravelPageStyle(theme);
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { editCover, tripId } = useLocalSearchParams<{
    editCover?: string;
    tripId?: string;
  }>();
  const { spacing: rs, s } = useResponsive();
  const { user } = useAuthSession();
  const plans = useTravel((state) => state.plans);
  const recentPlanIds = useTravel((state) => state.recentPlanIds);
  const recordPlanInteraction = useTravel((state) => state.recordPlanInteraction);
  const savePlan = useTravel((state) => state.savePlan);
  const removePlan = useTravel((state) => state.removePlan);
  const activities = useSchedule((state) => state.activities);
  const replaceTravelActivities = useSchedule((state) => state.replaceTravelActivities);
  const dateLocale = usePreferences((state) => state.dateLocale);
  const preferencesName = usePreferences((state) => state.name);
  const selfDisplayName = useMemo(
    () => resolveSelfDisplayName({ preferencesName, user }),
    [preferencesName, user],
  );
  const today = toDateKey(new Date());
  const [showForm, setShowForm] = useState(plans.length === 0);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<TravelPlanMode>('flight');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string>();
  const flightImport = useNewTripFlightImport({
    setMode,
    setOrigin,
    setDestination,
    setStartDate,
    setEndDate,
    setError,
  });
  const [editingDetailsPlanId, setEditingDetailsPlanId] = useState<string>();
  const [editTitle, setEditTitle] = useState('');
  const [editMode, setEditMode] = useState<TravelPlanMode>('flight');
  const [editOrigin, setEditOrigin] = useState('');
  const [editDestination, setEditDestination] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editCoverUri, setEditCoverUri] = useState<string | undefined>();
  const [detailsError, setDetailsError] = useState<string>();
  const [friendsPlanId, setFriendsPlanId] = useState<string>();
  const [friendsVisible, setFriendsVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const editScrollRef = useRef<ScrollView>(null);
  const tripOffsets = useRef<Record<string, number>>({});
  const [pendingCreatedTripId, setPendingCreatedTripId] = useState<string>();
  const [pendingFollowTripId, setPendingFollowTripId] = useState<string>();
  const [scrollTargetOffset, setScrollTargetOffset] = useState<number>();
  const [activeTripId, setActiveTripId] = useState<string>();
  const focusedTripId = typeof tripId === 'string' ? tripId : undefined;
  const scrollTargetTripId =
    pendingCreatedTripId ?? pendingFollowTripId ?? focusedTripId;

  const sortedPlans = useMemo(
    () => orderTravelPlansByRecency(plans, recentPlanIds),
    [plans, recentPlanIds],
  );
  const currentPlans = useMemo(
    () => sortedPlans.filter((plan) => isCurrentOrUpcomingTrip(plan, today)),
    [sortedPlans, today],
  );
  const pastPlans = useMemo(
    () => sortedPlans.filter((plan) => !isCurrentOrUpcomingTrip(plan, today)),
    [sortedPlans, today],
  );
  const launcherPlans = currentPlans.length > 0 ? currentPlans : pastPlans;
  const [tripSearchQuery, setTripSearchQuery] = useState('');
  const visibleLauncherPlans = useMemo(
    () => filterTravelPlansByQuery(launcherPlans, tripSearchQuery),
    [launcherPlans, tripSearchQuery],
  );
  const hasCurrentTrips = currentPlans.length > 0;

  useEffect(() => {
    if (!hasCurrentTrips) {
      setActiveTripId(undefined);
      return;
    }
    setActiveTripId((previous) => {
      if (previous && currentPlans.some((plan) => plan.id === previous)) {
        return previous;
      }
      return currentPlans[0]?.id;
    });
  }, [currentPlans, hasCurrentTrips]);

  const interactWithPlan = (planId: string) => {
    const alreadyFirst = sortedPlans[0]?.id === planId;
    recordPlanInteraction(planId);
    if (alreadyFirst) return;
    delete tripOffsets.current[planId];
    setScrollTargetOffset(undefined);
    setPendingFollowTripId(planId);
  };

  useEffect(() => {
    if (!showForm) return;
    setStartDate('');
    setEndDate('');
  }, [showForm]);

  useEffect(() => {
    if (!user?.id || plans.length === 0) return;
    let active = true;
    void repairTravelPlansChatAccess({
      plans: useTravel.getState().plans,
      savePlan: (plan) => {
        if (active) savePlan(plan);
      },
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user?.id, plans.length, savePlan]);

  useEffect(() => {
    if (
      !scrollTargetTripId ||
      !sortedPlans.some((plan) => plan.id === scrollTargetTripId)
    ) {
      return;
    }

    recordPlanInteraction(scrollTargetTripId);
    setShowForm(false);

    const offset = tripOffsets.current[scrollTargetTripId];
    if (offset === undefined) return;
    if (pendingCreatedTripId === scrollTargetTripId) {
      const timer = setTimeout(() => {
        scrollRef.current?.scrollTo({
          y: Math.max(0, offset - rs.sm),
          animated: true,
        });
        setPendingCreatedTripId(undefined);
      }, 100);
      return () => clearTimeout(timer);
    }
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, offset - rs.sm),
        animated: true,
      });
      if (pendingFollowTripId === scrollTargetTripId) {
        setPendingFollowTripId(undefined);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [
    pendingCreatedTripId,
    pendingFollowTripId,
    recordPlanInteraction,
    rs.sm,
    scrollTargetOffset,
    scrollTargetTripId,
    sortedPlans,
  ]);

  const rememberTripOffset = (planId: string, y: number) => {
    tripOffsets.current[planId] = y;
    if (planId !== scrollTargetTripId) return;
    setScrollTargetOffset((previous) => (previous === y ? previous : y));
  };

  const updateActiveTripFromScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    if (!hasCurrentTrips || currentPlans.length === 0) return;
    const y = event.nativeEvent.contentOffset.y;
    const anchor = y + 140;
    let nextId = currentPlans[0]?.id;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const plan of currentPlans) {
      const top = tripOffsets.current[plan.id];
      if (top === undefined) continue;
      const distance = Math.abs(top - anchor);
      if (distance < bestDistance) {
        bestDistance = distance;
        nextId = plan.id;
      }
    }
    if (nextId && nextId !== activeTripId) setActiveTripId(nextId);
  };

  const friendsPlan = sortedPlans.find((plan) => plan.id === friendsPlanId);
  const openFriends = (planId: string) => {
    interactWithPlan(planId);
    setFriendsPlanId(planId);
    setFriendsVisible(true);
  };
  const closeFriends = () => {
    appPrompt.dismiss();
    setFriendsVisible(false);
  };

  const openItinerary = (planId: string) => {
    interactWithPlan(planId);
    router.push({
      pathname: '/travel/[id]',
      params: { id: planId },
    } as never);
  };

  const creatingPlanRef = useRef(false);
  const createPlan = () => {
    if (creatingPlanRef.current) return;
    setError(undefined);
    const detailsValidation = validateTravelPlanDetails({
      title,
      destination,
      notes,
    });
    if (!detailsValidation.ok) return setError(detailsValidation.error);
    const validation = validateTravelDateRange(startDate, endDate);
    if (validation.error) return setError(validation.error);
    creatingPlanRef.current = true;
    const now = new Date().toISOString();
    const planId = newId('trip');
    const basePlan: TravelPlan = {
      id: planId,
      ...detailsValidation.value,
      mode,
      origin: origin.trim() || undefined,
      startDate,
      endDate,
      itinerary: [],
      participants: [],
      baseCurrency: currencyFromLocale(dateLocale),
      expenses: [],
      createdAt: now,
      updatedAt: now,
    };
    const withFlights = flightImport.pendingImport
      ? applyImportedFlightsToPlan({
          plan: basePlan,
          imported: flightImport.pendingImport,
          createId: () => newId('trip-item'),
        })
      : basePlan;
    const saved = savePlan(withFlights);
    if (!saved) {
      creatingPlanRef.current = false;
      setError(
        'Couldn’t create this trip. Your details are still here—please try again.',
      );
      return;
    }
    recordPlanInteraction(planId);
    setTitle('');
    setMode('flight');
    setOrigin('');
    setDestination('');
    setStartDate('');
    setEndDate('');
    setNotes('');
    flightImport.clearPendingImport();
    setPendingCreatedTripId(planId);
    setShowForm(false);
    creatingPlanRef.current = false;
  };

  const beginEditingDetails = (plan: TravelPlan) => {
    interactWithPlan(plan.id);
    setEditingDetailsPlanId(plan.id);
    setEditTitle(plan.title);
    setEditMode(plan.mode ?? 'flight');
    setEditOrigin(plan.origin ?? '');
    setEditDestination(plan.destination);
    setEditNotes(plan.notes ?? '');
    setEditStartDate(plan.startDate);
    setEditEndDate(plan.endDate);
    setEditCoverUri(plan.coverUri);
    setDetailsError(undefined);
  };

  const openCoverPickerOnEdit =
    __DEV__ && (editCover === '1' || editCover === 'true');
  useEffect(() => {
    if (!openCoverPickerOnEdit) return;
    const plan = sortedPlans[0];
    if (!plan || editingDetailsPlanId) return;
    beginEditingDetails(plan);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once for DEV deep link
  }, [openCoverPickerOnEdit, sortedPlans, editingDetailsPlanId]);

  const saveEditedDetails = async (plan: TravelPlan) => {
    setDetailsError(undefined);
    const validation = validateTravelPlanDetails({
      title: editTitle,
      destination: editDestination,
      notes: editNotes,
    });
    if (!validation.ok) return setDetailsError(validation.error);
    const dateValidation = validateTravelDateRange(
      editStartDate,
      editEndDate,
      plan.itinerary,
    );
    if (dateValidation.error) return setDetailsError(dateValidation.error);
    let coverUri = editCoverUri;
    if (coverUri && coverUri !== plan.coverUri) {
      try {
        coverUri = await persistTravelCoverPhoto(coverUri, plan.id);
      } catch {
        return setDetailsError('Couldn’t save the cover photo. Try another image.');
      }
    }
    const next: TravelPlan = {
      ...plan,
      ...validation.value,
      mode: editMode,
      origin: editOrigin.trim() || undefined,
      startDate: editStartDate,
      endDate: editEndDate,
      updatedAt: new Date().toISOString(),
    };
    if (coverUri) next.coverUri = coverUri;
    else delete next.coverUri;
    const isOnCalendar = isTravelPlanOnCalendar(activities, plan.id);
    savePlan(next);
    if (isOnCalendar) replaceTravelActivities(next.id, travelCalendarDrafts(next));
    setEditingDetailsPlanId(undefined);
  };

  const editingPlan = sortedPlans.find((plan) => plan.id === editingDetailsPlanId);

  useEffect(() => {
    if (!editingDetailsPlanId) return;
    const timer = setTimeout(() => {
      editScrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 500);
    return () => clearTimeout(timer);
  }, [editingDetailsPlanId]);

  const openCreateTrip = () => {
    setError(undefined);
    setShowForm(true);
  };

  const atmosphereDestinations = useMemo(
    () =>
      sortedPlans
        .map((plan) => plan.destination?.trim() || plan.title?.trim() || '')
        .filter((label) => label.length >= 2),
    [sortedPlans],
  );

  const atmosphereImage = useTravelHomeAtmosphereImage({
    enabled: true,
    tripDestinations: atmosphereDestinations,
  });

  // Paint atmosphere on the app-shell chrome so it fills the status-bar band
  // (in-screen absolute layers are clipped by SafeAreaView and can't).
  // Hero band only — mock fades into paper before Your Trips (not full-page).
  useSafeAreaChrome(atmosphereImage.skyColor, {
    backgroundImage: atmosphereImage.source,
    backgroundImageHeight: travelHomeAtmosphereHeight(windowHeight, insets.top),
    backgroundImageBlurRadius: travelHomeTokens.sizes.heroBlurRadius,
  });

  if (editingPlan) {
    return (
      <Screen
        key={`edit-trip-${editingPlan.id}`}
        scrollRef={editScrollRef}
        style={travelStyle}
        contentStyle={styles.screen}
        refresh={false}>
        <TravelPlanDetailsEditor
          plan={editingPlan}
          title={editTitle}
          mode={editMode}
          origin={editOrigin}
          destination={editDestination}
          notes={editNotes}
          onNotesChange={setEditNotes}
          startDate={editStartDate}
          endDate={editEndDate}
          coverUri={editCoverUri}
          error={detailsError}
          initialCoverPickerOpen={openCoverPickerOnEdit}
          onTitleChange={setEditTitle}
          onModeChange={setEditMode}
          onOriginChange={setEditOrigin}
          onDestinationChange={setEditDestination}
          onStartDateChange={setEditStartDate}
          onEndDateChange={setEditEndDate}
          onCoverUriChange={setEditCoverUri}
          onSave={() => void saveEditedDetails(editingPlan)}
          onCancel={() => setEditingDetailsPlanId(undefined)}
          onDelete={() => {
            removePlan(editingPlan.id);
            setEditingDetailsPlanId(undefined);
          }}
        />
      </Screen>
    );
  }

  return (
    <View style={styles.fill}>
      <TravelHomeBackground enabled />
      <Screen
        scrollRef={scrollRef}
        style={styles.transparentScreen}
        refresh={!showForm}
        onScroll={updateActiveTripFromScroll}
        contentStyle={{
          gap: travelHomeTokens.spacing.cardGap,
          // Sit the Travel header flush under the safe-area chrome (no cream gap).
          paddingTop: 0,
        }}>
        <TravelHomeHeader
          onAddTrip={!showForm ? openCreateTrip : undefined}
          locationLabel={atmosphereImage.label}
          headerInk={atmosphereImage.headerInk}
        />

        {showForm ? (
          <TravelNewTripCard
            title={title}
            mode={mode}
            origin={origin}
            destination={destination}
            startDate={startDate}
            endDate={endDate}
            notes={notes}
            error={error}
            importingItinerary={flightImport.importing}
            onTitleChange={setTitle}
            onModeChange={setMode}
            onOriginChange={setOrigin}
            onDestinationChange={setDestination}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onNotesChange={setNotes}
            onImportItinerary={() => void flightImport.importItinerary()}
            onCreate={createPlan}
            onClose={plans.length > 0 ? () => setShowForm(false) : undefined}
          />
        ) : null}

        {launcherPlans.length > 0 ? (
          <View
            style={{
              // Screen `gap` already contributes cardGap; add the rest so the
              // tagline→section band matches the reference atmosphere peek.
              // Keep spacing on a real View — AgentTestId omits its wrapper
              // when agent UI is disabled.
              marginTop: Math.max(
                0,
                s(travelHomeTokens.spacing.headerToSection) -
                  travelHomeTokens.spacing.cardGap,
              ),
              // May be negative so section→card can sit tighter than Screen cardGap.
              marginBottom:
                s(travelHomeTokens.spacing.sectionGap) -
                travelHomeTokens.spacing.cardGap,
            }}>
            <AgentTestId testID={AgentUiIds.travel.list.sectionYourTrips}>
              <TravelHomeSectionHeader
                title="Your Trips"
                count={visibleLauncherPlans.length}
                searchQuery={tripSearchQuery}
                onSearchQueryChange={setTripSearchQuery}
              />
            </AgentTestId>
          </View>
        ) : !showForm ? (
          <EmptyState
            icon="flight"
            title="Your next adventure starts here."
            message="Add a trip to organize your itinerary, stays, activities, friends, and memories."
            actionLabel="Add Your First Trip"
            actionTestID={AgentUiIds.travel.list.emptyCreate}
            onAction={openCreateTrip}
            titleStyle={{ fontFamily: travelHomeFontFamily }}
            messageStyle={{ fontFamily: travelHomeFontFamily }}
          />
        ) : null}

        {launcherPlans.length > 0 &&
        visibleLauncherPlans.length === 0 &&
        tripSearchQuery.trim() ? (
          <AgentTestId testID={AgentUiIds.travel.list.emptySearch}>
            <EmptyState
              icon="search"
              title="No matching trips"
              message="Try a different title, destination, or note."
              titleStyle={{ fontFamily: travelHomeFontFamily }}
              messageStyle={{ fontFamily: travelHomeFontFamily }}
            />
          </AgentTestId>
        ) : null}

        {visibleLauncherPlans.map((plan, index) => (
          <TravelHomeTripCard
            key={plan.id}
            plan={plan}
            index={index}
            soloAtmosphereShadow={visibleLauncherPlans.length === 1}
            atmosphereAverageColor={atmosphereImage.averageColor}
            travelers={resolveTravelCoTravelerPeople(plan, selfDisplayName)}
            onOpenTrip={openItinerary}
            onViewItinerary={openItinerary}
            onEditTrip={(id) => {
              const next = sortedPlans.find((item) => item.id === id);
              if (next) beginEditingDetails(next);
            }}
            onViewTravelers={openFriends}
            onLayoutY={rememberTripOffset}
          />
        ))}

        {friendsPlan ? (
          <TravelFriendsSheet
            plan={friendsPlan}
            visible={friendsVisible}
            onClose={closeFriends}
            onSavePlan={savePlan}
          />
        ) : null}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  transparentScreen: {
    backgroundColor: 'transparent',
  },
  screen: { gap: spacing.md },
});
