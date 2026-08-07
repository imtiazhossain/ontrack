import type { ImageSource } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from 'react';

import { pickRankedEntry } from './safe-area-chrome-stack';

type SafeAreaChromeOptions = {
  /** Optional scenic wash painted on the app shell under the status bar. */
  backgroundImage?: ImageSource;
  /** Height of the chrome image band (window coords from y=0). */
  backgroundImageHeight?: number;
  /** Soften scenic chrome to match in-screen atmosphere treatments. */
  backgroundImageBlurRadius?: number;
  /**
   * Higher wins when a layout and a nested screen both register chrome.
   * React runs child focus effects before parents, so without priority the
   * layout wash would overwrite the screen (e.g. travel stack black over
   * itinerary night sky). Default `0`; leaf screens that must win use `1+`.
   */
  priority?: number;
};

type SafeAreaChromeState = {
  color: string | undefined;
  backgroundImage: ImageSource | undefined;
  backgroundImageHeight: number | undefined;
  backgroundImageBlurRadius: number | undefined;
};

type SafeAreaChromeEntry = SafeAreaChromeState & {
  id: string;
  priority: number;
  seq: number;
};

type SafeAreaChromeOverlayState = {
  overlay: ReactNode | undefined;
  height: number | undefined;
};

type SafeAreaChromeOverlayEntry = SafeAreaChromeOverlayState & {
  id: string;
  priority: number;
  seq: number;
};

type SafeAreaChromeRegistry = {
  upsert: (entry: Omit<SafeAreaChromeEntry, 'seq'> & { color: string }) => void;
  remove: (id: string) => void;
};

type SafeAreaChromeOverlayRegistry = {
  upsert: (
    entry: Omit<SafeAreaChromeOverlayEntry, 'seq'> & {
      overlay: ReactNode;
      height: number;
    },
  ) => void;
  remove: (id: string) => void;
};

const EMPTY_CHROME: SafeAreaChromeState = {
  color: undefined,
  backgroundImage: undefined,
  backgroundImageHeight: undefined,
  backgroundImageBlurRadius: undefined,
};

const EMPTY_OVERLAY: SafeAreaChromeOverlayState = {
  overlay: undefined,
  height: undefined,
};

const SafeAreaChromeStateContext =
  createContext<SafeAreaChromeState>(EMPTY_CHROME);
const SafeAreaChromeRegistryContext =
  createContext<SafeAreaChromeRegistry | null>(null);

const SafeAreaChromeOverlayStateContext =
  createContext<SafeAreaChromeOverlayState>(EMPTY_OVERLAY);
const SafeAreaChromeOverlayRegistryContext =
  createContext<SafeAreaChromeOverlayRegistry | null>(null);

function pickActiveChrome(entries: SafeAreaChromeEntry[]): SafeAreaChromeState {
  const best = pickRankedEntry(entries);
  if (!best) return EMPTY_CHROME;
  return {
    color: best.color,
    backgroundImage: best.backgroundImage,
    backgroundImageHeight: best.backgroundImageHeight,
    backgroundImageBlurRadius: best.backgroundImageBlurRadius,
  };
}

function pickActiveOverlay(
  entries: SafeAreaChromeOverlayEntry[],
): SafeAreaChromeOverlayState {
  const best = pickRankedEntry(entries);
  if (!best) return EMPTY_OVERLAY;
  return { overlay: best.overlay, height: best.height };
}

/**
 * Owns the non-scrolling status-bar wash for the app shell.
 * Screens opt in with `useSafeAreaChrome` so header washes continue
 * behind the clock / Dynamic Island — same treatment Travel already had.
 *
 * Nested registrants stack by `priority` (then registration order) so a
 * focused leaf can override a parent layout without the layout's later
 * focus effect wiping the leaf wash.
 */
