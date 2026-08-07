import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
    type StyleProp,
    type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button } from '@/components/primitives';
import { spacing } from '@/design-system';
import { TravelScreenHeader } from '@/features/travel/travel-screen-header';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds } from '@/utils/agent-ui';

import {
    confirmationUrisForDisplay,
    isImageConfirmationUri,
    openConfirmationAttachments,
    resolveConfirmationUrisForOpen,
} from './confirmation-attachments';

export type ConfirmationDocumentTrigger = (args: {
  open: () => void;
  loading: boolean;
  accessibilityLabel: string;
  testID: string;
}) => ReactNode;

export function ConfirmationDocumentCue({
  uris,
  kind,
  accentColor: _accentColor,
  accessibilityLabel = 'View uploaded confirmation',
  label = 'Confirmation',
  icon,
  size = 'sm',
  style,
  testID,
  trigger,
}: {
  uris?: string[];
  kind: 'flight' | 'rental' | 'stay' | 'transport';
  accentColor?: string;
  accessibilityLabel?: string;
  /** Visible button copy; defaults to “Confirmation”. */
  label?: string;
  icon?: 'note' | 'scan-document' | 'copy';
  size?: 'sm' | 'md';
  /** Lets action rows stretch the button instead of centering it. */
  style?: StyleProp<ViewStyle>;
  /** Override the default kind-scoped open control id. */
  testID?: string;
  /** Replace the default button with a custom open control. */
  trigger?: ConfirmationDocumentTrigger;
}) {
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [viewerImageUris, setViewerImageUris] = useState<string[]>([]);
  const openableUris = confirmationUrisForDisplay(uris, kind);
  if (!openableUris.length) return null;

  const resolvedTestID = testID ?? AgentUiIds.travel.confirmation.open(kind);
  const open = () => {
    if (opening) return;
    setOpening(true);
    void (async () => {
      const resolved = await resolveConfirmationUrisForOpen(openableUris);
      const images = resolved.filter(isImageConfirmationUri);
      if (images.length > 0 && images.length === resolved.length) {
        setViewerImageUris(images);
        setViewerOpen(true);
        return;
      }
      await openConfirmationAttachments(resolved);
    })()
      .catch((error) => {
        if (__DEV__) console.warn('[ConfirmationDocumentCue] open failed', error);
      })
      .finally(() => {
        setOpening(false);
      });
  };

  return (
    <>
      {trigger ? (
        trigger({
          open,
          loading: opening,
          accessibilityLabel,
          testID: resolvedTestID,
        })
      ) : (
        <Button
          size={size}
          icon={icon}
          loading={opening}
          testID={resolvedTestID}
          accessibilityLabel={accessibilityLabel}
          onPress={open}
          style={[style ? null : styles.openButton, style]}>
          {label}
        </Button>
      )}

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
          <TravelScreenHeader
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
            {viewerImageUris.map((uri) => (
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
          {viewerImageUris.length > 1 ? (
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
