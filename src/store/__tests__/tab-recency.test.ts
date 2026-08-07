import { useTabRecency } from '../tab-recency';

describe('tab-recency store', () => {
  beforeEach(() => {
    useTabRecency.setState({ lastFocusedAt: {} });
  });

  it('records focus timestamps for known tab routes', () => {
    useTabRecency.getState().recordTabFocus('travel', 1000);
    useTabRecency.getState().recordTabFocus('to-do', 2000);
    expect(useTabRecency.getState().lastFocusedAt).toEqual({
      travel: 1000,
      'to-do': 2000,
    });
  });

  it('ignores unknown route names', () => {
    useTabRecency.getState().recordTabFocus('not-a-tab', 1000);
    expect(useTabRecency.getState().lastFocusedAt).toEqual({});
  });

  it('does not rewrite state when the tab is already most recent', () => {
    useTabRecency.getState().recordTabFocus('travel', 1000);
    useTabRecency.getState().recordTabFocus('to-do', 2000);
    const before = useTabRecency.getState().lastFocusedAt;
    useTabRecency.getState().recordTabFocus('to-do', 3000);
    expect(useTabRecency.getState().lastFocusedAt).toBe(before);
  });
});
