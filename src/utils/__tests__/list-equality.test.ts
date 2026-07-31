import { listReferenceEquality } from '@/utils/list-equality';

describe('listReferenceEquality', () => {
  it('treats identical references as equal', () => {
    const a = [{ id: 1 }, { id: 2 }];
    expect(listReferenceEquality(a, a)).toBe(true);
  });

  it('treats same-length arrays with same item refs as equal', () => {
    const x = { id: 1 };
    const y = { id: 2 };
    expect(listReferenceEquality([x, y], [x, y])).toBe(true);
  });

  it('detects replaced items and length changes', () => {
    const x = { id: 1 };
    const y = { id: 2 };
    expect(listReferenceEquality([x], [x, y])).toBe(false);
    expect(listReferenceEquality([x, y], [x, { id: 2 }])).toBe(false);
  });
});
