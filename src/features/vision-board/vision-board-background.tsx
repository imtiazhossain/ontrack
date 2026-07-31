import Svg, { Circle, Defs, Line, Pattern, Rect } from 'react-native-svg';
import { StyleSheet, View } from 'react-native';

import { VISION_BOARD_BACKGROUNDS } from './defaults';
import type { VisionBoardBackground as VisionBoardBackgroundName } from './types';
import { useTheme } from '@/hooks/use-theme';

export function VisionBoardBackground({
  background,
}: {
  background: VisionBoardBackgroundName;
}) {
  const theme = useTheme();
  const preset = VISION_BOARD_BACKGROUNDS[background];
  const fill = theme.name === 'light' ? preset.light : preset.dark;
  const pattern = preset.pattern;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: fill }]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id={`vision-${background}`} width="24" height="24" patternUnits="userSpaceOnUse">
            {background === 'cork' ? (
              <>
                <Circle cx="4" cy="6" r="1.1" fill={pattern} opacity={0.3} />
                <Circle cx="17" cy="15" r="0.8" fill={pattern} opacity={0.24} />
                <Line x1="8" y1="20" x2="13" y2="18" stroke={pattern} strokeWidth="0.8" opacity={0.18} />
              </>
            ) : background === 'linen' ? (
              <>
                <Line x1="0" y1="8" x2="24" y2="8" stroke={pattern} strokeWidth="0.5" opacity={0.18} />
                <Line x1="8" y1="0" x2="8" y2="24" stroke={pattern} strokeWidth="0.5" opacity={0.15} />
              </>
            ) : background === 'paper' ? (
              <Line x1="0" y1="18" x2="24" y2="18" stroke={pattern} strokeWidth="0.7" opacity={0.2} />
            ) : (
              <>
                <Circle cx="5" cy="5" r="0.7" fill={pattern} opacity={0.18} />
                <Circle cx="18" cy="18" r="0.7" fill={pattern} opacity={0.14} />
              </>
            )}
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#vision-${background})`} />
      </Svg>
    </View>
  );
}
