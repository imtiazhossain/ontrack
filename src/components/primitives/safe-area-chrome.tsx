import type { ImageSource } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
  type ReactNode,
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

type SafeAreaChromeOverlayState = {
  overlay: ReactNode | undefined;
  height: number | undefined;
};

type SafeAreaChromeSetter = (
  color: string | undefined,
  options?: SafeAreaChromeOptions,
) => void;

type SafeAreaChromeOverlaySetter = (
  overlay: ReactNode | undefined,
  height: number | undefined,
) => void;

const SafeAreaChromeStateContext = createContext<SafeAreaChromeState>({
  color: undefined,
  backgroundImage: undefined,
  backgroundImageHeight: undefined,
  backgroundImageBlurRadius: undefined,
});
const SafeAreaChromeSetterContext = createContext<SafeAreaChromeSetter | null>(null);

const SafeAreaChromeOverlayStateContext = createContext<SafeAreaChromeOverlayState>({
  overlay: undefined,
  height: undefined,
});
const SafeAreaChromeOverlaySetterContext =
  createContext<SafeAreaChromeOverlaySetter | null>(null);

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
  const [overlayState, setOverlayState] = useState<SafeAreaChromeOverlayState>({
    overlay: undefined,
    height: undefined,
  });
  const setChrome = useCallback<SafeAreaChromeSetter>((color, options) => {
    setState({
      color,
      backgroundImage: options?.backgroundImage,
      backgroundImageHeight: options?.backgroundImageHeight,
      backgroundImageBlurRadius: options?.backgroundImageBlurRadius,
    });
  }, []);
  const setOverlay = useCallback<SafeAreaChromeOverlaySetter>((overlay, height) => {
    setOverlayState({ overlay, height });
  }, []);

  return (
    <SafeAreaChromeSetterContext.Provider value={setChrome}>
      <SafeAreaChromeStateContext.Provider value={state}>
        <SafeAreaChromeOverlaySetterContext.Provider value={setOverlay}>
          <SafeAreaChromeOverlayStateContext.Provider value={overlayState}>
            {children}
          </SafeAreaChromeOverlayStateContext.Provider>
        </SafeAreaChromeOverlaySetterContext.Provider>
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

/** Decorative React overlay (stars / sun) painted under the status bar. */
export function useSafeAreaChromeOverlayLayer(): SafeAreaChromeOverlayState {
  return useContext(SafeAreaChromeOverlayStateContext);
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

/**
 * Decorative overlay on the app shell (window y=0), independent of color/image
 * chrome so Travel layout wash and itinerary sky can coexist.
 * Use for art that must continue behind the clock / Dynamic Island.
 */
export function useSafeAreaChromeOverlay(
  overlay: ReactNode | undefined,
  height: number | undefined,
) {
  const setOverlay = useContext(SafeAreaChromeOverlaySetterContext);

  useFocusEffect(
    useCallback(() => {
      if (!setOverlay || overlay == null || height == null || height <= 0) {
        return;
      }
      setOverlay(overlay, height);
      return () => setOverlay(undefined, undefined);
    }, [height, overlay, setOverlay]),
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
