import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import {
    BackHandler,
    Keyboard,
    type KeyboardEvent,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlurView } from 'expo-blur';
import { radii } from '@/design-system';
import {
    ITEM_KINDS,
    TravelItineraryForm,
} from '@/features/travel/travel-itinerary-form';
import { ItinerarySheetSubmitButton } from '@/features/travel/travel-itinerary-sheet-fields';
import { TravelSheetHeader } from '@/features/travel/travel-sheet';
import type { TravelItemKind } from '@/features/travel/types';
import { usePerformanceTier } from '@/hooks/use-performance-tier';
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
  const { allowsBlur } = usePerformanceTier();
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const { spacing: rs } = useResponsive();
  const [keyboardInset, setKeyboardInset] = useState(0);
  const dark = theme.name === 'dark';
  const kindLabel =
    ITEM_KINDS.find((entry) => entry.value === kind)?.label ?? 'Item';
  const title =
    kind === 'moment' ? 'Add Moment' : kind === 'flight' ? 'Add Flights' : `Add ${kindLabel}`;
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

  useEffect(() => {
    if (!visible) {
      setKeyboardInset(0);
      return;
    }
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const updateInset = (event: KeyboardEvent) => {
      Keyboard.scheduleLayoutAnimation(event);
      const { height: kbHeight, screenY, width: kbWidth } = event.endCoordinates;
      // Floating / side IMEs should not lift the sheet; docked IMEs must.
      const fullWidth = kbWidth >= windowWidth * 0.8;
      if (!fullWidth) {
        setKeyboardInset(0);
        return;
      }
      const fromScreenY = Math.max(0, windowHeight - screenY - insets.bottom);
      const fromHeight = Math.max(0, kbHeight - insets.bottom);
      setKeyboardInset(fromScreenY > 0 ? fromScreenY : fromHeight);
    };
    const showSubscription = Keyboard.addListener(showEvent, updateInset);
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [visible, insets.bottom, windowHeight, windowWidth]);

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
              backgroundColor: 'transparent',
              borderColor: dark
                ? 'rgba(255,255,255,0.22)'
                : 'rgba(255,255,255,0.7)',
              maxHeight: sheetMaxHeight,
              // Lift the whole sheet above the soft keyboard (chat composer pattern).
              // Safe-area pad stays on the footer so glass paints flush to the floor.
              marginBottom: keyboardInset,
            },
          ]}>
          {Platform.OS === 'android' ? (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                dark ? styles.androidGlassDark : styles.androidGlassLight,
              ]}
            />
          ) : (
            <>
              <BlurView
                intensity={allowsBlur ? 56 : 0}
                tint={dark ? 'dark' : 'light'}
                pointerEvents="none"
                style={StyleSheet.absoluteFill}
              />
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: dark
                      ? allowsBlur
                        ? 'rgba(12, 16, 24, 0.55)'
                        : 'rgba(12, 16, 24, 0.82)'
                      : allowsBlur
                        ? 'rgba(255, 255, 255, 0.62)'
                        : 'rgba(255, 255, 255, 0.9)',
                  },
                ]}
              />
            </>
          )}
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
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
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
                paddingBottom: Math.max(insets.bottom, rs.sm),
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
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
    overflow: 'hidden',
    width: '100%',
  },
  androidGlassLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    experimental_backgroundImage:
      'linear-gradient(165deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.64) 48%, rgba(255,255,255,0.8) 100%)',
  },
  androidGlassDark: {
    backgroundColor: 'rgba(12, 16, 24, 0.72)',
    experimental_backgroundImage:
      'linear-gradient(165deg, rgba(36,42,54,0.78) 0%, rgba(12,16,24,0.62) 50%, rgba(8,12,18,0.76) 100%)',
  },
  header: {},
  scroll: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
  },
  footer: {},
});
