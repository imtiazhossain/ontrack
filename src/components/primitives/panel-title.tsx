import type { StyleProp, TextStyle } from 'react-native';

import { AppText } from './app-text';
import { fieldTitleCase } from './field-title-case';

/** In-card / panel chrome title — always Title Case via `fieldTitleCase`. */
export function PanelTitle({
  children,
  style,
  color,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
  color?: 'primary' | 'secondary' | 'tertiary' | 'accent' | 'onAccent' | 'danger' | 'success';
}) {
  return (
    <AppText variant="callout" bold fit color={color} style={style}>
      {fieldTitleCase(children)}
    </AppText>
  );
}
