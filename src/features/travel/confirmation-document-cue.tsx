import { Image } from 'expo-image';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Symbol } from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

import {
  confirmationUrisForDisplay,
  isImageConfirmationUri,
  openConfirmationAttachments,
} from './confirmation-attachments';

export function ConfirmationDocumentCue({
  uris,
  kind,
  accessibilityLabel = 'View uploaded confirmation',
}: {
  uris?: string[];
  kind: 'flight' | 'rental' | 'stay';
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const { s } = useResponsive();
  const { width } = useWindowDimensions();
  const [viewerOpen, setViewerOpen] = useState(false);
  const openableUris = confirmationUrisForDisplay(uris, kind);
  if (!openableUris.length) return null;

  const imageUris = openableUris.filter(isImageConfirmationUri);
  const open = () => {
    // PDFs and other docs open in system Preview / Quick Look (no share sheet).
    // Image-only uploads keep the in-app zoom viewer.
    if (imageUris.length > 0 && imageUris.length === openableUris.length) {
      setViewerOpen(true);
      return;
    }
    void openConfirmationAttachments(openableUris);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={8}
        onPress={open}
        style={({ pressed }) => [
          styles.cue,
          {
            borderColor: theme.accentPrimary,
            backgroundColor: theme.backgroundElevated,
            minHeight: Math.max(44, s(40)),
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <Symbol name="receipt" size="sm" color={theme.accentPrimary} />
        <AppText variant="callout" color="accent" fit style={styles.cueLabel}>
          View Confirmation
        </AppText>
        <Symbol name="chevron-right" size="sm" color={theme.accentPrimary} />
      </Pressable>

      <Modal
        visible={viewerOpen}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setViewerOpen(false)}>
        <SafeAreaView
          edges={['top', 'bottom']}
          style={[styles.viewer, { backgroundColor: theme.backgroundPrimary }]}>
          <View style={styles.viewerHeader}>
            <AppText variant="subheading" fit style={styles.cueLabel}>
              Confirmation
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close confirmation"
              hitSlop={12}
              onPress={() => setViewerOpen(false)}
              style={({ pressed }) => [
                styles.closeButton,
                {
                  minHeight: Math.max(44, s(44)),
                  minWidth: Math.max(44, s(44)),
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <Symbol name="close" size="md" color={theme.textPrimary} />
            </Pressable>
          </View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pages}>
            {imageUris.map((uri) => (
              <ScrollView
                key={uri}
                maximumZoomScale={4}
                minimumZoomScale={1}
                style={{ width }}
                contentContainerStyle={styles.page}>
                <Image
                  source={{ uri }}
                  style={{ width: width - spacing.lg * 2, height: width * 1.4 }}
                  contentFit="contain"
                  accessibilityLabel="Uploaded confirmation page"
                />
              </ScrollView>
            ))}
          </ScrollView>
          {imageUris.length > 1 ? (
            <AppText variant="caption" color="secondary" style={styles.pageHint}>
              Swipe for More Pages
            </AppText>
          ) : null}
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  cue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  cueLabel: { flexShrink: 1, minWidth: 0, flex: 1 },
  viewer: { flex: 1 },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  closeButton: { alignItems: 'center', justifyContent: 'center' },
  pages: { alignItems: 'center' },
  page: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  pageHint: { textAlign: 'center', paddingBottom: spacing.md },
});
