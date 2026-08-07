import { resolveTravelSkyGroundKind } from '@/features/travel/travel-sky-ground-kind';

describe('resolveTravelSkyGroundKind', () => {
  it('maps Reykjavík / Iceland to the nordic ground (church + town)', () => {
    expect(resolveTravelSkyGroundKind('Reykjavík, Iceland')).toBe('nordic');
    expect(resolveTravelSkyGroundKind('Iceland')).toBe('nordic');
    expect(resolveTravelSkyGroundKind('Akureyri')).toBe('nordic');
  });

  it('maps climate and city families', () => {
    expect(resolveTravelSkyGroundKind('Bali, Indonesia')).toBe('tropical');
    expect(resolveTravelSkyGroundKind('Dubai, UAE')).toBe('desert');
    expect(resolveTravelSkyGroundKind('Zermatt, Switzerland')).toBe('alpine');
    expect(resolveTravelSkyGroundKind('New York, NY')).toBe('metro');
    expect(resolveTravelSkyGroundKind('Lisbon, Portugal')).toBe('coastal');
    expect(resolveTravelSkyGroundKind('Nashville, TN')).toBe('pastoral');
  });

  it('uses latitude when the label is unknown', () => {
    expect(resolveTravelSkyGroundKind('Somewhere', 10)).toBe('tropical');
    expect(resolveTravelSkyGroundKind('Somewhere', 64)).toBe('nordic');
  });
});
