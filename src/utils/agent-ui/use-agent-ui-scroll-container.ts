import { useEffect, useRef, type RefCallback, type RefObject } from 'react';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  View,
} from 'react-native';

import { isAgentUiEnabled, remeasureAllAgentUiFrames } from './registry';
import { registerAgentUiScrollContainer } from './scroll-container';

/**
 * Wires a Screen ScrollView into the agent-ui scroll registry (dev only).
 * Viewport bounds come from `viewportRef` (outer View); scrolling uses ScrollView.
 * Never uses host mouse / Simulator window coordinates.
 */
export function useAgentUiScrollContainer(
  externalScrollRef?: RefObject<ScrollView | null>,
  viewportRef?: RefObject<View | null>,
): {
  scrollRef: RefCallback<ScrollView | null>;
  onScroll: ((event: NativeSyntheticEvent<NativeScrollEvent>) => void) | undefined;
  scrollEventThrottle: number | undefined;
} {
  const offsetY = useRef(0);
  const scrollNode = useRef<ScrollView | null>(null);
  const remeasureRaf = useRef<number | null>(null);
  const enabled = isAgentUiEnabled();

  const publish = (scrollView: ScrollView | null) => {
    scrollNode.current = scrollView;
    if (!enabled) return;
    if (!scrollView) {
      registerAgentUiScrollContainer(null);
      return;
    }
    registerAgentUiScrollContainer({
      scrollView,
      getOffsetY: () => offsetY.current,
      measureInWindow: (callback) => {
        const viewport = viewportRef?.current;
        if (viewport) {
          viewport.measureInWindow(callback);
          return;
        }
        // Fallback when no viewport wrapper is provided.
        (scrollView as unknown as View).measureInWindow?.(callback);
      },
    });
  };

  const scheduleRemeasure = () => {
    if (remeasureRaf.current != null) return;
    remeasureRaf.current = requestAnimationFrame(() => {
      remeasureRaf.current = null;
      remeasureAllAgentUiFrames();
    });
  };

  useEffect(() => {
    if (!enabled) return;
    publish(scrollNode.current);
    return () => {
      registerAgentUiScrollContainer(null);
      if (remeasureRaf.current != null) {
        cancelAnimationFrame(remeasureRaf.current);
        remeasureRaf.current = null;
      }
    };
    // viewportRef identity is stable from Screen; re-publish when enabled flips.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  if (!enabled) {
    return {
      scrollRef: (node) => {
        if (externalScrollRef) externalScrollRef.current = node;
      },
      onScroll: undefined,
      scrollEventThrottle: undefined,
    };
  }

  return {
    scrollRef: (node) => {
      if (externalScrollRef) externalScrollRef.current = node;
      publish(node);
    },
    onScroll: (event) => {
      offsetY.current = event.nativeEvent.contentOffset.y;
      // Scroll does not fire onLayout — refresh window frames so overlay/hit stay aligned.
      scheduleRemeasure();
    },
    scrollEventThrottle: 16,
  };
}
