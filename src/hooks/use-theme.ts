import { createContext, createElement, type PropsWithChildren, useContext } from 'react';
import { useColorScheme } from 'react-native';

import {
    applyThemeOverrides,
    resolveBaseTheme,
    type Theme,
    type ThemeScope,
} from '@/design-system';
import { usePreferences } from '@/store/preferences';
import { useThemeOverrides } from '@/store/theme-overrides';

type FeatureTheme = ThemeScope;

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
  const overrides = useThemeOverrides((s) => s.overrides[feature]);
  return applyThemeOverrides(resolveBaseTheme(feature, resolved), overrides);
}
