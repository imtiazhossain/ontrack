export type DetailSectionKey =
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
    case 'transport':
      return counts.flights + counts.ground + counts.stays + counts.rentals > 0;
    case 'flights':
      return counts.flights > 0;
    case 'ground':
      return counts.ground > 0;
    case 'stays':
      return counts.stays > 0;
    case 'rentals':
      return counts.rentals > 0;
    case 'timeline':
      return true;
  }
}
