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

  it('returns Lisbon bridge / Belém landmark draws', () => {
    const queries = resolveIconicCoverQueries('Lisbon, Portugal', 'Trip');
    expect(queries.some((q) => /Ponte 25 de Abril|Belém/i.test(q))).toBe(true);
    expect(resolveIconicCoverQueries('Porto, Portugal', '')).toEqual([]);
  });

  it('returns a multi-landmark Guatemala pool', () => {
    const queries = resolveIconicCoverQueries('Guatemala', 'Guatemala boys trip');
    expect(queries.length).toBeGreaterThanOrEqual(6);
    expect(queries.some((q) => /Atitlan|Atitlán/i.test(q))).toBe(true);
    expect(queries.some((q) => /Tikal/i.test(q))).toBe(true);
  });
});
