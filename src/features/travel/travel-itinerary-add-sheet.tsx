import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, IconButton } from '@/components/primitives';
import { fontFamilies, radii, spacing } from '@/design-system';
import {
  ITEM_KINDS,
  TravelItineraryForm,
} from '@/features/travel/travel-itinerary-form';
import { itinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';
import { ItinerarySheetSubmitButton } from '@/features/travel/travel-itinerary-sheet-fields';
import type { TravelItemKind } from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

type FormProps = Omit<ComponentProps<typeof TravelItineraryForm>, 'kind' | 'hideSubmit'>;

function sheetSubtitle(kind: TravelItemKind): string {
  switch (kind) {
    case 'stay':
      return 'Add your stay details to keep everything organized';
    case 'flight':
      return 'Add your flight details to keep everything organized';
    case 'rental':
      return 'Add your rental details to keep everything organized';
    case 'moment':
      return 'Capture a moment from the trip';
    default:
      return 'Add details to keep everything organized';
  }
}

/**
 * In-tree overlay (not a react-native Modal host). System document/photo
 * pickers can present over it without iOS dismissing the sheet or requiring
 * a hide/show gap. Host must render this as a sibling of scroll content
 * (not inside ScrollView).
 */
export function TravelItineraryAddSheet({
  visible,
  kind,
  onClose,
  onAdd,
  ...formProps
}: {
  visible: boolean;
  kind: TravelItemKind;
  onClose: () => void;
} & FormProps) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { s, spacing: rs } = useResponsive();
  const closeSize = Math.max(32, s(36));
  const kindLabel =
    ITEM_KINDS.find((entry) => entry.value === kind)?.label ?? 'Item';
  const title = kind === 'moment' ? 'Add Moment' : `Add ${kindLabel}`;
  const submitLabel = kind === 'moment' ? 'Add Moment' : 'Add to Timeline';
  // Keep room for the status bar; sheet itself is always flush to the screen bottom.
  const sheetMaxHeight = Math.round(windowHeight * 0.92);
  /** Lock height after first layout so expanding fields scroll instead of growing the sheet. */
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) {
      setLockedHeight(null);
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const onSheetLayout = (event: LayoutChangeEvent) => {
    if (lockedHeight != null) return;
    const next = Math.min(Math.round(event.nativeEvent.layout.height), sheetMaxHeight);
    if (next > 0) setLockedHeight(next);
  };

  if (!visible) return null;

  return (
    <View
      accessibilityViewIsModal
      style={[styles.overlay, { backgroundColor: theme.overlayScrim }]}>
      <Pressable
        accessibilityLabel="Close add to timeline"
        onPress={onClose}
        style={styles.backdrop}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
        pointerEvents="box-none"
        style={styles.modalRoot}>
        <View
          onLayout={onSheetLayout}
          style={[
            styles.sheet,
            {
              backgroundColor: chrome.sheetBg,
              maxHeight: sheetMaxHeight,
              height: lockedHeight ?? undefined,
              paddingBottom: Math.max(insets.bottom, rs.sm),
            },
          ]}>
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: chrome.handle }]} />
          </View>

          <View
            style={[
              styles.header,
              {
                paddingHorizontal: rs.lg,
                paddingTop: rs.xs,
                paddingBottom: rs.md,
              },
            ]}>
            <View style={[styles.headerRow, { gap: rs.xs }]}>
              <View style={[styles.headerCopy, { gap: rs.xs }]}>
                <AppText
                  fit
                  numberOfLines={1}
                  style={[
                    styles.title,
                    {
                      color: chrome.title,
                      fontSize: Math.max(26, s(28)),
                      lineHeight: Math.max(32, s(34)),
                    },
                  ]}>
                  {title}
                </AppText>
                <AppText
                  variant="caption"
                  numberOfLines={2}
                  style={{ color: chrome.subtitle, flexShrink: 1, minWidth: 0 }}>
                  {sheetSubtitle(kind)}
                </AppText>
              </View>
              <IconButton
                icon="close"
                size={closeSize}
                background={chrome.closeBg}
                color={chrome.closeIcon}
                accessibilityLabel="Close add to timeline"
                onPress={onClose}
              />
            </View>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            bounces
            style={styles.scroll}
            contentContainerStyle={{
              flexGrow: 0,
              gap: rs.sm,
              paddingHorizontal: rs.lg,
              paddingTop: rs.xs,
              paddingBottom: rs.md,
            }}>
            <TravelItineraryForm
              kind={kind}
              hideSubmit
              onAdd={onAdd}
              {...formProps}
            />
          </ScrollView>

          <View
            style={[
              styles.footer,
              {
                paddingHorizontal: rs.lg,
                paddingTop: rs.sm,
                paddingBottom: rs.xs,
              },
            ]}>
            <ItinerarySheetSubmitButton
              label={submitLabel}
              onPress={onAdd}
              icon={kind === 'moment' ? 'photo' : 'calendar-add'}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 50,
    elevation: 50,
  },
  /** Full-screen scrim behind the sheet — must not sit above sheet controls. */
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalRoot: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderCurve: 'continuous',
    overflow: 'hidden',
    width: '100%',
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radii.pill,
  },
  header: {},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerCopy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fontFamilies.serif,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  scroll: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
  },
  footer: {},
});
