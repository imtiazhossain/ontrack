export type DetailSectionKey =
  | 'tools'
  | 'transport'
  | 'flights'
  | 'ground'
  | 'stays'
  | 'rentals'
  | 'timeline';

export function sectionDefaultExpanded(
  key: DetailSectionKey,
  counts: { flights: number; ground: number; stays: number; rentals: number },
): boolean {
  switch (key) {
    case 'tools':
      // Start open so calendar / weather / chat stay one tap away.
      return true;
    case 'transport':
      return counts.flights + counts.ground + counts.stays + counts.rentals > 0;
    // Nested kinds stay open so empty-state CTAs remain discoverable.
    case 'flights':
    case 'ground':
    case 'stays':
    case 'rentals':
      return true;
    case 'timeline':
      return true;
  }
}
