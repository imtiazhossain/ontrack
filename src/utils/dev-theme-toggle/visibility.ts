/**
 * __DEV__ theme toggle FAB — hidden by default; triple-tap the page to show/hide.
 */

import { Appearance } from 'react-native';

import { usePreferences, type ThemePreference } from '@/store/preferences';

type Listener = () => void;

let fabVisible = false;
const listeners = new Set<Listener>();

function notifyListeners(): void {
  for (const listener of listeners) listener();
}

export function isDevThemeFabVisible(): boolean {
  return fabVisible;
}

export function setDevThemeFabVisible(visible: boolean): void {
  if (fabVisible === visible) return;
  fabVisible = visible;
  notifyListeners();
}

export function toggleDevThemeFabVisible(): boolean {
  fabVisible = !fabVisible;
  notifyListeners();
  return fabVisible;
}

export function subscribeDevThemeFab(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Resolve the effective light/dark appearance from preference + system. */
export function resolveThemeAppearance(
  preference: ThemePreference = usePreferences.getState().themePreference,
): 'light' | 'dark' {
  if (preference === 'light' || preference === 'dark') return preference;
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

/** Flip explicit light ↔ dark (locks off System so the switch is deterministic). */
export function toggleLightDarkThemePreference(): 'light' | 'dark' {
  const next = resolveThemeAppearance() === 'dark' ? 'light' : 'dark';
  usePreferences.getState().setThemePreference(next);
  return next;
}
