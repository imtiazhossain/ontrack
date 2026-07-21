import { SymbolView } from 'expo-symbols';

import { iconSizes, resolveAppIcon, type AppIconName } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';

interface SymbolProps {
  /** Semantic app icon name. Legacy persisted SF Symbol strings also resolve. */
  name: AppIconName | (string & {});
  size?: keyof typeof iconSizes | number;
  color?: string;
}

/** Cross-platform symbol (SF Symbol on iOS, Material Symbol on Android/web) with theme-aware default tint. */
export function Symbol({ name, size = 'md', color }: SymbolProps) {
  const theme = useTheme();
  const resolved = typeof size === 'number' ? size : iconSizes[size];
  return (
    <SymbolView
      name={resolveAppIcon(name)}
      size={resolved}
      tintColor={color ?? theme.textPrimary}
      style={{ width: resolved, height: resolved }}
    />
  );
}
