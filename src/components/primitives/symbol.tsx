import { SymbolView } from 'expo-symbols';

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

/** Cross-platform symbol (SF Symbol on iOS, Material Symbol on Android/web) with theme-aware default tint. */
export function Symbol({ name, size = 'md', color }: SymbolProps) {
  const theme = useTheme();
  const { iconSizes, s } = useResponsive();
  const resolved = typeof size === 'number' ? s(size) : iconSizes[size];
  return (
    <SymbolView
      name={resolveAppIcon(name)}
      size={resolved}
      tintColor={color ?? theme.textPrimary}
      style={{ width: resolved, height: resolved }}
    />
  );
}
