import { tripHeroPlaceName } from '../trip-hero-place';

describe('tripHeroPlaceName', () => {
  it('uses the last comma segment for multi-part destinations', () => {
    expect(tripHeroPlaceName('Reykjavík, Iceland', 'Flight to Iceland')).toBe(
      'Iceland',
    );
  });

  it('uses the full destination when there is no comma', () => {
    expect(tripHeroPlaceName('Lisbon', 'Agent UI Demo')).toBe('Lisbon');
  });

  it('falls back to the trip title when destination is empty', () => {
    expect(tripHeroPlaceName('  ', 'Agent UI Demo')).toBe('Agent UI Demo');
  });
});
