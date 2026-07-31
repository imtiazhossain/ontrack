import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  ReduceMotion,
  SharedTransition,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { radii } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';

import { clampCanvasFrame } from './canvas';
import type { CanvasFrame, VisionBoardCategory, VisionBoardItem } from './types';
import { VisionBoardItemCard } from './vision-board-item-card';

const sharedTransition = SharedTransition.springify()
  .damping(18)
  .reduceMotion(ReduceMotion.System);

export function VisionBoardCanvasItem({
  item,
  category,
  posterWidth,
  posterHeight,
  selected,
  onSelect,
  onCommit,
  onGestureActive,
}: {
  item: VisionBoardItem;
  category: VisionBoardCategory;
  posterWidth: number;
  posterHeight: number;
  selected: boolean;
  onSelect: () => void;
  onCommit: (frame: CanvasFrame) => void;
  onGestureActive: (active: boolean) => void;
}) {
  const theme = useTheme();
  const x = useSharedValue(item.frame.x * posterWidth);
  const y = useSharedValue(item.frame.y * posterHeight);
  const width = useSharedValue(item.frame.width * posterWidth);
  const height = useSharedValue(item.frame.height * posterHeight);
  const rotation = useSharedValue(item.frame.rotation);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startWidth = useSharedValue(0);
  const startHeight = useSharedValue(0);
  const startRotation = useSharedValue(0);

  const commit = () => {
    onCommit(
      clampCanvasFrame({
        x: x.value / posterWidth,
        y: y.value / posterHeight,
        width: width.value / posterWidth,
        height: height.value / posterHeight,
        rotation: rotation.value,
        zIndex: item.frame.zIndex,
      }),
    );
  };

  const begin = () => {
    onSelect();
    onGestureActive(true);
  };

  const finish = (successful: boolean) => {
    onGestureActive(false);
    if (successful) commit();
  };

  const pan = Gesture.Pan()
    .onBegin(() => {
      startX.value = x.value;
      startY.value = y.value;
      runOnJS(begin)();
    })
    .onUpdate((event) => {
      x.value = Math.min(
        posterWidth - width.value,
        Math.max(0, startX.value + event.translationX),
      );
      y.value = Math.min(
        posterHeight - height.value,
        Math.max(0, startY.value + event.translationY),
      );
    })
    .onFinalize((_event, successful) => runOnJS(finish)(successful));

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      startWidth.value = width.value;
      startHeight.value = height.value;
      runOnJS(begin)();
    })
    .onUpdate((event) => {
      const nextWidth = Math.min(posterWidth * 0.72, Math.max(posterWidth * 0.18, startWidth.value * event.scale));
      const nextHeight = Math.min(posterHeight * 0.65, Math.max(posterHeight * 0.12, startHeight.value * event.scale));
      width.value = nextWidth;
      height.value = nextHeight;
      x.value = Math.min(x.value, posterWidth - nextWidth);
      y.value = Math.min(y.value, posterHeight - nextHeight);
    })
    .onFinalize((_event, successful) => runOnJS(finish)(successful));

  const rotate = Gesture.Rotation()
    .onBegin(() => {
      startRotation.value = rotation.value;
      runOnJS(begin)();
    })
    .onUpdate((event) => {
      rotation.value = startRotation.value + (event.rotation * 180) / Math.PI;
    })
    .onFinalize((_event, successful) => runOnJS(finish)(successful));

  const tap = Gesture.Tap().onEnd(() => runOnJS(onSelect)());
  const gesture = Gesture.Simultaneous(pan, pinch, rotate, tap);
  const animatedStyle = useAnimatedStyle(() => ({
    left: x.value,
    top: y.value,
    width: width.value,
    height: height.value,
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`${item.kind} card on ${category.name} board`}
        accessibilityHint="Drag to move, pinch to resize, or rotate with two fingers. Select for accessible controls."
        sharedTransitionTag={`vision-item-${item.id}`}
        sharedTransitionStyle={sharedTransition}
        style={[
          styles.item,
          {
            zIndex: item.frame.zIndex,
            borderColor: selected ? theme.accentPrimary : 'rgba(255,255,255,0.9)',
            borderWidth: selected ? 3 : 2,
          },
          animatedStyle,
        ]}>
        <VisionBoardItemCard item={item} category={category} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  item: {
    position: 'absolute',
    overflow: 'hidden',
    borderRadius: radii.sm,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 5px 12px rgba(37, 28, 18, 0.24)',
  },
});
