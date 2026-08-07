import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import Svg from 'react-native-svg';

import type { TravelSkyGroundKind } from '@/features/travel/travel-sky-ground-kind';
import { GroundArt } from '@/features/travel/travel-sky-ground-kinds';
import { SKY_PLATE_VIEWBOX } from '@/features/travel/travel-sky-plate';
import type { TiltSkyMotion } from '@/features/travel/use-tilt-sky-motion';

/**
 * Location-flavored ground band for the itinerary sky plate —
 * mountains, trees, town/city, cars — dissolving with the horizon fade.
 */
export function TravelSkyGround({
  kind,
  night,
  motion,
}: {
  kind: TravelSkyGroundKind;
  night: boolean;
  motion: TiltSkyMotion;
}) {
  const style = useAnimatedStyle(() => {
    const depth = 0.22;
    return {
      transform: [
        { translateX: motion.tiltX.value * 10 * depth },
        {
          translateY: interpolate(motion.tiltY.value, [-1, 1], [1.2, -1.2]) * depth,
        },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, style]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg
          width="100%"
          height="100%"
          viewBox={SKY_PLATE_VIEWBOX}
          preserveAspectRatio="none">
          <GroundArt kind={kind} night={night} />
        </Svg>
      </View>
    </Animated.View>
  );
}
