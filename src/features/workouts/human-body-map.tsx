import { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, type GestureResponderEvent } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Ellipse, G, Path } from 'react-native-svg';

import { radii } from '@/design-system';
import { haptics } from '@/utils/haptics';
import type { BodyView, MuscleKey, MuscleTarget } from './muscle-data';
import { BODY_VIEWBOX, muscleAtPoint } from './muscle-hit-targets';

const BODY_IMAGES = {
  front: require('../../../assets/images/workouts/anatomy-front-transparent.png'),
  back: require('../../../assets/images/workouts/anatomy-back-transparent.png'),
} as const;

const BODY_ASPECT_RATIO = 950 / 1655;
const ART_VIEWBOX = { width: 100, height: 174.21 } as const;
const HIGHLIGHT_FILL = '#FFB266';
const HIGHLIGHT_STROKE = '#FFD3A3';

interface HumanBodyMapProps {
  bodyView: BodyView;
  selectedMuscle: MuscleKey;
  selectedTarget: MuscleTarget;
  onSelectMuscle: (muscle: MuscleKey) => void;
}

interface FrameSize {
  width: number;
  height: number;
}

function SelectedMuscleOverlay({
  bodyView,
  muscle,
  target,
}: {
  bodyView: BodyView;
  muscle: MuscleKey;
  target: MuscleTarget;
}) {
  const groupProps = {
    fill: HIGHLIGHT_FILL,
    fillOpacity: 0.1,
    stroke: HIGHLIGHT_STROKE,
    strokeOpacity: 0.42,
    strokeWidth: 0.45,
  } as const;
  const targetProps = {
    fill: HIGHLIGHT_FILL,
    fillOpacity: 0.44,
    stroke: HIGHLIGHT_STROKE,
    strokeOpacity: 1,
    strokeWidth: 0.7,
  } as const;

  return (
    <Svg
      preserveAspectRatio="none"
      style={[StyleSheet.absoluteFill, styles.nonInteractive]}
      viewBox={`0 0 ${ART_VIEWBOX.width} ${ART_VIEWBOX.height}`}>
      {bodyView === 'front' ? (
        <G>
          {muscle === 'shoulders' ? (
            <>
              <Ellipse {...groupProps} cx={28.5} cy={38} rx={8.5} ry={9} />
              <Ellipse {...groupProps} cx={71.5} cy={38} rx={8.5} ry={9} />
            </>
          ) : null}
          {muscle === 'chest' ? (
            <>
              <Path {...groupProps} d="M29 38 C34 34 43 34 48.8 38 L48.8 57 C39 57 31 51 28 43 Z" />
              <Path {...groupProps} d="M71 38 C66 34 57 34 51.2 38 L51.2 57 C61 57 69 51 72 43 Z" />
            </>
          ) : null}
          {muscle === 'biceps' ? (
            <>
              <Path {...groupProps} d="M22 45 C18 52 18 64 23 70 C28 67 31 55 29 47 Z" />
              <Path {...groupProps} d="M78 45 C82 52 82 64 77 70 C72 67 69 55 71 47 Z" />
            </>
          ) : null}
          {muscle === 'core' ? (
            <Path {...groupProps} d="M39 54 C44 52 56 52 61 54 L62 85 C58 90 42 90 38 85 Z" />
          ) : null}
          {muscle === 'quadriceps' ? (
            <>
              <Path {...groupProps} d="M34 89 C40 87 47 91 48 98 L46 132 C42 137 34 133 31 126 Z" />
              <Path {...groupProps} d="M66 89 C60 87 53 91 52 98 L54 132 C58 137 66 133 69 126 Z" />
            </>
          ) : null}
        </G>
      ) : (
        <G>
          {muscle === 'upper-back' ? (
            <>
              <Path {...groupProps} d="M35 30 L50 23 L65 30 L61 58 L50 64 L39 58 Z" />
              <Ellipse {...groupProps} cx={29} cy={39} rx={8} ry={8} />
              <Ellipse {...groupProps} cx={71} cy={39} rx={8} ry={8} />
            </>
          ) : null}
          {muscle === 'triceps' ? (
            <>
              <Path {...groupProps} d="M22 46 C18 54 19 67 24 72 C29 67 31 54 29 47 Z" />
              <Path {...groupProps} d="M78 46 C82 54 81 67 76 72 C71 67 69 54 71 47 Z" />
            </>
          ) : null}
          {muscle === 'lats' ? (
            <>
              <Path {...groupProps} d="M34 48 C39 53 43 58 48 62 L47 82 C40 80 34 72 30 60 Z" />
              <Path {...groupProps} d="M66 48 C61 53 57 58 52 62 L53 82 C60 80 66 72 70 60 Z" />
            </>
          ) : null}
          {muscle === 'lower-back' ? (
            <Path {...groupProps} d="M39 69 L50 76 L61 69 L62 91 L50 96 L38 91 Z" />
          ) : null}
          {muscle === 'glutes' ? (
            <>
              <Ellipse {...groupProps} cx={41.5} cy={99} rx={10.5} ry={13} />
              <Ellipse {...groupProps} cx={58.5} cy={99} rx={10.5} ry={13} />
            </>
          ) : null}
          {muscle === 'hamstrings' ? (
            <>
              <Path {...groupProps} d="M32 108 C38 104 46 108 48 115 L46 139 C41 144 34 139 31 131 Z" />
              <Path {...groupProps} d="M68 108 C62 104 54 108 52 115 L54 139 C59 144 66 139 69 131 Z" />
            </>
          ) : null}
          {muscle === 'calves' ? (
            <>
              <Path {...groupProps} d="M33 135 C38 130 45 134 46 142 L44 162 C40 166 34 163 32 157 Z" />
              <Path {...groupProps} d="M67 135 C62 130 55 134 54 142 L56 162 C60 166 66 163 68 157 Z" />
            </>
          ) : null}
        </G>
      )}
      <G>
        {target.highlightAreas.map((area, index) => (
          <Ellipse
            key={`${target.id}-${index}`}
            {...targetProps}
            cx={area.cx}
            cy={area.cy}
            rx={area.rx}
            ry={area.ry}
            transform={
              area.rotation
                ? `rotate(${area.rotation} ${area.cx} ${area.cy})`
                : undefined
            }
          />
        ))}
      </G>
    </Svg>
  );
}

