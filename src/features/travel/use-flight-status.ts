import { useCallback, useState } from 'react';

import type { Theme } from '@/design-system';

import { lookupFlightData } from './flight-status-client';
import type {
  FlightOperationalStatus,
  FlightStatusInput,
} from './flights/types';

export type FlightStatusRequest = {
  input: FlightStatusInput;
  /** Flight number shown beside the status when a journey has several legs. */
  label?: string;
};

export type FlightLegStatus = {
  label?: string;
  status?: FlightOperationalStatus;
  /** Provider-authored status copy, e.g. `On time` / `Delayed`. */
  statusLabel?: string;
  departureTerminal?: string;
  departureGate?: string;
  arrivalTerminal?: string;
  arrivalGate?: string;
};

export type FlightStatusLookup = {
  /** At least one leg has enough data (flight number + date) to look up. */
  available: boolean;
  loading: boolean;
  checked: boolean;
  /** Results aligned with the requests passed in, so legs keep their slot. */
  legs: (FlightLegStatus | undefined)[];
  /** Card-level summary, e.g. `UA 1907: Boarding · UA 1697: Scheduled`. */
  summary?: string;
  /** Most urgent status across legs, for badge tone. */
  status?: FlightOperationalStatus;
  error?: string;
  check: () => void;
};

/** Highest number wins when a journey mixes leg statuses. */
const STATUS_URGENCY: Record<FlightOperationalStatus, number> = {
  unknown: 0,
  scheduled: 1,
  'check-in': 2,
  landed: 3,
  approaching: 4,
  departed: 5,
  boarding: 6,
  'gate-closed': 7,
  delayed: 8,
  diverted: 9,
  cancelled: 10,
};

export type FlightStatusTone = 'neutral' | 'positive' | 'caution' | 'critical';

export function flightStatusTone(
  status?: FlightOperationalStatus,
): FlightStatusTone {
  if (!status || status === 'unknown') return 'neutral';
  if (status === 'cancelled' || status === 'diverted') return 'critical';
  if (status === 'delayed' || status === 'gate-closed') return 'caution';
  return 'positive';
}

export function flightStatusToneColor(
  tone: FlightStatusTone,
  theme: Theme,
): string {
  return {
    neutral: theme.textSecondary,
    positive: theme.success,
    caution: theme.warning,
    critical: theme.danger,
  }[tone];
}

function mostUrgent(
  legs: (FlightLegStatus | undefined)[],
): FlightOperationalStatus | undefined {
  return legs.reduce<FlightOperationalStatus | undefined>((worst, leg) => {
    if (!leg?.status) return worst;
    if (!worst) return leg.status;
    return STATUS_URGENCY[leg.status] > STATUS_URGENCY[worst]
      ? leg.status
      : worst;
  }, undefined);
}

/**
 * Shared per-leg flight-status lookup. The journey card owns this state so the
 * booking panel badge, the terminal/gate chips, and the single status control
 * all read the same result.
 */
export function useFlightStatus(
  requests: (FlightStatusRequest | undefined)[],
): FlightStatusLookup {
  const [state, setState] = useState<{
    loading: boolean;
    checked: boolean;
    legs: (FlightLegStatus | undefined)[];
    error?: string;
  }>({ loading: false, checked: false, legs: [] });
  const available = requests.some(Boolean);

  const check = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: undefined }));
    void (async () => {
      const settled = await Promise.all(
        requests.map(async (request) => {
          if (!request) return undefined;
          try {
            const result = await lookupFlightData({
              ...request.input,
              mode: 'status',
            });
            return {
              label: request.label,
              status: result.status,
              statusLabel: result.statusLabel,
              departureTerminal: result.departureTerminal,
              departureGate: result.departureGate,
              arrivalTerminal: result.arrivalTerminal,
              arrivalGate: result.arrivalGate,
            } satisfies FlightLegStatus;
          } catch (error) {
            return {
              label: request.label,
              status: undefined,
              errorMessage:
                error instanceof Error ? error.message : 'Status unavailable.',
            } as FlightLegStatus & { errorMessage?: string };
          }
        }),
      );
      const failure = settled.find(
        (leg): leg is FlightLegStatus & { errorMessage: string } =>
          Boolean(leg && 'errorMessage' in leg && leg.errorMessage),
      );
      setState({
        loading: false,
        checked: true,
        legs: settled,
        ...(settled.some((leg) => leg?.status)
          ? {}
          : { error: failure?.errorMessage ?? 'Status unavailable right now.' }),
      });
    })();
  }, [requests]);

  const labels = state.legs.flatMap((leg) =>
    leg?.statusLabel
      ? [leg.label ? `${leg.label}: ${leg.statusLabel}` : leg.statusLabel]
      : [],
  );

  return {
    available,
    loading: state.loading,
    checked: state.checked,
    legs: state.legs,
    ...(labels.length ? { summary: labels.join(' · ') } : {}),
    ...(state.error ? { error: state.error } : {}),
    status: mostUrgent(state.legs),
    check,
  };
}
