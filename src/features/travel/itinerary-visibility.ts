import type {
  TravelFlightDetails,
  TravelFlightLeg,
  TravelItineraryItem,
  TravelItemShareMode,
  TravelRentalDetails,
  TravelStayDetails,
  TravelTransportDetails,
} from '@/features/travel/types';
import { asString } from '@/utils/parse';

export const TRAVEL_ITEM_SHARE_MODES: readonly TravelItemShareMode[] = [
  'private',
  'trip',
  'selected',
] as const;

export function isTravelItemShareMode(value: unknown): value is TravelItemShareMode {
  return (
    value === 'private' || value === 'trip' || value === 'selected'
  );
}

export function normalizeTravelItemShareMode(
  value: unknown,
): TravelItemShareMode {
  return isTravelItemShareMode(value) ? value : 'private';
}

export function normalizeSharedWithUserIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const ids = Array.from(
    new Set(
      value.flatMap((entry) => {
        const id = typeof entry === 'string' ? entry.trim() : '';
        return id ? [id] : [];
      }),
    ),
  );
  return ids.length ? ids : undefined;
}

/** Owner for visibility: explicit owner, else treat as local/self. */
export function itineraryItemOwnerUserId(
  item: Pick<TravelItineraryItem, 'ownerUserId'>,
  localUserId: string | undefined,
): string | undefined {
  const owner = item.ownerUserId?.trim();
  if (owner) return owner;
  return localUserId?.trim() || undefined;
}

export function isItineraryItemOwnedBy(
  item: Pick<TravelItineraryItem, 'ownerUserId'>,
  viewerUserId: string | undefined,
): boolean {
  const viewer = viewerUserId?.trim();
  if (!viewer) {
    // Unsigned-in local plans: items without a foreign owner are "mine".
    return !item.ownerUserId?.trim();
  }
  const owner = itineraryItemOwnerUserId(item, viewer);
  return owner === viewer;
}

export function canViewerSeeItineraryItem(
  item: Pick<
    TravelItineraryItem,
    'ownerUserId' | 'shareMode' | 'sharedWithUserIds'
  >,
  viewerUserId: string | undefined,
): boolean {
  if (isItineraryItemOwnedBy(item, viewerUserId)) return true;
  const mode = normalizeTravelItemShareMode(item.shareMode);
  if (mode === 'private') return false;
  if (mode === 'trip') return true;
  const viewer = viewerUserId?.trim();
  if (!viewer) return false;
  return (item.sharedWithUserIds ?? []).includes(viewer);
}

export function visibleItineraryForViewer(
  items: TravelItineraryItem[],
  viewerUserId: string | undefined,
): TravelItineraryItem[] {
  return items.filter((item) => canViewerSeeItineraryItem(item, viewerUserId));
}

function stripFlightSecrets(
  details: TravelFlightDetails | undefined,
): TravelFlightDetails | undefined {
  if (!details) return undefined;
  const {
    confirmationCode: _confirmationCode,
    seat: _seat,
    confirmationUris: _confirmationUris,
    passengerName: _passengerName,
    ...rest
  } = details;
  const legs = rest.legs?.map((leg): TravelFlightLeg => ({ ...leg }));
  return {
    ...rest,
    ...(legs?.length ? { legs } : {}),
  };
}

function stripRentalSecrets(
  details: TravelRentalDetails | undefined,
): TravelRentalDetails | undefined {
  if (!details) return undefined;
  const {
    confirmationCode: _confirmationCode,
    confirmationUris: _confirmationUris,
    ...rest
  } = details;
  return rest;
}

function stripStaySecrets(
  details: TravelStayDetails | undefined,
): TravelStayDetails | undefined {
  if (!details) return undefined;
  const {
    confirmationCode: _confirmationCode,
    reservationEmail: _reservationEmail,
    confirmationUris: _confirmationUris,
    notes: _notes,
    ...rest
  } = details;
  return Object.keys(rest).length ? rest : undefined;
}

function stripTransportSecrets(
  details: TravelTransportDetails | undefined,
): TravelTransportDetails | undefined {
  return details;
}

/**
 * Shape stored in `travel_trip_itinerary_items.payload` — schedule/route safe
 * for co-travelers; strips confirmation codes, seats, booking URLs, and local media.
 */
export function compactSharedItineraryPayload(
  item: TravelItineraryItem,
): TravelItineraryItem {
  const shareMode = normalizeTravelItemShareMode(item.shareMode);
  const sharedWithUserIds =
    shareMode === 'selected'
      ? normalizeSharedWithUserIds(item.sharedWithUserIds)
      : undefined;

  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    date: item.date,
    startMinutes: item.startMinutes,
    durationMinutes: item.durationMinutes,
    details: asString(item.details),
    // bookingUrl / photoUris omitted from shared payload
    ownerUserId: item.ownerUserId,
    shareMode,
    ...(sharedWithUserIds ? { sharedWithUserIds } : {}),
    sharedUpdatedAt: item.sharedUpdatedAt,
    flight: item.kind === 'flight' ? stripFlightSecrets(item.flight) : undefined,
    transport:
      item.kind === 'transport'
        ? stripTransportSecrets(item.transport)
        : undefined,
    rental: item.kind === 'rental' ? stripRentalSecrets(item.rental) : undefined,
    stay: item.kind === 'stay' ? stripStaySecrets(item.stay) : undefined,
  };
}

/** Merge remote shared fields into a local owned item without dropping secrets. */
export function mergeOwnedItineraryItemWithRemote(
  local: TravelItineraryItem,
  remote: TravelItineraryItem,
): TravelItineraryItem {
  return {
    ...local,
    shareMode: normalizeTravelItemShareMode(remote.shareMode ?? local.shareMode),
    sharedWithUserIds:
      normalizeSharedWithUserIds(remote.sharedWithUserIds) ??
      local.sharedWithUserIds,
    sharedUpdatedAt: remote.sharedUpdatedAt ?? local.sharedUpdatedAt,
    ownerUserId: remote.ownerUserId ?? local.ownerUserId,
  };
}

/**
 * Prefer newer `sharedUpdatedAt`. When equal/missing, prefer `preferLocal`.
 */
export function pickNewerItineraryItem(
  local: TravelItineraryItem | undefined,
  remote: TravelItineraryItem,
  preferLocalWhenTied = true,
): TravelItineraryItem {
  if (!local) return remote;
  const localAt = local.sharedUpdatedAt?.trim() ?? '';
  const remoteAt = remote.sharedUpdatedAt?.trim() ?? '';
  if (localAt && remoteAt) {
    if (remoteAt > localAt) return remote;
    if (localAt > remoteAt) return local;
    return preferLocalWhenTied ? local : remote;
  }
  if (remoteAt && !localAt) return remote;
  if (localAt && !remoteAt) return local;
  return preferLocalWhenTied ? local : remote;
}
