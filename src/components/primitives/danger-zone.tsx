import {
    Children,
    type PropsWithChildren,
    type ReactNode,
} from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { radii } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentTestId } from '@/utils/agent-ui';

import { GlassPlate } from './glass-plate';
import { SectionHeader } from './section-header';

type DangerZoneProps = PropsWithChildren<{
  /** Defaults to "Danger Zone" (title-cased by SectionHeader). */
  title?: string;
  testID?: string;
  style?: ViewStyle;
}>;

/**
 * Danger zone: overline title + red-rimmed glass panel for irreversible actions.
 * Place `DestructiveSection flush` (or other danger CTAs) as children.
 */
export function DangerZone({
  title = 'Danger Zone',
  testID,
  style,
  children,
}: DangerZoneProps) {
  const theme = useTheme();
  const { spacing } = useResponsive();
  const items = Children.toArray(children).filter(Boolean) as ReactNode[];

  return (
    <AgentTestId
      testID={testID}
      label={title}
      style={[{ gap: spacing.sm, width: '100%' }, style]}>
      <SectionHeader title={title} flush titleColor="danger" />
      <GlassPlate
        style={[
          styles.panel,
          {
            borderColor: theme.danger,
            borderWidth: StyleSheet.hairlineWidth * 2,
            padding: spacing.md,
            gap: spacing.md,
          },
        ]}>
        {items.map((child, index) => (
          <View key={index} style={{ gap: spacing.md }}>
            {index > 0 ? (
              <View
                style={[styles.divider, { backgroundColor: theme.danger }]}
              />
            ) : null}
            {child}
          </View>
        ))}
      </GlassPlate>
    </AgentTestId>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: '100%',
    borderRadius: radii.md,
    borderCurve: 'continuous',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    opacity: 0.45,
  },
});
