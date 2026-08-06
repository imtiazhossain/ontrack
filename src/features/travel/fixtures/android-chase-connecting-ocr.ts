/**
 * Android ML Kit-style OCR for the Chase GUA→IAH→LGA itinerary.
 * Common failure: first leg + layover + second departure/flight read cleanly,
 * but the final arrival line ("New York, US (LGA)") is dropped or unordered.
 * The header summary still carries the true destination.
 */
export const ANDROID_CHASE_CONNECTING_OCR_MISSING_FINAL = `
  Flight details
  Guatemala City (GUA) → New
  York (LGA)
  Sun, Sep 27, 2026
  1 Traveler
  1:30 am
  Guatemala City, GT (GUA)
  La Aurora International Airport
  United Airlines
  UA 1907
  Boeing 737-800 Passenger
  2h 51m
  5:21 am
  Houston, US (IAH)
  George Bush Intercontinental Airport
  1h 39m layover in Houston
  7:00 am
  Houston, US (IAH)
  George Bush Intercontinental Airport
  United Airlines
  UA 1697
  Boeing 737 MAX 8
  3h 29m
  Basic Economy
`;

/**
 * Truncated screenshot OCR: only the first flight number + layover survived,
 * but the itinerary header still shows GUA → LGA.
 */
export const ANDROID_CHASE_CONNECTING_OCR_FIRST_LEG_ONLY = `
  Flight details
  Guatemala City (GUA) → New York (LGA)
  Sun, Sep 27, 2026
  1:30 am
  Guatemala City, GT (GUA)
  United Airlines
  UA 1907
  2h 51m
  5:21 am
  Houston, US (IAH)
  1h 39m layover in Houston
`;
