import { createContext, createElement, type PropsWithChildren, useContext } from 'react';
import { useColorScheme } from 'react-native';

import {
  darkPlantTheme,
  darkTheme,
  darkTravelTheme,
  darkVehicleTheme,
  lightPlantTheme,
  lightTheme,
  lightTravelTheme,
  lightVehicleTheme,
  type Theme,
} from '@/design-system';
import { usePreferences } from '@/store/preferences';

type FeatureTheme = 'default' | 'travel' | 'plants' | 'vehicles';

const FeatureThemeContext = createContext<FeatureTheme>('default');

export function FeatureThemeProvider({
  children,
  feature,
}: PropsWithChildren<{ feature: Exclude<FeatureTheme, 'default'> }>) {
  return createElement(FeatureThemeContext.Provider, { value: feature }, children);
}

export function useTheme(): Theme {
  const system = useColorScheme();
  const preference = usePreferences((s) => s.themePreference);
  const resolved = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  const feature = useContext(FeatureThemeContext);
  if (feature === 'travel') {
    return resolved === 'dark' ? darkTravelTheme : lightTravelTheme;
  }
  if (feature === 'plants') {
    return resolved === 'dark' ? darkPlantTheme : lightPlantTheme;
  }
  if (feature === 'vehicles') {
    return resolved === 'dark' ? darkVehicleTheme : lightVehicleTheme;
  }
  return resolved === 'dark' ? darkTheme : lightTheme;
}
