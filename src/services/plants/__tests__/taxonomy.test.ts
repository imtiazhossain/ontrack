import { fallbackPlantTaxa, normalizePlantTaxa } from '@/services/plants/taxonomy';

describe('plant taxonomy search', () => {
  it('keeps plant taxa and ranks exact common-name matches first', () => {
    const results = normalizePlantTaxa({ results: [
      { id: 1, name: 'Alpinia purpurata', preferred_common_name: 'Red Ginger', rank: 'species', iconic_taxon_name: 'Plantae' },
      { id: 2, name: 'Zingiber officinale', preferred_common_name: 'Ginger', rank: 'species', iconic_taxon_name: 'Plantae' },
      { id: 3, name: 'Gingera insecta', preferred_common_name: 'Ginger bug', rank: 'species', iconic_taxon_name: 'Insecta' },
    ] }, 'ginger');

    expect(results).toEqual([
      expect.objectContaining({ commonName: 'Ginger', scientificName: 'Zingiber officinale' }),
      expect.objectContaining({ commonName: 'Red Ginger', scientificName: 'Alpinia purpurata' }),
    ]);
  });

  it('provides common houseplants while offline', () => {
    expect(fallbackPlantTaxa('ging')).toContainEqual(expect.objectContaining({ scientificName: 'Zingiber officinale' }));
  });
});
