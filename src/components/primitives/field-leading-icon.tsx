import { View } from 'react-native';

import type { AppIconName } from '@/design-system';
import { radii } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

import { Symbol } from './symbol';

export { fieldLeadingIconRowStyle } from './field-leading-icon-style';

/** Shared leading-icon column so Input / DateField / TimeField placeholders share one x-origin. */
export function FieldLeadingIcon({
  name,
  backgroundColor,
  color,
}: {
  name: AppIconName | (string & {});
  /** When set, renders a rounded square plate behind the glyph (sheet chrome). */
  backgroundColor?: string;
  color?: string;
}) {
  const theme = useTheme();
  const { iconSizes, s } = useResponsive();
  const slot = iconSizes.sm;
  const plate = backgroundColor ? Math.max(slot + 10, s(32)) : slot;

  return (
    <View
      style={{
        width: plate,
        height: plate,
        borderRadius: backgroundColor ? radii.sm : 0,
        borderCurve: backgroundColor ? 'continuous' : undefined,
        backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        flexShrink: 0,
      }}>
      <Symbol name={name} size="sm" color={color ?? theme.textSecondary} />
    </View>
  );
}
