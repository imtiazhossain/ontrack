import { View } from 'react-native';

import type { AppIconName } from '@/design-system';
import { radii } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

import { fieldLeadingIconPlateSize } from './field-leading-icon-style';
import { Symbol } from './symbol';

export {
  fieldLeadingIconPlateSize,
  fieldLeadingIconRowStyle,
} from './field-leading-icon-style';

/** Shared leading-icon column so Input / DateField / TimeField placeholders share one x-origin. */
export function FieldLeadingIcon({
  name,
  backgroundColor,
  color,
  size,
}: {
  name: AppIconName | (string & {});
  /** When set, renders a rounded square plate behind the glyph (sheet chrome). */
  backgroundColor?: string;
  color?: string;
  /** Override plate edge length (e.g. StackedIconField matching label+value). */
  size?: number;
}) {
  const theme = useTheme();
  const { iconSizes, s } = useResponsive();
  const plate =
    size
    ?? fieldLeadingIconPlateSize({
      iconSize: iconSizes.sm,
      s,
      withPlate: Boolean(backgroundColor),
    });

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
