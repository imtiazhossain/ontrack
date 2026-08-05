import * as Linking from 'expo-linking';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

import { resolveStayBookingOpen, type StayBookingOpen } from '@/features/travel/booking-open';
import { travelCalendarDrafts } from '@/features/travel/calendar';
import {
    attachOrphanedFlightConfirmationUris,
} from '@/features/travel/confirmation-uri-attach';
import { CHASE_ROUNDTRIP_CONFIRMATION } from '@/features/travel/fixtures/chase-roundtrip-confirmation';
import { mergeFlightConfirmationDraftDetails } from '@/features/travel/flight-confirmation-draft';
import type { ImportedFlightConfirmation } from '@/features/travel/flight-confirmation-import';
import { splitRoundTripDirections } from '@/features/travel/flight-confirmation-itinerary';
import { parseFlightConfirmation } from '@/features/travel/flight-confirmation-parser';
import {
    flightConfirmationSchedule,
    flightDirectionSchedule,
} from '@/features/travel/flight-confirmation-schedule';
import { emptyFlightDetailsDraft } from '@/features/travel/flight-details';
import {
    flightLegScheduleFromImported,
    returnFlightTitle as suggestReturnFlightTitle,
} from '@/features/travel/flight-roundtrip-draft';
import {
    applyFlightTerminalPatches,
    fetchFlightTerminalPatches,
} from '@/features/travel/flight-terminal-enrichment';
import { normalizeTravelPlan } from '@/features/travel/normalize';
import type { TravelPlan } from '@/features/travel/types';
import { upgradeLegacyConnectingFlights } from '@/features/travel/upgrade-legacy-connecting-flights';
import type { TravelPlanDetailAddForm } from '@/features/travel/use-travel-plan-detail-add-form';
import { newId, useSchedule } from '@/store/schedule';
import { useTravel } from '@/store/travel';
import {
    AGENT_UI_DEMO_CHASE_OUTBOUND_ID,
    AGENT_UI_DEMO_CHASE_RETURN_ID,
} from '@/utils/agent-ui/fixtures';

type DetailEffectsOptions = {
  planId: string;
  plan: TravelPlan;
  form: TravelPlanDetailAddForm;
  updatePlan: (plan: TravelPlan) => void;
  accountEmail?: string;
  initialFlightImportFixture?: 'roundtrip';
  autoOpenStayBooking?: boolean;
  autoOpenReservationEmail?: string;
  setDevBookingOpen: (
    target: Extract<StayBookingOpen, { mode: 'webview' }> | null,
  ) => void;
};

