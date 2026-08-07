import { Appearance } from 'react-native';

import { usePreferences } from '@/store/preferences';

import {
  isDevThemeFabVisible,
  resolveThemeAppearance,
  setDevThemeFabVisible,
  toggleDevThemeFabVisible,
  toggleLightDarkThemePreference,
} from '../visibility';

describe('dev theme toggle visibility', () => {
  beforeEach(() => {
    setDevThemeFabVisible(false);
    usePreferences.setState({ themePreference: 'system' });
  });

  it('is hidden by default and toggles with triple-tap helper', () => {
    expect(isDevThemeFabVisible()).toBe(false);
    expect(toggleDevThemeFabVisible()).toBe(true);
    expect(isDevThemeFabVisible()).toBe(true);
    expect(toggleDevThemeFabVisible()).toBe(false);
    expect(isDevThemeFabVisible()).toBe(false);
  });

  it('flips light ↔ dark and locks off system', () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
    usePreferences.setState({ themePreference: 'system' });
    expect(resolveThemeAppearance()).toBe('light');
    expect(toggleLightDarkThemePreference()).toBe('dark');
    expect(usePreferences.getState().themePreference).toBe('dark');
    expect(toggleLightDarkThemePreference()).toBe('light');
    expect(usePreferences.getState().themePreference).toBe('light');
  });
});
