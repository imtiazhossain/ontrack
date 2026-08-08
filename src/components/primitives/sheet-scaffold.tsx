import { BlurView } from 'expo-blur';
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
import Animated, {
    FadeIn,
    ReduceMotion,
    SlideInDown,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { glassMaterials, motion, radii, springs, type AppIconName } from '@/design-system';
import { usePerformanceTier } from '@/hooks/use-performance-tier';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

import { AppPromptHost } from './app-prompt';
import { ScreenAtmosphere } from './screen-atmosphere';
import { ScreenHeader } from './screen-header';

export interface SheetHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  subtitleIcon?: AppIconName;
  decoration?: ReactNode;
  onClose: () => void;
  closeAccessibilityLabel?: string;
  closeTestID?: string;
  closeAppearance?: 'solid' | 'glass';
  style?: StyleProp<ViewStyle>;
}

export function SheetHeader({
  eyebrow,
  title,
  subtitle,
  subtitleIcon,
  decoration,
  onClose,
  closeAccessibilityLabel = 'Close',
  closeTestID,
  closeAppearance = 'glass',
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
      decoration={decoration}
      onClose={close}
      closeAccessibilityLabel={closeAccessibilityLabel}
      closeTestID={closeTestID}
      closeAppearance={closeAppearance}
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
  decoration?: ReactNode;
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
  /**
   * `glass` = frosted translucent plate (app default).
   * Pass `solid` for dense editors that need opaque elevated paper.
   */
  surface?: 'solid' | 'glass';
}

/** Canonical modal sheet: safe areas, neutral X, scroll body, and fixed footer. */
export function SheetScaffold({
  visible,
  eyebrow,
  title,
  subtitle,
  subtitleIcon,
  decoration,
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
  surface = 'glass',
  children,
}: SheetScaffoldProps) {
  const theme = useTheme();
  const { allowsBlur } = usePerformanceTier();
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
  const glass = surface === 'glass';
  const dark = theme.name === 'dark';
  // Safe-area pad lives on the footer/body — never on the sheet chrome — so the
  // glass/solid plate paints flush to the physical bottom (Android especially).
  const bottomPad = Math.max(insets.bottom, spacing.md);

  useEffect(() => {
    if (!visible) {
      setLockedHeight(undefined);
      return;
    }
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [scrollKey, title, visible]);

  // Dismiss unmounts immediately — holding a Modal for exit anim traps touches
  // and makes the next navigation feel stuck under an invisible overlay.
  if (!visible) return null;

  const close = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={close}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      transparent
      visible>
      <View accessibilityViewIsModal style={styles.modalRoot}>
        {/*
          Scrim fades in place; card rises from below. Native Modal slide
          would drag the dim with the sheet. (Reanimated: SlideInDown =
          start below viewport → settle at target.)
        */}
        <Animated.View
          entering={FadeIn.duration(motion.fade).reduceMotion(
            ReduceMotion.System,
          )}
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.overlayScrim },
          ]}
        />
        {/*
          Soft chroma wash under glass sheets so BlurView / frosted CTAs catch
          color instead of milking a flat dim scrim into opaque beige paper.
        */}
        {glass ? (
          <View pointerEvents="none" style={styles.atmosphereUnderlay}>
            <ScreenAtmosphere />
          </View>
        ) : null}
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
          style={[styles.avoid, { paddingTop: insets.top }]}>
          <Animated.View
            entering={SlideInDown.springify()
              .damping(springs.sheet.damping)
              .stiffness(springs.sheet.stiffness)
              .mass(springs.sheet.mass)
              .overshootClamping(1)
              .reduceMotion(ReduceMotion.System)}
            onLayout={(event) => {
              if (!lockHeight || lockedHeight != null) return;
              const next = Math.round(event.nativeEvent.layout.height);
              if (next > 0) setLockedHeight(next);
            }}
            pointerEvents="auto"
            style={[
              styles.sheet,
              glass ? styles.sheetGlass : null,
              {
                backgroundColor: glass
                  ? 'transparent'
                  : theme.backgroundElevated,
                borderColor: glass
                  ? dark
                    ? glassMaterials.border.darkStrong
                    : glassMaterials.border.lightStrong
                  : 'transparent',
                maxHeight: sheetMaxHeight,
                minHeight: sheetMinHeight,
                height: lockHeight ? lockedHeight : undefined,
                paddingHorizontal: layout.screenPadding,
              },
            ]}>
            {/*
              Glass underlay is a Fabric sibling of header/body — never wrap
              remounting chrome inside BlurView (unmountChildComponentView).
              Always mount BlurView when glass (intensity 0 when blur gated).
            */}
            {glass ? (
              Platform.OS === 'android' ? (
                <View
                  pointerEvents="none"
                  style={[
                    StyleSheet.absoluteFill,
                    dark
                      ? styles.androidGlassDark
                      : styles.androidGlassLight,
                  ]}
                />
              ) : (
                <>
                  <BlurView
                    intensity={allowsBlur ? 64 : 0}
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
                            ? glassMaterials.sheet.darkFillBlur
                            : glassMaterials.sheet.darkFillSolid
                          : allowsBlur
                            ? glassMaterials.sheet.lightFillBlur
                            : glassMaterials.sheet.lightFillSolid,
                      },
                    ]}
                  />
                </>
              )
            ) : null}
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
                decoration={decoration}
                onClose={close}
                closeAccessibilityLabel={closeAccessibilityLabel}
                closeTestID={closeTestID}
                closeAppearance={glass ? 'glass' : 'solid'}
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
                {
                  gap: spacing.lg,
                  paddingBottom: footer ? spacing.md : bottomPad,
                },
                contentContainerStyle,
              ]}>
              {children}
            </ScrollView>
            {footer ? (
              <View style={{ paddingTop: spacing.md, paddingBottom: bottomPad }}>
                {footer}
              </View>
            ) : null}
          </Animated.View>
        </KeyboardAvoidingView>
        <AppPromptHost embedded />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  atmosphereUnderlay: {
    ...StyleSheet.absoluteFill,
    opacity: 0.55,
  },
  dismissLayer: { zIndex: 0 },
  avoid: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    // Absolute bottom pin — flex-end alone can leave a gap on Android when the
    // dialog window / nav-bar insets disagree with Yoga.
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  sheetGlass: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  /** Dense frosted plate — readable form chrome over the dim scrim. */
  androidGlassLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    experimental_backgroundImage:
      'linear-gradient(165deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.48) 48%, rgba(255,255,255,0.64) 100%)',
  },
  androidGlassDark: {
    backgroundColor: 'rgba(12, 16, 24, 0.52)',
    experimental_backgroundImage:
      'linear-gradient(165deg, rgba(36,42,54,0.62) 0%, rgba(12,16,24,0.48) 50%, rgba(8,12,18,0.58) 100%)',
  },
  scroll: { flexShrink: 1 },
  content: { flexGrow: 1 },
});
