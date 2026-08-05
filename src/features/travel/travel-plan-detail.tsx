import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState, Screen } from '@/components/primitives';
import { useAuthSession } from '@/features/auth/auth-provider';
import type { StayBookingOpen } from '@/features/travel/booking-open';
import { travelCalendarDrafts } from '@/features/travel/calendar';
import {
    type ExpenseFormState,
} from '@/features/travel/expenses/expense-form';
import {
    TravelImportResult,
} from '@/features/travel/travel-import-result-modal';
import { TravelPlanDetailBody } from '@/features/travel/travel-plan-detail-body';
import {
    useTravelPlanDetailExpenseImport,
} from '@/features/travel/travel-plan-detail-expense-import';
import { TravelPlanDetailOverlays } from '@/features/travel/travel-plan-detail-overlays';
import {
    type DetailSectionKey,
    sectionDefaultExpanded,
} from '@/features/travel/travel-plan-detail-sections';
import { useTravelPageStyle } from '@/features/travel/travel-surface';
import { expandTimelineEntries } from '@/features/travel/travel-timeline-entries';
import type { TravelItemKind, TravelPlan } from '@/features/travel/types';
import { useTravelPlanConfirmationImports } from '@/features/travel/use-travel-plan-confirmation-imports';
import { useTravelPlanDetailAddForm } from '@/features/travel/use-travel-plan-detail-add-form';
import { useTravelPlanDetailAddItem } from '@/features/travel/use-travel-plan-detail-add-item';
import { useTravelPlanDetailEffects } from '@/features/travel/use-travel-plan-detail-effects';
import { buildTravelPlanDetailItemHandlers } from '@/features/travel/use-travel-plan-detail-item-handlers';
import { useTravelPlanItemDetailsEdit } from '@/features/travel/use-travel-plan-item-details-edit';
import { useTravelPlanItemMedia } from '@/features/travel/use-travel-plan-item-media';
import { useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/store/preferences';
import { useSchedule } from '@/store/schedule';
import { useTravel } from '@/store/travel';

type TravelPlanDetailProps = {
  planId: string;
  initialAddKind?: TravelItemKind;
  /** DEV: open the timeline kind chooser after navigating to a trip. */
  initialOpenAddPicker?: boolean;
  /** DEV: open the first trivago stay booking sheet after mount. */
  autoOpenStayBooking?: boolean;
  /** DEV: reservation email override when account email is unavailable. */
  autoOpenReservationEmail?: string;
  /** DEV: open the Expenses sheet on mount for simulator QA. */
  initialOpenExpenses?: boolean;
  /** DEV: open an import-result sheet on mount for simulator QA. */
  initialImportResult?: TravelImportResult;
  /** DEV: prefill Add Flight from a known confirmation fixture (no document picker). */
  initialFlightImportFixture?: 'roundtrip';
};

export function TravelPlanDetail(props: TravelPlanDetailProps) {
  const theme = useTheme();
  const travelStyle = useTravelPageStyle(theme);
  const plan = useTravel((state) =>
    state.plans.find((item) => item.id === props.planId),
  );
  if (!plan) {
    return (
      <Screen style={travelStyle}>
        <EmptyState
          icon="flight"
          title="Trip Not Found"
          message="This trip may have been removed on another device."
        />
      </Screen>
    );
  }
  return <TravelPlanDetailLoaded {...props} plan={plan} />;
}

function TravelPlanDetailLoaded({
  planId,
  plan,
  initialAddKind,
  initialOpenAddPicker = false,
  autoOpenStayBooking = false,
  autoOpenReservationEmail,
  initialOpenExpenses = false,
  initialImportResult,
  initialFlightImportFixture,
}: TravelPlanDetailProps & { plan: TravelPlan }) {
  const theme = useTheme();
  const travelStyle = useTravelPageStyle(theme);
  const savePlan = useTravel((state) => state.savePlan);
  const replaceTravelActivities = useSchedule(
    (state) => state.replaceTravelActivities,
  );
  const dateDisplayFormat = usePreferences((state) => state.dateDisplayFormat);
  const { user } = useAuthSession();
  const accountEmail = user?.email?.trim().toLowerCase() || undefined;
  const itinerary = Array.isArray(plan.itinerary) ? plan.itinerary : [];

  const updatePlan = (next: TravelPlan) => {
    const saved = savePlan(next);
    if (!saved) return;
    replaceTravelActivities(next.id, travelCalendarDrafts(next));
  };
  const form = useTravelPlanDetailAddForm({
    plan,
    initialAddKind,
    initialOpenAddPicker,
    accountEmail,
  });
  const [devBookingOpen, setDevBookingOpen] = useState<Extract<
    StayBookingOpen,
    { mode: 'webview' }
  > | null>(null);
  useTravelPlanDetailEffects({
    planId,
    plan,
    form,
    updatePlan,
    accountEmail,
    initialFlightImportFixture,
    autoOpenStayBooking,
    autoOpenReservationEmail,
    setDevBookingOpen,
  });

  const itemEdit = useTravelPlanItemDetailsEdit({ plan, itinerary, updatePlan });
  const itemMedia = useTravelPlanItemMedia({
    planId,
    plan,
    itinerary,
    updatePlan,
  });
  const [openExpenseSheet, setOpenExpenseSheet] = useState(initialOpenExpenses);
  const [editingTripDates, setEditingTripDates] = useState(false);
  const [expenseDraft, setExpenseDraft] = useState<ExpenseFormState>();
  const [preparedExpenseDraft, setPreparedExpenseDraft] =
    useState<ExpenseFormState>();
  const [importResult, setImportResult] = useState<TravelImportResult | null>(
    initialImportResult ?? null,
  );
  const expenseImport = useTravelPlanDetailExpenseImport({
    kind: form.kind,
    preparedExpenseDraft,
    setPreparedExpenseDraft,
    setExpenseDraft,
    setOpenExpenseSheet,
    setImportResult,
  });

  const goToItinerarySafely = () => {
    setOpenExpenseSheet(false);
    setExpenseDraft(undefined);
    setPreparedExpenseDraft(undefined);
    setImportResult(null);
    expenseImport.importResultExpenseRef.current = null;
    form.setIsAddingItem(false);
    form.setIsChoosingAddKind(false);
    itemMedia.clearAddPhotos();
    itemMedia.setRemoveConfirm(null);
    setDevBookingOpen(null);
  };

  const confirmationImports = useTravelPlanConfirmationImports({
    plan,
    updatePlan,
    accountEmail,
    navigation: {
      onOpenExpenseDraft: (_planId, draft) => {
        setExpenseDraft(draft);
        setOpenExpenseSheet(true);
      },
      onPrepareExpenseDraft: (_planId, draft) => setPreparedExpenseDraft(draft),
      onGoToItinerary: goToItinerarySafely,
    },
    addSheet: {
      date: form.date,
      startMinutes: form.startMinutes,
      setTitle: form.setTitle,
      setDetails: form.setDetails,
      setBookingUrl: form.setBookingUrl,
      setDate: form.setDate,
      setStartMinutes: form.setStartMinutes,
      setEndDate: form.setEndDate,
      setEndMinutes: form.setEndMinutes,
      setDuration: form.setDuration,
      setKind: form.setKind,
      setIsAddingItem: form.setIsAddingItem,
      setError: form.setError,
      setFlightDetails: form.setFlightDetails,
      setFlightDetailsError: form.setFlightDetailsError,
      setImportedFlightFileName: form.setImportedFlightFileName,
      setFlightTripType: form.setFlightTripType,
      setReturnFlightTitle: form.setReturnFlightTitle,
      setReturnFlightDetails: form.setReturnFlightDetails,
      setReturnFlightSchedule: form.setReturnFlightSchedule,
      setPendingFlightImport: form.setPendingFlightImport,
      setRentalDetails: form.setRentalDetails,
      setRentalDetailsError: form.setRentalDetailsError,
      setImportedRentalFileName: form.setImportedRentalFileName,
      setStayDetails: form.setStayDetails,
      setStayDetailsError: form.setStayDetailsError,
      setImportedStayFileName: form.setImportedStayFileName,
    },
    edit: {
      setEditingFlightItemId: itemEdit.setEditingFlightItemId,
      setEditedFlightDetails: itemEdit.setEditedFlightDetails,
      setEditedFlightDetailsError: itemEdit.setEditedFlightDetailsError,
      setEditedFlightFileName: itemEdit.setEditedFlightFileName,
      setEditingRentalItemId: itemEdit.setEditingRentalItemId,
      setEditedRentalDetailsError: itemEdit.setEditedRentalDetailsError,
      setEditingStayItemId: itemEdit.setEditingStayItemId,
      setEditedStayDetails: itemEdit.setEditedStayDetails,
      setEditedStayDetailsError: itemEdit.setEditedStayDetailsError,
      setEditedStayFileName: itemEdit.setEditedStayFileName,
    },
  });
  const { addItem } = useTravelPlanDetailAddItem({
    planId,
    plan,
    form,
    dateDisplayFormat,
    updatePlan,
    setExpenseDraft,
    setOpenExpenseSheet,
    maybeShowImportedAddPrompt: expenseImport.maybeShowImportedAddPrompt,
  });

  const [minimizedItemIds, setMinimizedItemIds] = useState<Set<string>>();
  const [sectionExpanded, setSectionExpanded] = useState<
    Partial<Record<DetailSectionKey, boolean>>
  >({});
  const [collapsedDayDates, setCollapsedDayDates] = useState<Set<string>>(
    () => new Set(),
  );
  const sortedItinerary = [...itinerary].sort(
    (left, right) =>
      left.date.localeCompare(right.date) ||
      left.startMinutes - right.startMinutes,
  );
  const transportCounts = {
    flights: sortedItinerary.filter((item) => item.kind === 'flight').length,
    ground: sortedItinerary.filter((item) => item.kind === 'transport').length,
    stays: sortedItinerary.filter((item) => item.kind === 'stay').length,
    rentals: sortedItinerary.filter((item) => item.kind === 'rental').length,
  };
  const isSectionExpanded = (key: DetailSectionKey) =>
    sectionExpanded[key] ?? sectionDefaultExpanded(key, transportCounts);
  const toggleSection = (key: DetailSectionKey) => {
    setSectionExpanded((current) => ({
      ...current,
      [key]: !(current[key] ?? sectionDefaultExpanded(key, transportCounts)),
    }));
  };
  const defaultCollapsedItemIds = () =>
    new Set([
      ...itinerary.map((item) => item.id),
      ...expandTimelineEntries(itinerary).map((entry) => entry.key),
    ]);
  const collapsedItemIds = minimizedItemIds ?? defaultCollapsedItemIds();
  const toggleItineraryItem = (itemId: string) => {
    setMinimizedItemIds((current) => {
      const next = new Set(current ?? defaultCollapsedItemIds());
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };
  const toggleDay = (date: string) => {
    setCollapsedDayDates((current) => {
      const next = new Set(current);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };
  const itemEditHandlers = buildTravelPlanDetailItemHandlers({
    planId,
    plan,
    minimizedItemIds: collapsedItemIds,
    dateDisplayFormat,
    itemEdit,
    itemMedia,
    confirmationImports,
    onToggle: toggleItineraryItem,
    updatePlan,
    setExpenseDraft,
    setOpenExpenseSheet,
  });
  const chooseAddKind = (kind: TravelItemKind) =>
    form.chooseAddKind(kind, () =>
      setSectionExpanded((current) => ({ ...current, timeline: true })),
    );
  const cancelAddToTimeline = () =>
    form.cancelAddToTimeline(confirmationImports.importInProgressRef, () =>
      setPreparedExpenseDraft(undefined),
    );

  return (
    <View style={styles.root}>
      <TravelPlanDetailBody
        plan={plan}
        travelStyle={travelStyle}
        dateDisplayFormat={dateDisplayFormat}
        sortedItinerary={sortedItinerary}
        itemEditHandlers={itemEditHandlers}
        collapsedDayDates={collapsedDayDates}
        isSectionExpanded={isSectionExpanded}
        toggleSection={toggleSection}
        onToggleDay={toggleDay}
        onAddPress={() => form.setIsChoosingAddKind(true)}
        onEditDates={() => setEditingTripDates(true)}
      />
      <TravelPlanDetailOverlays
        plan={plan}
        itinerary={itinerary}
        form={form}
        confirmationImports={confirmationImports}
        itemMedia={itemMedia}
        editingTripDates={editingTripDates}
        setEditingTripDates={setEditingTripDates}
        openExpenseSheet={openExpenseSheet}
        setOpenExpenseSheet={setOpenExpenseSheet}
        expenseDraft={expenseDraft}
        setExpenseDraft={setExpenseDraft}
        importResult={importResult}
        setImportResult={setImportResult}
        importResultExpenseRef={expenseImport.importResultExpenseRef}
        devBookingOpen={devBookingOpen}
        setDevBookingOpen={setDevBookingOpen}
        updatePlan={updatePlan}
        chooseAddKind={chooseAddKind}
        cancelAddToTimeline={cancelAddToTimeline}
        addItem={addItem}
        goToItinerarySafely={goToItinerarySafely}
        openImportedExpenseReview={expenseImport.openImportedExpenseReview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
