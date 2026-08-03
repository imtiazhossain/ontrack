import type { PropsWithChildren, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Symbol } from '@/components/primitives';
import { appTextStyle, radii, type AppIconName } from '@/design-system';
import {
  itinerarySheetChrome,
  type ItinerarySheetChrome,
} from '@/features/travel/travel-itinerary-sheet-chrome';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useAgentUiTarget } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';

type TravelSheetHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** Optional leading icon for the subtitle row (e.g. location pin). */
  subtitleIcon?: AppIconName;
  onClose: () => void;
  closeAccessibilityLabel: string;
  closeTestID?: string;
  /** Override itinerary chrome colors (e.g. Convert Currency forest palette). */
  chrome?: ItinerarySheetChrome;
  /** Override default top padding (full-screen routes often want 0). */
  paddingTop?: number;
};

/** Canonical editorial header for every travel sheet and sheet-like route. */
export function TravelSheetHeader({
  eyebrow,
  title,
  subtitle,
  subtitleIcon,
  onClose,
  closeAccessibilityLabel,
  closeTestID,
  chrome: chromeProp,
  paddingTop,
}: TravelSheetHeaderProps) {
  const theme = useTheme();
  const chrome = chromeProp ?? itinerarySheetChrome(theme);
  const { s, spacing: rs, typography } = useResponsive();
  const closeSize = Math.max(48, s(50));
  const handleClose = () => {
    haptics.tap();
    Keyboard.dismiss();
    onClose();
  };
  const closeAgent = useAgentUiTarget(closeTestID, {
    label: closeAccessibilityLabel,
    onPress: handleClose,
  });

  return (
    <View
      style={[
        styles.header,
        {
          gap: rs.lg,
          paddingTop: paddingTop ?? rs.md,
          paddingBottom: rs.xl,
        },
      ]}>
      <View style={[styles.headerRow, { gap: rs.md }]}>
        <View style={[styles.headerCopy, { gap: rs.sm }]}>
          <AppText
            variant="overline"
            fit
            numberOfLines={1}
            style={[styles.eyebrow, { color: chrome.ctaFrom }]}>
            {eyebrow}
          </AppText>
          <AppText
            fit
            numberOfLines={1}
            style={[
              styles.title,
              {
                color: chrome.title,
                fontSize: Math.max(36, s(42)),
                lineHeight: Math.max(42, s(48)),
              },
            ]}>
            {title}
          </AppText>
          {subtitle ? (
            <View style={[styles.subtitleRow, { gap: rs.xs }]}>
              {subtitleIcon ? (
                <Symbol name={subtitleIcon} size="sm" color={chrome.icons.location.fg} />
              ) : null}
              <AppText
                fit
                numberOfLines={1}
                style={[
                  styles.subtitle,
                  typography.callout,
                  {
                    color: chrome.subtitle,
                    fontSize: Math.max(15, s(16)),
                    flexShrink: 1,
                    minWidth: 0,
                  },
                ]}>
                {subtitle}
              </AppText>
            </View>
          ) : null}
        </View>
        <Pressable
          ref={closeAgent.ref}
          testID={closeTestID}
          onLayout={closeAgent.onLayout}
          accessibilityRole="button"
          accessibilityLabel={closeAccessibilityLabel}
          hitSlop={8}
          onPress={handleClose}
          style={({ pressed }) => [
            styles.close,
            {
              width: closeSize,
              height: closeSize,
              borderRadius: closeSize / 2,
              backgroundColor: chrome.closeBg,
              borderColor: chrome.fieldBorder,
              opacity: pressed ? 0.7 : 1,
            },
          ]}>
          <Symbol name="close" size="md" color={chrome.title} />
        </Pressable>
      </View>
    </View>
  );
}

type TravelSheetModalProps = PropsWithChildren<{
  visible: boolean;
  eyebrow: string;
  title: string;
  subtitle?: string;
  subtitleIcon?: AppIconName;
  onClose: () => void;
  closeAccessibilityLabel: string;
  closeTestID?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
  /** Optional cap; always clamped to the space below the status bar. */
  maxHeight?: number;
  /** Optional floor so tall forms (e.g. currency) open roomy instead of hugging content. */
  minHeight?: number;
  /**
   * After the first layout while open, keep the sheet at that height so
   * expanding inline content scrolls inside instead of resizing the frame.
   */
  lockHeight?: boolean;
  /** Change to reset scroll (e.g. when switching list ↔ editor). */
  scrollKey?: string | number;
  /** Override default itinerary chrome (e.g. Convert Currency forest palette). */
  chrome?: ItinerarySheetChrome;
}>;

