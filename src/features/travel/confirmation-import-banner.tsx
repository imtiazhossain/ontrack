import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import { radii } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

import {
  confirmationUrisForDisplay,
  isImageConfirmationUri,
  openConfirmationAttachments,
} from './confirmation-attachments';

export function ConfirmationImportBanner({
  fileName,
  uris,
  kind,
  note,
}: {
  fileName: string;
  uris?: string[];
  kind: 'flight' | 'rental' | 'stay';
  /** Extra review guidance (e.g. round-trip expands on save). */
  note?: string;
}) {
  const theme = useTheme();
  const { s, spacing: rs } = useResponsive();
  const openableUris = confirmationUrisForDisplay(uris, kind);
  const canOpen = openableUris.length > 0;
  const imageOnly =
    canOpen && openableUris.length > 0 && openableUris.every(isImageConfirmationUri);

  const open = () => {
    if (!canOpen) return;
    void openConfirmationAttachments(openableUris).catch((error) => {
      if (__DEV__) console.warn('[ConfirmationImportBanner] open failed', error);
    });
  };

  return (
    <Pressable
      accessibilityRole={canOpen ? 'link' : undefined}
      accessibilityHint={
        canOpen
          ? imageOnly
            ? 'Opens the imported confirmation photos'
            : 'Opens the imported confirmation document'
          : undefined
      }
      accessibilityLabel={
        canOpen ? `Open ${fileName}` : `Imported file ${fileName}`
      }
      disabled={!canOpen}
      onPress={open}
      style={({ pressed }) => [
        styles.banner,
        {
          backgroundColor: theme.accentFaint,
          borderColor: theme.accentPrimary,
          gap: rs.sm,
          minHeight: Math.max(44, s(56)),
          opacity: pressed && canOpen ? 0.82 : 1,
          paddingHorizontal: rs.md,
          paddingVertical: rs.sm,
        },
      ]}>
      <View style={[styles.copy, { gap: rs.xs }]}>
        <View style={[styles.header, { gap: rs.sm }]}>
          <Symbol name="receipt" size="sm" color={theme.accentPrimary} />
          <AppText variant="caption" color="secondary" fit style={styles.shrink}>
            Imported · Review before saving.
          </AppText>
        </View>
        <AppText
          variant="callout"
          color={canOpen ? 'accent' : 'primary'}
          selectable={!canOpen}
          style={styles.fileName}>
          {fileName}
        </AppText>
        {note ? (
          <AppText variant="caption" color="secondary" style={styles.fileName}>
            {note}
          </AppText>
        ) : null}
      </View>
      {canOpen ? (
        <View pointerEvents="none" style={styles.chevronSlot}>
          <Symbol name="chevron-right" size="sm" color={theme.accentPrimary} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  copy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shrink: { flex: 1, flexShrink: 1, minWidth: 0 },
  fileName: {
    flexShrink: 1,
    minWidth: 0,
  },
  chevronSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
