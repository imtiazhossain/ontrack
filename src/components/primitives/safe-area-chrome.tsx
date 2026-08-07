import type { ImageSource } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type PropsWithChildren,
} from 'react';

type SafeAreaChromeOptions = {
  /** Optional scenic wash painted on the app shell under the status bar. */
  backgroundImage?: ImageSource;
  /** Height of the chrome image band (window coords from y=0). */
  backgroundImageHeight?: number;
  /** Soften scenic chrome to match in-screen atmosphere treatments. */
  backgroundImageBlurRadius?: number;
};

type SafeAreaChromeState = {
  color: string | undefined;
  backgroundImage: ImageSource | undefined;
  backgroundImageHeight: number | undefined;
  backgroundImageBlurRadius: number | undefined;
};

type SafeAreaChromeSetter = (
  color: string | undefined,
  options?: SafeAreaChromeOptions,
) => void;

const SafeAreaChromeStateContext = createContext<SafeAreaChromeState>({
  color: undefined,
  backgroundImage: undefined,
  backgroundImageHeight: undefined,
  backgroundImageBlurRadius: undefined,
});
const SafeAreaChromeSetterContext = createContext<SafeAreaChromeSetter | null>(null);

/**
 * Owns the non-scrolling status-bar wash for the app shell.
 * Screens opt in with `useSafeAreaChrome` so header washes continue
 * behind the clock / Dynamic Island — same treatment Travel already had.
 */
export function SafeAreaChromeProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<SafeAreaChromeState>({
    color: undefined,
    backgroundImage: undefined,
    backgroundImageHeight: undefined,
    backgroundImageBlurRadius: undefined,
  });
  const setChrome = useCallback<SafeAreaChromeSetter>((color, options) => {
    setState({
      color,
      backgroundImage: options?.backgroundImage,
      backgroundImageHeight: options?.backgroundImageHeight,
      backgroundImageBlurRadius: options?.backgroundImageBlurRadius,
    });
  }, []);

  return (
    <SafeAreaChromeSetterContext.Provider value={setChrome}>
      <SafeAreaChromeStateContext.Provider value={state}>
        {children}
      </SafeAreaChromeStateContext.Provider>
    </SafeAreaChromeSetterContext.Provider>
  );
}

/** Current status-bar wash override, if a focused screen registered one. */
export function useSafeAreaChromeColor(): string | undefined {
  return useContext(SafeAreaChromeStateContext).color;
}

/** Scenic chrome image registered by the focused screen, if any. */
export function useSafeAreaChromeBackground(): {
  image: ImageSource | undefined;
  height: number | undefined;
  blurRadius: number | undefined;
} {
  const { backgroundImage, backgroundImageHeight, backgroundImageBlurRadius } =
    useContext(SafeAreaChromeStateContext);
  return useMemo(
    () => ({
      image: backgroundImage,
      height: backgroundImageHeight,
      blurRadius: backgroundImageBlurRadius,
    }),
    [backgroundImage, backgroundImageBlurRadius, backgroundImageHeight],
  );
}

/**
 * While this screen/layout is focused, paint the app shell's top safe-area
 * region with `color` (and optional image) so page washes bleed behind the
 * status bar. Clears on blur so the next route falls back to `theme.backgroundPrimary`.
 */
export function useSafeAreaChrome(
  color: string | undefined,
  options?: SafeAreaChromeOptions,
) {
  const setChrome = useContext(SafeAreaChromeSetterContext);
  const backgroundImage = options?.backgroundImage;
  const backgroundImageHeight = options?.backgroundImageHeight;
  const backgroundImageBlurRadius = options?.backgroundImageBlurRadius;

  useFocusEffect(
    useCallback(() => {
      if (!setChrome || !color) return;
      setChrome(color, {
        backgroundImage,
        backgroundImageHeight,
        backgroundImageBlurRadius,
      });
      return () => setChrome(undefined);
    }, [
      backgroundImage,
      backgroundImageBlurRadius,
      backgroundImageHeight,
      color,
      setChrome,
    ]),
  );
}

/** Layout-friendly registrant when a hook call site is awkward. */
export function SafeAreaChrome({
  color,
  backgroundImage,
  backgroundImageHeight,
  backgroundImageBlurRadius,
}: {
  color: string;
  backgroundImage?: ImageSource;
  backgroundImageHeight?: number;
  backgroundImageBlurRadius?: number;
}) {
  useSafeAreaChrome(color, {
    backgroundImage,
    backgroundImageHeight,
    backgroundImageBlurRadius,
  });
  return null;
}
