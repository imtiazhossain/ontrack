import type { StyleProp, TextStyle } from 'react-native';

import { AppText } from './app-text';
import { fieldTitleCase } from './field-title-case';

export { fieldTitleCase } from './field-title-case';

/** Persistent stacked field title (caption above the value). */
export function StackedFieldLabel({
  children,
  color,
  style,
  align = 'start',
}: {
  children: string;
  color?: string;
  style?: StyleProp<TextStyle>;
  align?: 'start' | 'center';
}) {
  return (
    <AppText
      variant="caption"
      fit
      numberOfLines={1}
      style={[
        {
          flexShrink: 1,
          minWidth: 0,
          zIndex: 1,
          color,
          ...(align === 'center' ? { textAlign: 'center' as const, width: '100%' } : null),
        },
        style,
      ]}>
      {fieldTitleCase(children)}
    </AppText>
  );
}
