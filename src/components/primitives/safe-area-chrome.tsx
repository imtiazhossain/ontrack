import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { useFocusEffect } from 'expo-router';

type SafeAreaChromeSetter = (color: string | undefined) => void;

const SafeAreaChromeColorContext = createContext<string | undefined>(undefined);
const SafeAreaChromeSetterContext = createContext<SafeAreaChromeSetter | null>(null);

/**
 * Owns the non-scrolling status-bar wash color for the app shell.
 * Screens opt in with `useSafeAreaChrome` so header washes continue
 * behind the clock / Dynamic Island — same treatment Travel already had.
 */
export function SafeAreaChromeProvider({ children }: PropsWithChildren) {
  const [color, setColor] = useState<string | undefined>(undefined);
  const value = useMemo(() => ({ color, setColor }), [color]);

  return (
    <SafeAreaChromeSetterContext.Provider value={value.setColor}>
      <SafeAreaChromeColorContext.Provider value={value.color}>
        {children}
      </SafeAreaChromeColorContext.Provider>
    </SafeAreaChromeSetterContext.Provider>
  );
}

/** Current status-bar wash override, if a focused screen registered one. */
export function useSafeAreaChromeColor(): string | undefined {
  return useContext(SafeAreaChromeColorContext);
}

/**
 * While this screen/layout is focused, paint the app shell's top safe-area
 * region with `color` so page washes bleed behind the status bar.
 * Clears on blur so the next route falls back to `theme.backgroundPrimary`.
 */
export function useSafeAreaChrome(color: string | undefined) {
  const setColor = useContext(SafeAreaChromeSetterContext);

  useFocusEffect(
    useCallback(() => {
      if (!setColor || !color) return;
      setColor(color);
      return () => setColor(undefined);
    }, [color, setColor]),
  );
}

/** Layout-friendly registrant when a hook call site is awkward. */
export function SafeAreaChrome({ color }: { color: string }) {
  useSafeAreaChrome(color);
  return null;
}
