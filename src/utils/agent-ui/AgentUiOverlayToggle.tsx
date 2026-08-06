import { useCallback, useMemo } from 'react';
import { Dimensions, StyleSheet, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { AgentUiIds } from './ids';
import { toggleAgentUiOverlay } from './overlay';
import { useAgentUiTarget } from './use-agent-ui-target';

const BUTTON_MIN_WIDTH = 72;
const BUTTON_HEIGHT = 44;
const EDGE_PAD = 10;

/** Session-persisted position so remounts / toggle state flips keep the FAB put. */
let savedLeft: number | null = null;
let savedTop: number | null = null;

function defaultPosition(): { left: number; top: number } {
  const { width } = Dimensions.get('window');
  return {
    left: Math.max(EDGE_PAD, width - BUTTON_MIN_WIDTH - EDGE_PAD - 16),
    top: 56,
  };
}

function clampPosition(left: number, top: number): { left: number; top: number } {
  const { width, height } = Dimensions.get('window');
  const maxLeft = Math.max(EDGE_PAD, width - BUTTON_MIN_WIDTH - EDGE_PAD);
  const maxTop = Math.max(EDGE_PAD, height - BUTTON_HEIGHT - EDGE_PAD - 24);
  return {
    left: Math.min(maxLeft, Math.max(EDGE_PAD, left)),
    top: Math.min(maxTop, Math.max(EDGE_PAD + 36, top)),
  };
}

type Props = {
  enabled: boolean;
  idCount: number;
};

/**
 * Compact draggable __DEV__ FAB — tap toggles overlay frames; drag to move.
 */
export function AgentUiOverlayToggle({ enabled, idCount }: Props) {
  const onToggle = useCallback(() => {
    toggleAgentUiOverlay();
  }, []);
  const target = useAgentUiTarget(AgentUiIds.agentUi.overlayToggle, {
    label: enabled ? 'Hide agent UI overlay' : 'Show agent UI overlay',
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

  const persistPosition = useCallback((nextLeft: number, nextTop: number) => {
    const clamped = clampPosition(nextLeft, nextTop);
    savedLeft = clamped.left;
    savedTop = clamped.top;
    left.value = clamped.left;
    top.value = clamped.top;
  }, [left, top]);

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

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        ref={target.ref}
        collapsable={false}
        onLayout={target.onLayout}
        accessibilityRole="button"
        accessibilityLabel={
          enabled ? 'Hide agent UI overlay' : 'Show agent UI overlay'
        }
        accessibilityHint="Drag to move"
        testID={target.testID}
        style={[
          styles.fab,
          enabled ? styles.fabOn : styles.fabOff,
          animatedStyle,
        ]}>
        <Text style={styles.title} numberOfLines={1}>
          {enabled ? 'Overlay' : 'Agent UI'}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {enabled ? `On · ${idCount}` : 'Off · tap'}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    zIndex: 1000,
    minWidth: BUTTON_MIN_WIDTH,
    minHeight: BUTTON_HEIGHT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 22,
    justifyContent: 'center',
    gap: 1,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  fabOn: {
    backgroundColor: 'rgba(10, 18, 32, 0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.95)',
  },
  fabOff: {
    backgroundColor: 'rgba(10, 18, 32, 0.78)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(157, 176, 199, 0.65)',
  },
  title: {
    color: '#F4F7FB',
    fontSize: 12,
    fontFamily: 'System',
    fontWeight: '600',
  },
  meta: {
    color: '#9DB0C7',
    fontSize: 10,
    fontFamily: 'System',
  },
});
