import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { Dimensions, Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { FullWindowOverlay } from 'react-native-screens';

import { Symbol } from '@/components/primitives';
import { usePreferences } from '@/store/preferences';
import { AgentUiIds } from '@/utils/agent-ui/ids';
import { useAgentUiTarget } from '@/utils/agent-ui/use-agent-ui-target';

import {
  isDevThemeFabVisible,
  resolveThemeAppearance,
  subscribeDevThemeFab,
  toggleLightDarkThemePreference,
} from './visibility';

/** Match Travel Home add FAB — white circle, soft elevation, navy mark. */
const BUTTON_SIZE = 48;
const EDGE_PAD = 10;
const INK = '#16255B';
const SURFACE = '#FFFFFF';
const BORDER = 'rgba(22,37,91,0.08)';
const SHADOW = '0 8px 20px rgba(22,37,91,0.16)';

/** Session-persisted position so remounts keep the FAB put. */
let savedLeft: number | null = null;
let savedTop: number | null = null;

function defaultPosition(): { left: number; top: number } {
  const { width, height } = Dimensions.get('window');
  // Bottom-right, one slot left of the Agent UI overlay FAB default.
  return {
    left: Math.max(EDGE_PAD, width - BUTTON_SIZE * 2 - EDGE_PAD - 26),
    top: Math.max(EDGE_PAD + 36, height - BUTTON_SIZE - EDGE_PAD - 96),
  };
}

function clampPosition(left: number, top: number): { left: number; top: number } {
  const { width, height } = Dimensions.get('window');
  const maxLeft = Math.max(EDGE_PAD, width - BUTTON_SIZE - EDGE_PAD);
  const maxTop = Math.max(EDGE_PAD, height - BUTTON_SIZE - EDGE_PAD - 24);
  return {
    left: Math.min(maxLeft, Math.max(EDGE_PAD, left)),
    top: Math.min(maxTop, Math.max(EDGE_PAD + 36, top)),
  };
}

/**
 * Compact draggable __DEV__ FAB — only mounted while visible (triple-tap host).
 * Tap flips Light ↔ Dark; drag to move.
 */
function ThemeToggleFabButton() {
  const themePreference = usePreferences((state) => state.themePreference);
  const appearance = resolveThemeAppearance(themePreference);
  const onToggle = useCallback(() => {
    toggleLightDarkThemePreference();
  }, []);
  const target = useAgentUiTarget(AgentUiIds.dev.themeToggle, {
    label: appearance === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
    onPress: onToggle,
  });

  const start = useMemo(() => {
    if (savedLeft != null && savedTop != null) {
      return clampPosition(savedLeft, savedTop);
    }
    return defaultPosition();
  }, []);

  const left = useSharedValue(start.left);
  const top = useSharedValue(start.top);
  const dragOriginX = useSharedValue(start.left);
  const dragOriginY = useSharedValue(start.top);

  const persistPosition = useCallback(
    (nextLeft: number, nextTop: number) => {
      const clamped = clampPosition(nextLeft, nextTop);
      savedLeft = clamped.left;
      savedTop = clamped.top;
      left.value = clamped.left;
      top.value = clamped.top;
    },
    [left, top],
  );

  const pan = Gesture.Pan()
    .minDistance(6)
    .onStart(() => {
      dragOriginX.value = left.value;
      dragOriginY.value = top.value;
    })
    .onUpdate((event) => {
      left.value = dragOriginX.value + event.translationX;
      top.value = dragOriginY.value + event.translationY;
    })
    .onEnd(() => {
      runOnJS(persistPosition)(left.value, top.value);
    });

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(onToggle)();
  });

  const gesture = Gesture.Exclusive(pan, tap);

  const animatedStyle = useAnimatedStyle(() => ({
    left: left.value,
    top: top.value,
  }));

  // Show the destination mode mark (moon → go dark, sun → go light).
  const iconName = appearance === 'dark' ? 'today' : 'sleep';

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        ref={target.ref}
        collapsable={false}
        onLayout={target.onLayout}
        accessibilityRole="button"
        accessibilityLabel={
          appearance === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
        }
        accessibilityHint="Drag to move. Triple-tap the page to hide this button."
        testID={target.testID}
        style={[styles.fab, animatedStyle]}>
        <Symbol name={iconName} size={22} color={INK} />
      </Animated.View>
    </GestureDetector>
  );
}

/** __DEV__ floating theme switcher — off by default until triple-tap shows it. */
export function ThemeToggleFab() {
  const visible = useSyncExternalStore(
    subscribeDevThemeFab,
    isDevThemeFabVisible,
    () => false,
  );

  if (!__DEV__ || !visible) return null;

  const layer = (
    <View style={styles.layer} pointerEvents="box-none" collapsable={false}>
      <ThemeToggleFabButton />
    </View>
  );

  if (Platform.OS === 'ios') {
    return <FullWindowOverlay>{layer}</FullWindowOverlay>;
  }
  return layer;
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFill,
  },
  fab: {
    position: 'absolute',
    zIndex: 1000,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: BORDER,
    boxShadow: SHADOW,
    shadowColor: '#16255B',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
});
