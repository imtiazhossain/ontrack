import { useMemo } from 'react';
import { View } from 'react-native';
import { SvgUri } from 'react-native-svg';

import {
  iconifySvgUrl,
  resolveAvatarColor,
  type ProfileAvatarMeta,
} from '@/features/account/profile-avatar-model';

/** Renders an Iconify SVG tinted with the avatar color. */
export function IconifyIcon({
  iconId,
  color,
  size,
}: {
  iconId: string;
  color?: string;
  size: number;
}) {
  const tint = resolveAvatarColor({ kind: 'icon', color } as ProfileAvatarMeta);
  const uri = useMemo(() => iconifySvgUrl(iconId, tint), [iconId, tint]);
  if (!uri) return <View style={{ width: size, height: size }} />;
  return <SvgUri uri={uri} width={size} height={size} />;
}
