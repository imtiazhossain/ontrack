import { calculateFlightArrival, formatFlightItineraryCaption } from '@/features/travel/flight-arrival';
import type { TravelItineraryItem } from '@/features/travel/types';
import { formatDateKeyShort, formatDuration, formatMinutes, type DateDisplayFormat } from '@/utils/date';

/** Action phase shown as a distinct timeline marker. */
export type TravelTimelinePhase =
  | 'board'
  | 'land'
  | 'pickup'
  | 'dropoff'
  | 'checkin'
  | 'checkout'
  | 'default';

export type TravelTimelineEntry = {
  /** Stable key for list rendering / expand state (`itemId` or `itemId:phase`). */
  key: string;
  item: TravelItineraryItem;
  phase: TravelTimelinePhase;
  date: string;
  startMinutes: number;
  title: string;
};

const PHASE_TITLE: Record<Exclude<TravelTimelinePhase, 'default'>, string> = {
  board: 'Board Flight',
  land: 'Land',
  pickup: 'Pick Up Car',
  dropoff: 'Drop Off Car',
  checkin: 'Check In',
  checkout: 'Check Out',
};

function flightRoute(item: TravelItineraryItem): string | undefined {
  const route = [item.flight?.departureAirport, item.flight?.arrivalAirport]
    .filter(Boolean)
    .join(' → ');
  return route || undefined;
}

function expandItem(item: TravelItineraryItem): TravelTimelineEntry[] {
  if (item.kind === 'flight') {
    const arrival = calculateFlightArrival({
      date: item.date,
      startMinutes: item.startMinutes,
      durationMinutes: item.durationMinutes,
      departureAirport: item.flight?.departureAirport,
      arrivalAirport: item.flight?.arrivalAirport,
    });
    const board: TravelTimelineEntry = {
      key: `${item.id}:board`,
      item,
      phase: 'board',
      date: item.date,
      startMinutes: item.startMinutes,
      title: PHASE_TITLE.board,
    };
    const land: TravelTimelineEntry = {
      key: `${item.id}:land`,
      item,
      phase: 'land',
      date: arrival.date,
      startMinutes: arrival.startMinutes,
      title: PHASE_TITLE.land,
    };
    return [board, land];
  }

  if (item.kind === 'rental') {
    const pickup: TravelTimelineEntry = {
      key: `${item.id}:pickup`,
      item,
      phase: 'pickup',
      date: item.date,
      startMinutes: item.startMinutes,
      title: PHASE_TITLE.pickup,
    };
    const dropoffDate = item.rental?.dropoffDate;
    const dropoffMinutes = item.rental?.dropoffMinutes;
    if (!dropoffDate && dropoffMinutes === undefined) {
      return [pickup];
    }
    const dropoff: TravelTimelineEntry = {
      key: `${item.id}:dropoff`,
      item,
      phase: 'dropoff',
      date: dropoffDate ?? item.date,
      startMinutes: dropoffMinutes ?? item.startMinutes,
      title: PHASE_TITLE.dropoff,
    };
    return [pickup, dropoff];
  }

  if (item.kind === 'stay') {
    const checkin: TravelTimelineEntry = {
      key: `${item.id}:checkin`,
      item,
      phase: 'checkin',
      date: item.date,
      startMinutes: item.startMinutes,
      title: PHASE_TITLE.checkin,
    };
    const checkoutDate = item.stay?.checkoutDate;
    const checkoutMinutes = item.stay?.checkoutMinutes;
    if (!checkoutDate && checkoutMinutes === undefined) {
      return [checkin];
    }
    const checkout: TravelTimelineEntry = {
      key: `${item.id}:checkout`,
      item,
      phase: 'checkout',
      date: checkoutDate ?? item.date,
      startMinutes: checkoutMinutes ?? item.startMinutes,
      title: PHASE_TITLE.checkout,
    };
    return [checkin, checkout];
  }

  return [
    {
      key: item.id,
      item,
      phase: 'default',
      date: item.date,
      startMinutes: item.startMinutes,
      title: item.title,
    },
  ];
}

