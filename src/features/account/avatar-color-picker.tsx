import { useEffect, useRef, useState } from 'react';
import ColorPicker, {
  HueSlider,
  Panel1,
} from 'reanimated-color-picker';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/primitives';
import { radii } from '@/design-system';
import {
  DEFAULT_AVATAR_COLOR,
  normalizeAvatarColor,
} from '@/features/account/profile-avatar-model';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

type AvatarColorPickerProps = {
  color?: string;
  onChange: (hex: string) => void;
  /** Optional: parent can disable ScrollView while dragging the picker. */
  onDragStart?: () => void;
  onDragEnd?: () => void;
};

function resolveTint(
  color: string | undefined,
  accent: string,
): string {
  return (
    normalizeAvatarColor(color) ??
    normalizeAvatarColor(accent) ??
    DEFAULT_AVATAR_COLOR
  );
}

/** Saturation/brightness panel + hue slider for avatar tint (opaque hex only). */
export function AvatarColorPicker({
  color,
  onChange,
  onDragStart,
  onDragEnd,
}: AvatarColorPickerProps) {
  const theme = useTheme();
  const { spacing, s } = useResponsive();
  const fromProps = resolveTint(color, theme.accentPrimary);
  // Local live value so controlled parent updates don't yank the thumb mid-drag.
  const [live, setLive] = useState(fromProps);
  const dragging = useRef(false);
  const ready = useRef(false);
  const sliderHeight = Math.max(28, s(32));

  useEffect(() => {
    ready.current = false;
    const handle = setTimeout(() => {
      ready.current = true;
    }, 200);
    return () => clearTimeout(handle);
  }, []);

  useEffect(() => {
    if (dragging.current) return;
    setLive(fromProps);
  }, [fromProps]);

  const commit = (hex: string) => {
    if (!ready.current) return;
    const next = normalizeAvatarColor(hex);
    if (!next) return;
    setLive(next);
    onChange(next);
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="caption" color="secondary" fit>
        Color
      </AppText>
      <ColorPicker
        value={live.toLowerCase()}
        style={styles.picker}
        onChangeJS={(colors) => {
          if (!ready.current) return;
          if (!dragging.current) {
            dragging.current = true;
            onDragStart?.();
          }
          commit(colors.hex);
        }}
        onCompleteJS={(colors) => {
          if (!ready.current) return;
          dragging.current = false;
          onDragEnd?.();
          commit(colors.hex);
        }}>
        <Panel1
          style={[
            styles.panel,
            {
              borderRadius: radii.md,
              height: Math.max(140, s(160)),
              borderColor: theme.separator,
            },
          ]}
          thumbShape="ring"
          thumbSize={Math.max(22, s(24))}
        />
        <HueSlider
          style={[
            styles.slider,
            {
              height: sliderHeight,
              borderRadius: radii.pill,
              borderColor: theme.separator,
            },
          ]}
          thumbShape="ring"
          thumbSize={Math.max(22, s(24))}
        />
      </ColorPicker>
      <AppText variant="caption" color="secondary" fit style={styles.hex}>
        {live}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  picker: {
    width: '100%',
    gap: 12,
  },
  panel: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  slider: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth,
  },
  hex: {
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
