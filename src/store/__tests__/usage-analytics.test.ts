import {
  pendingUploadDelta,
  useUsageAnalytics,
} from '../usage-analytics';

describe('usage analytics store', () => {
  beforeEach(() => {
    useUsageAnalytics.getState().resetLocal();
  });

  it('records sessions and surface dwell, and computes upload deltas', () => {
    const store = useUsageAnalytics.getState();
    store.recordSessionStart(1_700_000_000_000);
    store.recordActiveMs('travel', 5_000, 1_700_000_000_000);
    store.recordActiveMs('today', 2_000, 1_700_000_000_000);

    const dayKey = Object.keys(useUsageAnalytics.getState().days)[0]!;
    const day = useUsageAnalytics.getState().days[dayKey]!;
    expect(day.sessionCount).toBe(1);
    expect(day.activeMs).toBe(7_000);
    expect(day.surfaces.travel).toBe(5_000);

    const delta = pendingUploadDelta(day);
    expect(delta?.activeMs).toBe(7_000);
    expect(delta?.surfaces.travel).toBe(5_000);

    useUsageAnalytics.getState().markUploaded(dayKey, delta!);
    expect(pendingUploadDelta(useUsageAnalytics.getState().days[dayKey]!)).toBeUndefined();
  });
});
