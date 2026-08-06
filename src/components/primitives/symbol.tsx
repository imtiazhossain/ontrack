import { SymbolView } from 'expo-symbols';
import { Platform, View } from 'react-native';

import { resolveAppIcon, type AppIconName } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

export type SymbolSize =
  | keyof ReturnType<typeof useResponsive>['iconSizes']
  | number;

interface SymbolProps {
  /** Semantic app icon name. Legacy persisted SF Symbol strings also resolve. */
  name: AppIconName | (string & {});
  size?: SymbolSize;
  color?: string;
}

/**
 * Material Symbols `flight` is nose-up; SF Symbols `airplane` is ~45° NE.
 * Tilt Android/web so every `flight` usage matches iOS. Slight scale keeps
 * wing tips inside the layout box after rotation.
 */
function androidFlightMatchStyle(size: number) {
  return {
    width: size,
    height: size,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    overflow: 'visible' as const,
    transform: [{ rotate: '45deg' }, { scale: 0.9 }],
  };
}

/** Cross-platform symbol (SF Symbol on iOS, Material Symbol on Android/web) with theme-aware default tint. */
export function Symbol({ name, size = 'md', color }: SymbolProps) {
  const theme = useTheme();
  const { iconSizes, s } = useResponsive();
  const resolved = typeof size === 'number' ? s(size) : iconSizes[size];
  const mapping = resolveAppIcon(name);
  const matchIosFlight =
    Platform.OS !== 'ios' && mapping.android === 'flight';

  const view = (
    <SymbolView
      name={mapping}
      size={resolved}
      tintColor={color ?? theme.textPrimary}
      style={{ width: resolved, height: resolved }}
    />
  );

  if (!matchIosFlight) return view;

  return <View style={androidFlightMatchStyle(resolved)}>{view}</View>;
}
