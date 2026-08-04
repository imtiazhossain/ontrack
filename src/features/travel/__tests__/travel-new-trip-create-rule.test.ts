import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('new trip creation feedback', () => {
  it('keeps the form open and renders an inline error when storage rejects a trip', () => {
    const travelTab = readFileSync(
      join(process.cwd(), 'src/app/(tabs)/travel.tsx'),
      'utf8',
    );
    const newTripCard = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-new-trip-card.tsx'),
      'utf8',
    );

    expect(travelTab).toMatch(/const saved = savePlan\(\{/);
    expect(travelTab).toMatch(
      /if \(!saved\) \{\s*setError\([\s\S]*?\);\s*return;\s*\}/,
    );
    expect(newTripCard).toContain(
      '{error ? <ErrorMessage message={error} /> : null}',
    );
  });

  it('disables pull-to-refresh while the form is open and targets the saved card', () => {
    const travelTab = readFileSync(
      join(process.cwd(), 'src/app/(tabs)/travel.tsx'),
      'utf8',
    );

    expect(travelTab).toContain('refresh={!showForm}');
    expect(travelTab).toContain('setPendingCreatedTripId(planId)');
    expect(travelTab).toContain('tripOffsets.current[scrollTargetTripId]');
  });

  it('starts each new trip with empty departure and return dates', () => {
    const travelTab = readFileSync(
      join(process.cwd(), 'src/app/(tabs)/travel.tsx'),
      'utf8',
    );

    expect(travelTab).toContain("const [startDate, setStartDate] = useState('')");
    expect(travelTab).toContain("const [endDate, setEndDate] = useState('')");
    expect(travelTab).toMatch(
      /setDestination\(''\);\s*setStartDate\(''\);\s*setEndDate\(''\);\s*setNotes\(''\);/,
    );
    expect(travelTab).toMatch(
      /useEffect\(\(\) => \{\s*if \(!showForm\) return;\s*setStartDate\(''\);\s*setEndDate\(''\);\s*\}, \[showForm\]\);/,
    );
  });

  it('labels dates as start and end only on the new-trip form', () => {
    const newTripCard = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-new-trip-card.tsx'),
      'utf8',
    );
    const dateRangeEditor = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-date-range-editor.tsx'),
      'utf8',
    );

    expect(newTripCard).toContain('startLabel="Start"');
    expect(newTripCard).toContain('endLabel="End"');
    expect(dateRangeEditor).toContain("startLabel = 'Departure'");
    expect(dateRangeEditor).toContain("endLabel = 'Return'");
  });
});
