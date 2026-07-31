import { useUI } from '@/store/ui';

describe('floating tab bar collapse via page interaction', () => {
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

  it('collapses the menu and clears carousel browse on page interaction', () => {
    useUI.getState().notifyPageInteraction();

    const state = useUI.getState();
    expect(state.tabBarCollapsed).toBe(true);
    expect(state.carouselBrowse).toBeNull();
    expect(state.carouselSwipeClaimed).toBe(false);
    expect(state.carouselPendingRouteName).toBeNull();
    expect(state.lastPageInteractionAt).toBeGreaterThan(0);
  });

  it('can expand again after a page-driven collapse', () => {
    useUI.getState().notifyPageInteraction();
    useUI.getState().setTabBarCollapsed(false);
    expect(useUI.getState().tabBarCollapsed).toBe(false);
  });
});
