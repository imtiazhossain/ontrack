import type { ActivityDraft } from '@/store/schedule';
import { addDays } from '@/utils/date';

import type { TravelItemKind, TravelPlan } from './types';

const ITEM_ICON: Record<TravelItemKind, string> = {
  flight: '✈️',
  stay: '🛏️',
  activity: '📍',
};

export function travelCalendarDrafts(plan: TravelPlan): ActivityDraft[] {
  const overviews: ActivityDraft[] = [];
  let dayNumber = 1;
  for (let date = plan.startDate; date <= plan.endDate; date = addDays(date, 1)) {
    overviews.push({
      date,
      title: `✈️ Day ${dayNumber} · ${plan.title}`,
      categoryId: 'personal',
      startMinutes: 9 * 60,
      durationMinutes: 60,
      travelPlanId: plan.id,
      notes: [
        `${plan.destination} · ${plan.startDate} to ${plan.endDate}`,
        plan.notes,
      ]
        .filter(Boolean)
        .join('\n'),
    });
    dayNumber += 1;
  }

  return [
    ...overviews,
    ...plan.itinerary.map((item) => {
      const flightRoute = item.flight
        ? [item.flight.departureAirport, item.flight.arrivalAirport]
            .filter(Boolean)
            .join(' → ')
        : undefined;
      const flightNumber = item.flight
        ? [item.flight.airline, item.flight.flightNumber].filter(Boolean).join(' · ')
        : undefined;
      const confirmation = item.flight?.confirmationCode
        ? `Confirmation: ${item.flight.confirmationCode}`
        : undefined;
      const seat = item.flight?.seat ? `Seat: ${item.flight.seat}` : undefined;
      return {
        date: item.date,
        title: `${ITEM_ICON[item.kind]} ${item.title}`,
        categoryId: 'personal',
        startMinutes: item.startMinutes,
        durationMinutes: item.durationMinutes,
        travelPlanId: plan.id,
        travelItemId: item.id,
        notes: [
          plan.title,
          plan.destination,
          flightRoute,
          flightNumber,
          confirmation,
          seat,
          item.details,
          item.bookingUrl,
        ]
          .filter(Boolean)
          .join('\n'),
      };
    }),
  ];
}
