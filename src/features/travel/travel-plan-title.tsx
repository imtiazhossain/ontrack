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
  const [renderedLines, setRenderedLines] = useState<string[]>();

  useEffect(() => {
    setScale(1);
    setRenderedLines(undefined);
  }, [fontSize, title]);

  const adjustForMeasuredLines = useCallback((lines: readonly { text: string }[]) => {
    if (lines.length > 2) {
      setScale((current) => Math.max(MINIMUM_SCALE, current - SCALE_STEP));
      return;
    }
    setRenderedLines(lines.map((line) => line.text.trim()).filter(Boolean));
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
      {renderedLines ? (
        <AppText
          style={[textStyle, { height: scaledLineHeight * renderedLines.length }]}
          fit
          fitMinimumScale={MINIMUM_SCALE}
          numberOfLines={renderedLines.length}>
          {title}
        </AppText>
      ) : (
        <AppText
          key={scale}
          style={textStyle}
          numberOfLines={scale <= MINIMUM_SCALE ? 2 : undefined}
          onTextLayout={(event) => adjustForMeasuredLines(event.nativeEvent.lines)}>
          {title}
        </AppText>
      )}
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
