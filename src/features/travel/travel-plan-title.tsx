import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

import { fontFamilies } from '@/design-system';

/**
 * Trip title for card + hero headers.
 * Stays at the authored size (keeps hierarchy over the destination caption),
 * wraps to at most two lines, then truncates with an ellipsis.
 */
export function TravelPlanTitle({
  title,
  fontSize,
  style,
}: {
  title: string;
  fontSize: number;
  style?: StyleProp<TextStyle>;
}) {
  const lineHeight = fontSize * 1.08;

  return (
    <View style={styles.container}>
      <Text
        allowFontScaling
        maxFontSizeMultiplier={1.15}
        numberOfLines={2}
        ellipsizeMode="tail"
        style={[
          styles.title,
          style,
          {
            fontSize,
            lineHeight,
            letterSpacing: -0.65,
          },
        ]}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minWidth: 0,
    flexShrink: 1,
  },
  title: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
    width: '100%',
  },
});
