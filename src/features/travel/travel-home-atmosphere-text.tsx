import { type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

type TravelHomeAtmosphereTextProps = {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  numberOfLines?: number;
  maxFontSizeMultiplier?: number;
  allowFontScaling?: boolean;
  accessibilityRole?: 'text';
  accessibilityLabel?: string;
};

/**
 * Atmosphere-band copy wrapper — crisp ink only (no glow / textShadow).
 * Soft halos looked blurry over bright sky when scrolling the photo wash.
 */
export function TravelHomeAtmosphereText({
  children,
  style,
  containerStyle,
  numberOfLines,
  maxFontSizeMultiplier,
  allowFontScaling = true,
  accessibilityRole,
  accessibilityLabel,
}: TravelHomeAtmosphereTextProps) {
  return (
    <View style={[styles.wrap, containerStyle]}>
      <Text
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        allowFontScaling={allowFontScaling}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        numberOfLines={numberOfLines}
        style={style}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
});
