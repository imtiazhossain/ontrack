import type { ComponentProps } from 'react';
import { useEffect } from 'react';
import {
    BackHandler,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radii } from '@/design-system';
import {
    ITEM_KINDS,
    TravelItineraryForm,
} from '@/features/travel/travel-itinerary-form';
import { itinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';
import { ItinerarySheetSubmitButton } from '@/features/travel/travel-itinerary-sheet-fields';
import { TravelSheetHeader } from '@/features/travel/travel-sheet';
import type { TravelItemKind } from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds } from '@/utils/agent-ui';

type FormProps = Omit<ComponentProps<typeof TravelItineraryForm>, 'kind' | 'hideSubmit'>;

function sheetSubtitle(kind: TravelItemKind): string {
  switch (kind) {
    case 'stay':
      return 'Add your stay details to keep everything organized';
    case 'flight':
      return 'Add your flight details to keep everything organized';
    case 'rental':
      return 'Add your rental details to keep everything organized';
    case 'transport':
      return 'Add route, schedule, ticket, and fare details';
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
  const { spacing: rs } = useResponsive();
  const kindLabel =
    ITEM_KINDS.find((entry) => entry.value === kind)?.label ?? 'Item';
  const title = kind === 'moment' ? 'Add Moment' : `Add ${kindLabel}`;
  const submitLabel = kind === 'moment' ? 'Add Moment' : 'Add to Timeline';
  // Keep room for the status bar; sheet itself is always flush to the screen bottom.
  const sheetMaxHeight = Math.round(windowHeight * 0.92);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

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
          style={[
            styles.sheet,
            {
              backgroundColor: chrome.sheetBg,
              maxHeight: sheetMaxHeight,
              paddingBottom: Math.max(insets.bottom, rs.sm),
            },
          ]}>
          <View
            style={[
              styles.header,
              {
                paddingHorizontal: rs.lg,
              },
            ]}>
            <TravelSheetHeader
              eyebrow="Itinerary"
              title={title}
              subtitle={sheetSubtitle(kind)}
              closeAccessibilityLabel="Close add to timeline"
              closeTestID={AgentUiIds.travel.itineraryAdd.close}
              onClose={onClose}
            />
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
              testID={AgentUiIds.travel.itineraryAdd.submit}
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
  header: {},
  scroll: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
  },
  footer: {},
});