/** Expand flights/rentals into board/land and pick-up/drop-off markers, sorted. */
export function expandTimelineEntries(
  items: TravelItineraryItem[],
): TravelTimelineEntry[] {
  return items
    .flatMap(expandItem)
    .sort((left, right) => {
      const byDate = left.date.localeCompare(right.date);
      if (byDate !== 0) return byDate;
      return left.startMinutes - right.startMinutes;
    });
}

export function groupTimelineEntriesByDate(
  entries: TravelTimelineEntry[],
): { date: string; entries: TravelTimelineEntry[] }[] {
  const map = new Map<string, TravelTimelineEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.date) ?? [];
    list.push(entry);
    map.set(entry.date, list);
  }
  return [...map.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, dayEntries]) => ({
      date,
      entries: [...dayEntries].sort(
        (a, b) => a.startMinutes - b.startMinutes,
      ),
    }));
}

export function timelineEntryCaption(
  entry: TravelTimelineEntry,
  dateDisplayFormat: DateDisplayFormat,
): string {
  const { item, phase } = entry;
  const dateLabel = formatDateKeyShort(entry.date, dateDisplayFormat);
  const time = formatMinutes(entry.startMinutes);

  if (phase === 'board') {
    const route = flightRoute(item);
    const duration = formatDuration(item.durationMinutes);
    return [dateLabel, time, route, duration].filter(Boolean).join(' · ');
  }

  if (phase === 'land') {
    const airport = item.flight?.arrivalAirport;
    return [dateLabel, time, airport].filter(Boolean).join(' · ');
  }

  if (phase === 'pickup') {
    const location = item.rental?.pickupLocation;
    return [dateLabel, time, location].filter(Boolean).join(' · ');
  }

  if (phase === 'dropoff') {
    const location = item.rental?.dropoffLocation || item.rental?.pickupLocation;
    return [dateLabel, time, location].filter(Boolean).join(' · ');
  }

  if (phase === 'checkin' || phase === 'checkout') {
    return [dateLabel, time, item.title].filter(Boolean).join(' · ');
  }

  // Default: preserve full captions used in Flights / Rentals sections.
  if (item.kind === 'moment') {
    return `${dateLabel} · ${formatMinutes(item.startMinutes)}`;
  }
  if (item.kind === 'flight') {
    return formatFlightItineraryCaption({
      date: item.date,
      dateLabel: formatDateKeyShort(item.date, dateDisplayFormat),
      startMinutes: item.startMinutes,
      durationMinutes: item.durationMinutes,
      departureAirport: item.flight?.departureAirport,
      arrivalAirport: item.flight?.arrivalAirport,
    });
  }
  if (item.kind === 'rental') {
    const pickup = `${formatDateKeyShort(item.date, dateDisplayFormat)} · ${formatMinutes(item.startMinutes)}`;
    if (!item.rental?.dropoffDate && item.rental?.dropoffMinutes === undefined) {
      return pickup;
    }
    const dropoffDate = item.rental.dropoffDate
      ? formatDateKeyShort(item.rental.dropoffDate, dateDisplayFormat)
      : undefined;
    const dropoffTime =
      item.rental.dropoffMinutes !== undefined
        ? formatMinutes(item.rental.dropoffMinutes)
        : undefined;
    const dropoff = [dropoffDate, dropoffTime].filter(Boolean).join(' · ');
    return dropoff ? `${pickup} → ${dropoff}` : pickup;
  }
  if (item.kind === 'stay') {
    const checkin = `${formatDateKeyShort(item.date, dateDisplayFormat)} · ${formatMinutes(item.startMinutes)}`;
    if (!item.stay?.checkoutDate && item.stay?.checkoutMinutes === undefined) {
      return checkin;
    }
    const checkoutDate = item.stay.checkoutDate
      ? formatDateKeyShort(item.stay.checkoutDate, dateDisplayFormat)
      : undefined;
    const checkoutTime =
      item.stay.checkoutMinutes !== undefined
        ? formatMinutes(item.stay.checkoutMinutes)
        : undefined;
    const checkout = [checkoutDate, checkoutTime].filter(Boolean).join(' · ');
    return checkout ? `${checkin} → ${checkout}` : checkin;
  }
  return `${dateLabel} · ${formatMinutes(item.startMinutes)} · ${item.durationMinutes} min`;
}
