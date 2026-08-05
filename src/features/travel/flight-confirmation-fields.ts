/**
 * Descriptive (non-schedule) fields lifted out of a flight confirmation:
 * equipment and who is traveling. Airports, times, terminals, and gates stay
 * with the itinerary parsing in `flight-confirmation-parser`.
 */

function firstMatch(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

export function findAircraft(text: string): string | undefined {
  const value = firstMatch(text, [
    /(?:aircraft|equipment)\s*[:#-]?\s*([^\n]{3,48})/i,
    /^\s*((?:Boeing|Airbus|Embraer|Bombardier|Canadair|McDonnell Douglas)\s+[A-Za-z0-9][A-Za-z0-9 .\-/]{0,32})\s*$/im,
  ]);
  return value?.replace(/\s+/g, ' ') || undefined;
}

/** Lead traveler + party size, which apply to the whole booking. */
export function findPassenger(text: string): {
  passengerName?: string;
  passengerCount?: string;
} {
  // Keyword matching is case-insensitive; the name itself must stay capitalized.
  const name = "([A-Z][A-Za-z.'’-]+(?:\\s+[A-Z][A-Za-z.'’-]+){1,3})";
  const passengerName = firstMatch(text, [
    new RegExp(
      `(?:[Pp]assenger|[Tt]raveller?)(?:\\s+[Nn]ame)?\\s*[:#-]\\s*${name}\\b`,
    ),
    new RegExp(`\\b[Nn]ame\\s*[:#-]\\s*${name}\\b`),
  ]);
  const count =
    /\b(\d{1,2})\s+(?:passengers?|travelers?|travellers?|adults?|guests?)\b/i.exec(
      text,
    ) ??
    /\b(?:passengers?|travelers?|travellers?|adults?|guests?)\s*[:#-]\s*(\d{1,2})\b/i.exec(
      text,
    );
  return {
    ...(passengerName ? { passengerName: passengerName.replace(/\s+/g, ' ') } : {}),
    ...(count ? { passengerCount: count[1] } : {}),
  };
}