/**
 * Canonical travel sheet frame. New travel sheets should start here so safe
 * area, responsive editorial chrome, scrolling, and dismissal stay consistent.
 */
export function TravelSheetModal({
  visible,
  eyebrow,
  title,
  subtitle,
  subtitleIcon,
  onClose,
  closeAccessibilityLabel,
  closeTestID,
  contentContainerStyle,
  footer,
  maxHeight,
  minHeight,
  lockHeight = false,
  scrollKey,
  chrome: chromeProp,
  children,
}: TravelSheetModalProps) {
  const theme = useTheme();
  const chrome = chromeProp ?? itinerarySheetChrome(theme);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { spacing: rs, layout } = useResponsive();
  const scrollRef = useRef<ScrollView>(null);
  const [lockedHeight, setLockedHeight] = useState<number | undefined>();

  // Cap to space below the status bar. A %-of-parent maxHeight overshoots because
  // modalRoot already pads insets.top, which clipped the header on tall forms.
  const availableHeight = Math.max(320, windowHeight - insets.top - rs.sm);
  const sheetMaxHeight =
    maxHeight !== undefined
      ? Math.min(maxHeight, availableHeight)
      : Math.round(availableHeight * 0.98);
  const sheetMinHeight =
    minHeight !== undefined
      ? Math.min(Math.max(0, minHeight), sheetMaxHeight)
      : undefined;

  useEffect(() => {
    if (!visible) {
      setLockedHeight(undefined);
      return;
    }
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [visible, scrollKey, title]);

  const dismissKeyboardAndClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={dismissKeyboardAndClose}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}>
      <View
        style={[
          styles.modalRoot,
          { backgroundColor: theme.overlayScrim, paddingTop: insets.top },
        ]}>
        <Pressable
          accessibilityLabel={closeAccessibilityLabel}
          onPress={dismissKeyboardAndClose}
          style={[StyleSheet.absoluteFill, styles.dismissLayer]}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
          pointerEvents="box-none"
          style={styles.avoid}>
          <View
            onLayout={(event) => {
              if (!lockHeight || !visible || lockedHeight != null) return;
              const next = Math.round(event.nativeEvent.layout.height);
              if (next > 0) setLockedHeight(next);
            }}
            pointerEvents="auto"
            style={[
              styles.sheet,
              {
                backgroundColor: chrome.sheetBg,
                maxHeight: sheetMaxHeight,
                minHeight: sheetMinHeight,
                height: lockHeight ? lockedHeight : undefined,
                paddingBottom: Math.max(insets.bottom, rs.md),
                paddingHorizontal: layout.screenPadding,
                borderRadius: radii.xl,
              },
            ]}>
            <View onStartShouldSetResponder={() => {
              Keyboard.dismiss();
              return false;
            }}>
              <TravelSheetHeader
                eyebrow={eyebrow}
                title={title}
                subtitle={subtitle}
                subtitleIcon={subtitleIcon}
                onClose={onClose}
                closeAccessibilityLabel={closeAccessibilityLabel}
                closeTestID={closeTestID}
                chrome={chrome}
              />
            </View>
            <ScrollView
              key={scrollKey ?? 'sheet'}
              ref={scrollRef}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              showsVerticalScrollIndicator={false}
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              contentInsetAdjustmentBehavior="never"
              style={styles.scroll}
              contentContainerStyle={[
                styles.content,
                { gap: rs.lg, paddingBottom: footer ? rs.md : rs.xl },
                contentContainerStyle,
              ]}>
              {children}
            </ScrollView>
            {footer ? <View style={{ paddingTop: rs.md }}>{footer}</View> : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dismissLayer: {
    zIndex: 0,
  },
  avoid: {
    width: '100%',
    flex: 1,
    justifyContent: 'flex-end',
    zIndex: 1,
  },
  sheet: {
    width: '100%',
    overflow: 'hidden',
    borderCurve: 'continuous',
    zIndex: 2,
  },
  header: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerCopy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  eyebrow: {
    ...appTextStyle('overline'),
    letterSpacing: 2.4,
  },
  title: {
    ...appTextStyle('title'),
    letterSpacing: -1.1,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    minWidth: 0,
  },
  subtitle: {
    ...appTextStyle('body'),
  },
  close: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
    boxShadow: '0 5px 14px rgba(51, 39, 28, 0.15)',
  },
  scroll: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
  },
  content: {
    flexGrow: 0,
  },
});
