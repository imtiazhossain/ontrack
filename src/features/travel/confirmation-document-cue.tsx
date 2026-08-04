import { Image } from 'expo-image';
import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, ScreenHeader } from '@/components/primitives';
import { spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds } from '@/utils/agent-ui';

import {
  confirmationUrisForDisplay,
  isImageConfirmationUri,
  openConfirmationAttachments,
} from './confirmation-attachments';

export function ConfirmationDocumentCue({
  uris,
  kind,
  accentColor: _accentColor,
  accessibilityLabel = 'View uploaded confirmation',
}: {
  uris?: string[];
  kind: 'flight' | 'rental' | 'stay' | 'transport';
  accentColor?: string;
  accessibilityLabel?: string;
}) {
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [viewerOpen, setViewerOpen] = useState(false);
  const openableUris = confirmationUrisForDisplay(uris, kind);
  if (!openableUris.length) return null;

  const imageUris = openableUris.filter(isImageConfirmationUri);
  const open = () => {
    if (imageUris.length > 0 && imageUris.length === openableUris.length) {
      setViewerOpen(true);
      return;
    }
    void openConfirmationAttachments(openableUris);
  };

  return (
    <>
      <Button
        size="sm"
        icon="receipt"
        testID={AgentUiIds.travel.confirmation.open(kind)}
        accessibilityLabel={accessibilityLabel}
        onPress={open}
        style={styles.openButton}>
        View Confirmation
      </Button>

      <Modal
        visible={viewerOpen}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setViewerOpen(false)}>
        <View
          style={[
            styles.viewer,
            {
              backgroundColor: theme.backgroundPrimary,
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            },
          ]}>
          <ScreenHeader
            title="Confirmation"
            onClose={() => setViewerOpen(false)}
            closeAccessibilityLabel="Close confirmation"
            closeTestID={AgentUiIds.travel.confirmation.close}
            style={styles.header}
          />
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
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  openButton: { alignSelf: 'center' },
  viewer: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  pages: { alignItems: 'center' },
  page: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  pageHint: { textAlign: 'center', paddingBottom: spacing.md },
});