export function SafeAreaChromeProvider({ children }: PropsWithChildren) {
  const [entries, setEntries] = useState<SafeAreaChromeEntry[]>([]);
  const [overlayEntries, setOverlayEntries] = useState<
    SafeAreaChromeOverlayEntry[]
  >([]);
  const seqRef = useRef(0);

  const registry = useMemo<SafeAreaChromeRegistry>(
    () => ({
      upsert: (entry) => {
        setEntries((prev) => {
          const idx = prev.findIndex((item) => item.id === entry.id);
          if (idx >= 0) {
            const existing = prev[idx]!;
            const next = prev.slice();
            next[idx] = { ...entry, seq: existing.seq };
            return next;
          }
          seqRef.current += 1;
          return [...prev, { ...entry, seq: seqRef.current }];
        });
      },
      remove: (id) => {
        setEntries((prev) => prev.filter((item) => item.id !== id));
      },
    }),
    [],
  );

  const overlayRegistry = useMemo<SafeAreaChromeOverlayRegistry>(
    () => ({
      upsert: (entry) => {
        setOverlayEntries((prev) => {
          const idx = prev.findIndex((item) => item.id === entry.id);
          if (idx >= 0) {
            const existing = prev[idx]!;
            const next = prev.slice();
            next[idx] = { ...entry, seq: existing.seq };
            return next;
          }
          seqRef.current += 1;
          return [...prev, { ...entry, seq: seqRef.current }];
        });
      },
      remove: (id) => {
        setOverlayEntries((prev) => prev.filter((item) => item.id !== id));
      },
    }),
    [],
  );

  const state = useMemo(() => pickActiveChrome(entries), [entries]);
  const overlayState = useMemo(
    () => pickActiveOverlay(overlayEntries),
    [overlayEntries],
  );

  return (
    <SafeAreaChromeRegistryContext.Provider value={registry}>
      <SafeAreaChromeStateContext.Provider value={state}>
        <SafeAreaChromeOverlayRegistryContext.Provider value={overlayRegistry}>
          <SafeAreaChromeOverlayStateContext.Provider value={overlayState}>
            {children}
          </SafeAreaChromeOverlayStateContext.Provider>
        </SafeAreaChromeOverlayRegistryContext.Provider>
      </SafeAreaChromeStateContext.Provider>
    </SafeAreaChromeRegistryContext.Provider>
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
  const registry = useContext(SafeAreaChromeRegistryContext);
  const id = useId();
  const backgroundImage = options?.backgroundImage;
  const backgroundImageHeight = options?.backgroundImageHeight;
  const backgroundImageBlurRadius = options?.backgroundImageBlurRadius;
  const priority = options?.priority ?? 0;

  useFocusEffect(
    useCallback(() => {
      if (!registry || !color) return;
      registry.upsert({
        id,
        color,
        backgroundImage,
        backgroundImageHeight,
        backgroundImageBlurRadius,
        priority,
      });
      return () => registry.remove(id);
    }, [
      backgroundImage,
      backgroundImageBlurRadius,
      backgroundImageHeight,
      color,
      id,
      priority,
      registry,
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
  options?: { priority?: number },
) {
  const registry = useContext(SafeAreaChromeOverlayRegistryContext);
  const id = useId();
  const priority = options?.priority ?? 0;

  useFocusEffect(
    useCallback(() => {
      if (!registry || overlay == null || height == null || height <= 0) {
        return;
      }
      registry.upsert({ id, overlay, height, priority });
      return () => registry.remove(id);
    }, [height, id, overlay, priority, registry]),
  );
}

/** Layout-friendly registrant when a hook call site is awkward. */
export function SafeAreaChrome({
  color,
  backgroundImage,
  backgroundImageHeight,
  backgroundImageBlurRadius,
  priority,
}: {
  color: string;
  backgroundImage?: ImageSource;
  backgroundImageHeight?: number;
  backgroundImageBlurRadius?: number;
  priority?: number;
}) {
  useSafeAreaChrome(color, {
    backgroundImage,
    backgroundImageHeight,
    backgroundImageBlurRadius,
    priority,
  });
  return null;
}
