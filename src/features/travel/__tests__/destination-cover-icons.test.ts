import { resolveIconicCoverQueries } from '../destination-cover-icons';

describe('resolveIconicCoverQueries', () => {
  it('returns Iceland aurora / nature draws from Reykjavík destination', () => {
    const queries = resolveIconicCoverQueries('Reykjavík, Iceland', 'Trip');
    expect(queries.some((q) => /aurora|northern lights/i.test(q))).toBe(true);
    expect(queries.some((q) => /Gullfoss/i.test(q))).toBe(true);
  });

  it('returns empty for unknown places', () => {
    expect(resolveIconicCoverQueries('Nowhereville', '')).toEqual([]);
  });
});
