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

import { radii, type AppIconName } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

import { AppPromptHost } from './app-prompt';
import { ScreenHeader } from './screen-header';

export interface SheetHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  subtitleIcon?: AppIconName;
  onClose: () => void;
  closeAccessibilityLabel?: string;
  closeTestID?: string;
  style?: StyleProp<ViewStyle>;
}

export function SheetHeader({
  eyebrow,
  title,
  subtitle,
  subtitleIcon,
  onClose,
  closeAccessibilityLabel = 'Close',
  closeTestID,
  style,
}: SheetHeaderProps) {
  const { spacing } = useResponsive();
  const close = () => {
    Keyboard.dismiss();
    onClose();
  };
  return (
    <ScreenHeader
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      subtitleIcon={subtitleIcon}
      onClose={close}
      closeAccessibilityLabel={closeAccessibilityLabel}
      closeTestID={closeTestID}
      style={[{ paddingTop: spacing.md, paddingBottom: spacing.xl }, style]}
    />
  );
}

export interface SheetScaffoldProps extends PropsWithChildren {
  visible: boolean;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  subtitleIcon?: AppIconName;
  onClose: () => void;
  closeAccessibilityLabel?: string;
  closeTestID?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
  maxHeight?: number;
  minHeight?: number;
  lockHeight?: boolean;
  scrollKey?: string | number;
  /** Backdrop dismissal is opt-in; the canonical dismiss action is the header X. */
  dismissOnBackdropPress?: boolean;
  backdropTestID?: string;
}

/** Canonical modal sheet: safe areas, neutral X, scroll body, and fixed footer. */
export function SheetScaffold({
  visible,
  eyebrow,
  title,
  subtitle,
  subtitleIcon,
  onClose,
  closeAccessibilityLabel = 'Close',
  closeTestID,
  contentContainerStyle,
  footer,
  maxHeight,
  minHeight,
  lockHeight = false,
  scrollKey,
  dismissOnBackdropPress = false,
  backdropTestID,
  children,
}: SheetScaffoldProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { spacing, layout } = useResponsive();
  const scrollRef = useRef<ScrollView>(null);
  const [lockedHeight, setLockedHeight] = useState<number>();
  const availableHeight = Math.max(320, windowHeight - insets.top - spacing.sm);
  const sheetMaxHeight =
    maxHeight == null ? Math.round(availableHeight * 0.98) : Math.min(maxHeight, availableHeight);
  const sheetMinHeight =
    minHeight == null ? undefined : Math.min(Math.max(0, minHeight), sheetMaxHeight);

  useEffect(() => {
    if (!visible) {
      setLockedHeight(undefined);
      return;
    }
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [scrollKey, title, visible]);

  if (!visible) return null;

  const close = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={close}
      presentationStyle="overFullScreen"
      transparent
      visible>
      <View
        accessibilityViewIsModal
        style={[styles.modalRoot, { backgroundColor: theme.overlayScrim, paddingTop: insets.top }]}>
        {dismissOnBackdropPress ? (
          <Pressable
            testID={backdropTestID}
            accessibilityRole="button"
            accessibilityLabel={closeAccessibilityLabel}
            onPress={close}
            style={[StyleSheet.absoluteFill, styles.dismissLayer]}
          />
        ) : null}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
          pointerEvents="box-none"
          style={styles.avoid}>
          <View
            onLayout={(event) => {
              if (!lockHeight || lockedHeight != null) return;
              const next = Math.round(event.nativeEvent.layout.height);
              if (next > 0) setLockedHeight(next);
            }}
            pointerEvents="auto"
            style={[
              styles.sheet,
              {
                backgroundColor: theme.backgroundElevated,
                maxHeight: sheetMaxHeight,
                minHeight: sheetMinHeight,
                height: lockHeight ? lockedHeight : undefined,
                paddingBottom: Math.max(insets.bottom, spacing.md),
                paddingHorizontal: layout.screenPadding,
              },
            ]}>
            <View
              onStartShouldSetResponder={() => {
                Keyboard.dismiss();
                return false;
              }}>
              <SheetHeader
                eyebrow={eyebrow}
                title={title}
                subtitle={subtitle}
                subtitleIcon={subtitleIcon}
                onClose={close}
                closeAccessibilityLabel={closeAccessibilityLabel}
                closeTestID={closeTestID}
              />
            </View>
            <ScrollView
              key={scrollKey ?? 'sheet'}
              ref={scrollRef}
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              contentInsetAdjustmentBehavior="never"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.scroll}
              contentContainerStyle={[
                styles.content,
                { gap: spacing.lg, paddingBottom: footer ? spacing.md : spacing.xl },
                contentContainerStyle,
              ]}>
              {children}
            </ScrollView>
            {footer ? <View style={{ paddingTop: spacing.md }}>{footer}</View> : null}
          </View>
        </KeyboardAvoidingView>
        <AppPromptHost embedded />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  dismissLayer: { zIndex: 0 },
  avoid: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    width: '100%',
    alignSelf: 'center',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  scroll: { flexShrink: 1 },
  content: { flexGrow: 1 },
});
