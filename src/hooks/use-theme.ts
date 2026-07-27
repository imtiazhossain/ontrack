import { createContext, createElement, type PropsWithChildren, useContext } from 'react';
import { useColorScheme } from 'react-native';

import {
  darkTheme,
  darkTravelTheme,
  lightTheme,
  lightTravelTheme,
  type Theme,
} from '@/design-system';
import { usePreferences } from '@/store/preferences';

type FeatureTheme = 'default' | 'travel';

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
  return resolved === 'dark' ? darkTheme : lightTheme;
}
