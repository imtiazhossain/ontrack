import {
  Children,
  cloneElement,
  isValidElement,
  type PropsWithChildren,
  type ReactElement,
} from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { radii } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

type GroupedChildProps = {
  grouped?: boolean;
};

/**
 * Single sunken panel for stacked settings rows (iOS Settings–style).
 * Injects `grouped` into direct children that accept it so borders aren’t doubled.
 */
export function SettingsGroup({
  children,
  style,
  testID,
}: PropsWithChildren<{ style?: ViewStyle; testID?: string }>) {
  const theme = useTheme();
  const { spacing } = useResponsive();
  const items = Children.toArray(children).filter(Boolean);

  return (
    <View
      testID={testID}
      style={[
        styles.group,
        {
          backgroundColor: theme.backgroundElevated,
          borderColor: theme.separator,
        },
        style,
      ]}>
      {items.map((child, index) => {
        const content =
          isValidElement(child) && typeof child.type !== 'string'
            ? cloneElement(child as ReactElement<GroupedChildProps>, { grouped: true })
            : child;
        return (
          <View key={index}>
            {index > 0 ? (
              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.separator, marginLeft: spacing.md },
                ]}
              />
            ) : null}
            {content}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
