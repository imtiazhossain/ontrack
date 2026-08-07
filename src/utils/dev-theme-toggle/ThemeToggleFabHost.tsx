import { type ReactNode, useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import { toggleDevThemeFabVisible } from './visibility';

type Props = {
  children: ReactNode;
};

/**
 * Page-wide triple-tap shows/hides the __DEV__ theme FAB.
 * Wraps app content (not FullWindowOverlay) so touches stay pass-through.
 */
export function ThemeToggleFabHost({ children }: Props) {
  const onTripleTap = useCallback(() => {
    if (!__DEV__) return;
    toggleDevThemeFabVisible();
  }, []);

  const gesture = useMemo(
    () =>
      Gesture.Tap()
        .enabled(__DEV__)
        .numberOfTaps(3)
        .maxDuration(350)
        .maxDistance(12)
        .cancelsTouchesInView(false)
        .onEnd(() => {
          runOnJS(onTripleTap)();
        }),
    [onTripleTap],
  );

  if (!__DEV__) {
    return <>{children}</>;
  }

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.fill} collapsable={false}>
        {children}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
