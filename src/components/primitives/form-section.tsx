import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useResponsive } from '@/hooks/use-responsive';

import { AppText } from './app-text';
import { ErrorMessage } from './error-message';

export interface FormSectionProps extends PropsWithChildren {
  title?: string;
  description?: string;
  error?: string;
  style?: ViewStyle;
}

/** Consistent field grouping and supporting-copy hierarchy for forms. */
export function FormSection({ title, description, error, children, style }: FormSectionProps) {
  const { spacing } = useResponsive();
  return (
    <View style={[styles.root, { gap: spacing.md }, style]}>
      {title || description ? (
        <View style={{ gap: spacing.xs }}>
          {title ? (
            <AppText variant="subheading" bold fit>
              {title}
            </AppText>
          ) : null}
          {description ? (
            <AppText variant="callout" color="secondary">
              {description}
            </AppText>
          ) : null}
        </View>
      ) : null}
      {children}
      {error ? <ErrorMessage message={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ root: { width: '100%' } });
