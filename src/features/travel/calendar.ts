import type { ActivityDraft } from '@/store/schedule';
import { addDays } from '@/utils/date';

import type { TravelItemKind, TravelPlan } from './types';

const ITEM_ICON: Record<Exclude<TravelItemKind, 'moment'>, string> = {
  flight: '✈️',
  stay: '🛏️',
  activity: '📍',
  rental: '🚗',
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
    ...plan.itinerary.flatMap((item) => {
      if (item.kind === 'moment') return [];
      const icon = ITEM_ICON[item.kind];
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
      return [
        {
          date: item.date,
          title: `${icon} ${item.title}`,
          categoryId: 'personal' as const,
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
        },
      ];
    }),
  ];
}
