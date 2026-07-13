import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { iconSizes } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';

interface SymbolProps {
  name: SymbolViewProps['name'];
  size?: keyof typeof iconSizes | number;
  color?: string;
}

/** SF Symbol with theme-aware default tint. */
export function Symbol({ name, size = 'md', color }: SymbolProps) {
  const theme = useTheme();
  const resolved = typeof size === 'number' ? size : iconSizes[size];
  return (
    <SymbolView
      name={name}
      size={resolved}
      tintColor={color ?? theme.textPrimary}
      style={{ width: resolved, height: resolved }}
    />
  );
}
