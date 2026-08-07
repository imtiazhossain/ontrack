import { useUI } from '@/store/ui';

describe('tab bar stays locked open on page interaction', () => {
  beforeEach(() => {
    useUI.setState({
      tabBarCollapsed: false,
      carouselBrowse: {
        anchorRouteName: 'workouts',
        centerRouteName: 'plants',
      },
      carouselSwipeClaimed: true,
      carouselPendingRouteName: 'plants',
      lastPageInteractionAt: 0,
    });
  });

  it('clears carousel browse without collapsing the nav', () => {
    useUI.getState().notifyPageInteraction();

    const state = useUI.getState();
    expect(state.tabBarCollapsed).toBe(false);
    expect(state.carouselBrowse).toBeNull();
    expect(state.carouselSwipeClaimed).toBe(false);
    expect(state.carouselPendingRouteName).toBeNull();
    expect(state.lastPageInteractionAt).toBeGreaterThan(0);
  });
});