export function HumanBodyMap({
  bodyView,
  selectedMuscle,
  selectedTarget,
  onSelectMuscle,
}: HumanBodyMapProps) {
  const [frameSize, setFrameSize] = useState<FrameSize>({ width: 0, height: 0 });

  const selectMuscleAt = (event: GestureResponderEvent) => {
    if (!frameSize.width || !frameSize.height) return;

    const nativeEvent = event.nativeEvent as typeof event.nativeEvent & {
      offsetX?: number;
      offsetY?: number;
    };
    const locationX = nativeEvent.locationX ?? nativeEvent.offsetX;
    const locationY = nativeEvent.locationY ?? nativeEvent.offsetY;
    if (locationX === undefined || locationY === undefined) return;

    const normalizedX = (locationX / frameSize.width) * BODY_VIEWBOX.width;
    const normalizedY = (locationY / frameSize.height) * BODY_VIEWBOX.height;
    const tappedMuscle = muscleAtPoint(bodyView, normalizedX, normalizedY);

    if (tappedMuscle && tappedMuscle !== selectedMuscle) {
      haptics.select();
      onSelectMuscle(tappedMuscle);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Interactive ${bodyView} anatomy map`}
      accessibilityHint="Tap a muscle area to see anatomy and exercise suggestions"
      accessibilityValue={{ text: `${selectedTarget.label} in ${selectedMuscle} selected` }}
      onPress={selectMuscleAt}
      onLayout={(event) => setFrameSize(event.nativeEvent.layout)}
      style={({ pressed }) => [styles.frame, { opacity: pressed ? 0.96 : 1 }]}>
      <Animated.View key={bodyView} entering={FadeIn.duration(240)} style={StyleSheet.absoluteFill}>
        <Image
          accessibilityIgnoresInvertColors
          alt={`${bodyView} view of the human muscular system`}
          contentFit="fill"
          priority="high"
          source={BODY_IMAGES[bodyView]}
          transition={180}
          style={StyleSheet.absoluteFill}
        />
        <SelectedMuscleOverlay
          bodyView={bodyView}
          muscle={selectedMuscle}
          target={selectedTarget}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    aspectRatio: BODY_ASPECT_RATIO,
    backgroundColor: 'transparent',
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  nonInteractive: {
    pointerEvents: 'none',
  },
});