export function useTravelPlanDetailEffects({
  planId,
  plan,
  form,
  updatePlan,
  accountEmail,
  initialFlightImportFixture,
  autoOpenStayBooking = false,
  autoOpenReservationEmail,
  setDevBookingOpen,
}: DetailEffectsOptions) {
  useFocusEffect(
    useCallback(() => {
      const current = useTravel.getState().plans.find((item) => item.id === planId);
      const normalized = normalizeTravelPlan(current);
      if (
        current &&
        normalized &&
        JSON.stringify(normalized) !== JSON.stringify(current)
      ) {
        const next = { ...normalized, updatedAt: new Date().toISOString() };
        useTravel.getState().savePlan(next);
        const schedule = useSchedule.getState();
        if (
          schedule.activities.some((activity) => activity.travelPlanId === next.id)
        ) {
          schedule.replaceTravelActivities(next.id, travelCalendarDrafts(next));
        }
        return;
      }
      if (current) {
        const repaired = attachOrphanedFlightConfirmationUris(current, {
          allPlans: useTravel.getState().plans,
        });
        if (repaired) useTravel.getState().savePlan(repaired);
      }
    }, [planId]),
  );

  useEffect(() => {
    if (!__DEV__ || initialFlightImportFixture !== 'roundtrip') return;
    if (
      form.kind !== 'flight' ||
      !form.isAddingItem ||
      form.appliedFlightImportFixture.current
    ) {
      return;
    }
    form.appliedFlightImportFixture.current = true;
    const parsed = parseFlightConfirmation(CHASE_ROUNDTRIP_CONFIRMATION, {
      startDate: '2026-09-08',
      endDate: '2026-09-14',
    });
    const imported: ImportedFlightConfirmation = {
      ...parsed,
      fileName: 'FARHANA TASMIN has shared their trip details with you.pdf',
      confirmationUris: [],
      agentUiItemIds: [
        AGENT_UI_DEMO_CHASE_OUTBOUND_ID,
        AGENT_UI_DEMO_CHASE_RETURN_ID,
      ],
    };
    const directions = splitRoundTripDirections(imported.segments);
    const outboundSegments = directions?.outbound ?? imported.segments;
    const schedule = directions
      ? flightDirectionSchedule(directions.outbound, imported)
      : flightConfirmationSchedule(imported);
    form.setPendingFlightImport(imported);
    form.setFlightDetails((current) =>
      mergeFlightConfirmationDraftDetails(current, {
        ...imported,
        segments: outboundSegments,
      }),
    );
    form.setImportedFlightFileName(imported.fileName);
    form.setFlightTripType(directions ? 'round-trip' : 'one-way');
    if (directions) {
      const returnDetails = mergeFlightConfirmationDraftDetails(
        emptyFlightDetailsDraft(),
        { ...imported, segments: directions.returning },
      );
      form.setReturnFlightDetails(returnDetails);
      form.setReturnFlightSchedule(
        flightLegScheduleFromImported(
          flightDirectionSchedule(directions.returning, imported),
        ),
      );
      form.setReturnFlightTitle(
        directions.returning[0]?.title?.trim() ||
          suggestReturnFlightTitle(returnDetails),
      );
    }
    form.setTitle(
      directions
        ? outboundSegments[0]?.title || imported.title || ''
        : imported.title || '',
    );
    if (schedule.departureDate) form.setDate(schedule.departureDate);
    if (schedule.departureMinutes !== undefined) {
      form.setStartMinutes(schedule.departureMinutes);
    }
    if (schedule.durationMinutes !== undefined) {
      form.setDuration(String(schedule.durationMinutes));
    }
    if (schedule.arrivalDate) form.setEndDate(schedule.arrivalDate);
    if (schedule.arrivalMinutes !== undefined) {
      form.setEndMinutes(schedule.arrivalMinutes);
    }
  }, [form, initialFlightImportFixture]);

  useEffect(() => {
    if (!__DEV__) return;
    const tryOpenFromUrl = (url: string | null) => {
      if (!url || !/[?&]openStayBooking=(1|true)\b/.test(url)) return;
      const emailMatch = url.match(/[?&]reservationEmail=([^&]+)/i);
      const overrideEmail = emailMatch
        ? decodeURIComponent(emailMatch[1].replace(/\+/g, ' '))
        : undefined;
      const stayItem = plan.itinerary.find((item) => item.kind === 'stay');
      if (!stayItem) return;
      const resolved = resolveStayBookingOpen(stayItem, {
        fallbackEmail: overrideEmail || autoOpenReservationEmail || accountEmail,
      });
      if (resolved?.mode === 'webview') setDevBookingOpen(resolved);
    };
    void Linking.getInitialURL().then(tryOpenFromUrl);
    const sub = Linking.addEventListener('url', ({ url }) => tryOpenFromUrl(url));
    if (autoOpenStayBooking) {
      tryOpenFromUrl(
        `ontrack://travel/${planId}?openStayBooking=1${
          autoOpenReservationEmail
            ? `&reservationEmail=${encodeURIComponent(autoOpenReservationEmail)}`
            : ''
        }`,
      );
    }
    return () => sub.remove();
  }, [
    accountEmail,
    autoOpenReservationEmail,
    autoOpenStayBooking,
    plan,
    planId,
    setDevBookingOpen,
  ]);

  const terminalLookupFingerprintRef = useRef<string | undefined>(undefined);
  const terminalLookupFingerprint = plan.itinerary
    .filter((item) => item.kind === 'flight' && item.flight)
    .map((item) => {
      const flight = item.flight!;
      const legs = flight.legs?.length
        ? flight.legs
            .map((leg) =>
              [
                leg.flightNumber,
                leg.date,
                leg.departureTerminal,
                leg.arrivalTerminal,
              ].join(':'),
            )
            .join(',')
        : [
            flight.flightNumber,
            item.date,
            flight.departureTerminal,
            flight.arrivalTerminal,
          ].join(':');
      return `${item.id}:${legs}`;
    })
    .join('|');

  useEffect(() => {
    if (
      !terminalLookupFingerprint ||
      terminalLookupFingerprintRef.current === terminalLookupFingerprint
    ) {
      return;
    }
    terminalLookupFingerprintRef.current = terminalLookupFingerprint;
    let cancelled = false;
    void fetchFlightTerminalPatches(plan).then((patches) => {
      if (cancelled || !Object.keys(patches).length) return;
      const latest = useTravel.getState().plans.find((entry) => entry.id === plan.id);
      if (!latest) return;
      const next = applyFlightTerminalPatches(latest, patches);
      if (next) updatePlan(next);
    });
    return () => {
      cancelled = true;
    };
    // The fingerprint changes only when lookup-relevant fields change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id, terminalLookupFingerprint]);

  const legacyFingerprint = plan.itinerary
    .map((item) =>
      item.kind === 'flight'
        ? `${item.id}:${item.flight?.legs?.length ?? 0}:${item.durationMinutes}:${item.flight?.connectionArrivalMinutes ?? ''}`
        : item.id,
    )
    .join('|');
  useEffect(() => {
    const upgraded = upgradeLegacyConnectingFlights(plan, () => newId('trip-item'));
    if (upgraded) updatePlan(upgraded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id, legacyFingerprint]);
}
