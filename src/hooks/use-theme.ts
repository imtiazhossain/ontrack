import { useColorScheme } from 'react-native';

import { darkTheme, lightTheme, type Theme } from '@/design-system';
import { usePreferences } from '@/store/preferences';

export function useTheme(): Theme {
  const system = useColorScheme();
  const preference = usePreferences((s) => s.themePreference);
  const resolved = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  return resolved === 'dark' ? darkTheme : lightTheme;
}
