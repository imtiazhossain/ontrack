import { validateFlightConfirmationAIResult } from '@/services/travel/flight-confirmation-ai-server';

describe('flight confirmation AI validation', () => {
  it('requires exact source evidence before accepting an AI date', () => {
    const source = 'Depart Sun, Sep 27, 2026 at 1:30 AM from GUA to LGA';
    const result = validateFlightConfirmationAIResult(
      {
        itineraryDates: ['2026-09-27'],
        segments: [
          {
            departureAirport: 'GUA',
            arrivalAirport: 'LGA',
            departureDate: '2026-09-27',
            departureDateEvidence: 'Sun, Sep 27, 2026',
            departureMinutes: 90,
            departureTimeEvidence: '1:30 AM',
            arrivalDate: '2026-09-28',
            arrivalDateEvidence: 'Sep 28, 2026',
            arrivalMinutes: 300,
            confidence: 0.9,
          },
        ],
      },
      source,
    );

    expect(result.segments[0].departureDate).toBe('2026-09-27');
    expect(result.segments[0].departureMinutes).toBe(90);
    expect(result.segments[0].arrivalDate).toBeUndefined();
    expect(result.segments[0].arrivalMinutes).toBeUndefined();
  });
});
