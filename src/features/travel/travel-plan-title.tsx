import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';

import { AppText } from '@/components/primitives';
import { fontFamilies } from '@/design-system';

const MINIMUM_SCALE = 0.42;
const SCALE_STEP = 0.08;

/** Keeps a trip title cohesive: wrap twice first, then scale type and leading together. */
export function TravelPlanTitle({
  title,
  fontSize,
  style,
}: {
  title: string;
  fontSize: number;
  style?: StyleProp<TextStyle>;
}) {
  const [scale, setScale] = useState(1);

  useEffect(() => setScale(1), [fontSize, title]);

  const adjustForMeasuredLines = useCallback((lineCount: number) => {
    if (lineCount <= 2) return;
    setScale((current) => Math.max(MINIMUM_SCALE, current - SCALE_STEP));
  }, []);

  const scaledFontSize = fontSize * scale;
  const scaledLineHeight = scaledFontSize * 1.05;
  const textStyle = [
    styles.title,
    style,
    {
      fontSize: scaledFontSize,
      lineHeight: scaledLineHeight,
      letterSpacing: -0.65 * scale,
    },
  ];

  return (
    <View style={styles.container}>
      <AppText
        style={textStyle}
        numberOfLines={scale <= MINIMUM_SCALE ? 2 : undefined}
        onTextLayout={(event) => adjustForMeasuredLines(event.nativeEvent.lines.length)}>
        {title}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minWidth: 0,
  },
  title: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
  },
});
