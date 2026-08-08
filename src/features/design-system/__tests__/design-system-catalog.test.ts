import {
  DESIGN_CATALOG,
  DESIGN_CATALOG_GROUP_LABELS,
  DESIGN_CATALOG_GROUPS,
  catalogByFeature,
  catalogByGroup,
} from '../design-system-catalog';

describe('design-system catalog', () => {
  it('keeps unique element ids', () => {
    const ids = DESIGN_CATALOG.map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers every catalog group with a plain-language label', () => {
    const groups = new Set(DESIGN_CATALOG.map((el) => el.group));
    for (const group of DESIGN_CATALOG_GROUPS) {
      expect(groups.has(group)).toBe(true);
      expect(catalogByGroup()[group].length).toBeGreaterThan(0);
      expect(DESIGN_CATALOG_GROUP_LABELS[group].length).toBeGreaterThan(0);
    }
  });

  it('indexes features without dropping elements', () => {
    const byFeature = catalogByFeature();
    const counted = new Set<string>();
    for (const elements of Object.values(byFeature)) {
      for (const el of elements) counted.add(el.id);
    }
    const withUsage = DESIGN_CATALOG.filter((el) => el.usedBy.length > 0).map((el) => el.id);
    expect([...counted].sort()).toEqual([...withUsage].sort());
  });
});
