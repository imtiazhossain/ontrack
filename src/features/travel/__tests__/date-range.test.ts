import { validateTravelDateRange } from '../date-range';
import type { TravelItineraryItem } from '../types';

const FLIGHT: TravelItineraryItem = {
  id: 'flight-1',
  kind: 'flight',
  title: 'Flight home',
  date: '2026-09-14',
  startMinutes: 600,
  durationMinutes: 180,
};

describe('travel date range validation', () => {
  it('accepts a valid range containing the itinerary', () => {
    expect(validateTravelDateRange('2026-09-08', '2026-09-14', [FLIGHT])).toEqual({
      conflicts: [],
    });
  });

  it('rejects a return before departure', () => {
    expect(validateTravelDateRange('2026-09-15', '2026-09-14').error).toBe(
      'The return date must be on or after departure.',
    );
  });

  it('identifies itinerary items outside a shortened range', () => {
    const result = validateTravelDateRange('2026-09-08', '2026-09-12', [FLIGHT]);

    expect(result.conflicts).toEqual([FLIGHT]);
    expect(result.error).toContain('Flight home');
  });
});
