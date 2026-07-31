import { BlurView } from 'expo-blur';
import { useCallback, useEffect } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { create } from 'zustand';

import { borders, layout, radii, spacing, typography } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';

import { AppText } from './app-text';
import { Symbol } from './symbol';

type PromptActionStyle = 'default' | 'cancel' | 'destructive';

interface PromptAction {
  text: string;
  onPress?: () => void;
  style?: PromptActionStyle;
  disabled?: boolean;
}

interface PromptRequest {
  id: number;
  title: string;
  message?: string;
  actions: PromptAction[];
  cancelable: boolean;
  onDismiss?: () => void;
}

interface PromptState {
  request: PromptRequest | null;
  show: (request: PromptRequest) => void;
  dismiss: () => void;
}

interface AppAlertOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
}

interface AppActionSheetOptions {
  title?: string;
  message?: string;
  options: string[];
  cancelButtonIndex?: number;
  destructiveButtonIndex?: number | number[];
  disabledButtonIndices?: number[];
}

const useAppPrompt = create<PromptState>((set) => ({
  request: null,
  show: (request) => set({ request }),
  dismiss: () => set({ request: null }),
}));

let nextPromptId = 0;

function showPrompt(
  request: Omit<PromptRequest, 'id'>,
) {
  nextPromptId += 1;
  useAppPrompt.getState().show({ ...request, id: nextPromptId });
}

export const appPrompt = {
  alert(
    title: string,
    message?: string,
    actions?: PromptAction[],
    options?: AppAlertOptions,
  ) {
    const resolvedActions =
      actions && actions.length > 0 ? actions : [{ text: 'OK' }];
    showPrompt({
      title,
      message,
      actions: resolvedActions,
      cancelable:
        options?.cancelable === true ||
        resolvedActions.some((action) => action.style === 'cancel'),
      onDismiss: options?.onDismiss,
    });
  },

  actionSheet(
    options: AppActionSheetOptions,
    callback: (buttonIndex: number) => void,
  ) {
    const destructiveIndices = new Set(
      Array.isArray(options.destructiveButtonIndex)
        ? options.destructiveButtonIndex
        : options.destructiveButtonIndex === undefined
          ? []
          : [options.destructiveButtonIndex],
    );
    const disabledIndices = new Set(options.disabledButtonIndices ?? []);
    showPrompt({
      title: options.title ?? 'Choose an Option',
      message: options.message,
      actions: options.options.map((text, index) => ({
        text,
        disabled: disabledIndices.has(index),
        style:
          index === options.cancelButtonIndex
            ? 'cancel'
            : destructiveIndices.has(index)
              ? 'destructive'
              : 'default',
        onPress: () => callback(index),
      })),
      cancelable: options.cancelButtonIndex !== undefined,
    });
  },

  dismiss() {
    useAppPrompt.getState().dismiss();
  },
};

export function AppPromptHost() {
  const theme = useTheme();
  const request = useAppPrompt((state) => state.request);
  const dismiss = useAppPrompt((state) => state.dismiss);

  const close = (action?: PromptAction) => {
    dismiss();
    action?.onPress?.();
  };

  const cancel = useCallback(() => {
    if (!request?.cancelable) return;
    const cancelAction = request.actions.find(
      (action) => action.style === 'cancel',
    );
    dismiss();
    cancelAction?.onPress?.();
    request.onDismiss?.();
  }, [dismiss, request]);

  useEffect(() => {
    if (!request) return;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (!request.cancelable) return true;
        cancel();
        return true;
      },
    );
    return () => subscription.remove();
  }, [cancel, request]);

  if (!request) return null;

  const visibleActions = request.actions.filter(
    (action) => action.style !== 'cancel',
  );

  return (
    <Animated.View
      key={request.id}
      accessibilityViewIsModal
      entering={FadeIn.duration(170)}
      pointerEvents="box-none"
      style={styles.overlay}>
      <BlurView
        intensity={18}
        tint={theme.name === 'dark' ? 'dark' : 'light'}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
      <Pressable
        accessibilityLabel={
          request.cancelable ? 'Dismiss prompt' : undefined
        }
        disabled={!request.cancelable}
        onPress={cancel}
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.overlayScrim },
        ]}
      />
      <Animated.View
        entering={FadeInDown.springify().damping(20).stiffness(220)}
        style={[
          styles.card,
          {
            backgroundColor: theme.backgroundElevated,
            borderColor: theme.separator,
            boxShadow:
              theme.name === 'dark'
                ? '0 18px 50px rgba(0, 0, 0, 0.48)'
                : '0 18px 50px rgba(54, 43, 33, 0.22)',
          },
        ]}>
        {request.cancelable ? (
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            hitSlop={8}
            onPress={cancel}
            style={({ pressed }) => [
              styles.closeButton,
              {
                backgroundColor: theme.backgroundSunken,
                opacity: pressed ? 0.58 : 1,
                transform: [{ scale: pressed ? 0.94 : 1 }],
              },
            ]}>
            <Symbol name="close" size={16} color={theme.textSecondary} />
          </Pressable>
        ) : null}
        <View
          style={[
            styles.brandMark,
            { backgroundColor: theme.accentFaint },
          ]}>
          <Symbol name="smart" size={20} color={theme.accentPrimary} />
        </View>
        <View style={styles.copy}>
          <AppText
            accessibilityRole="header"
            style={styles.title}>
            {request.title}
          </AppText>
          {request.message ? (
            <AppText
              selectable
              color="secondary"
              style={styles.message}>
              {request.message}
            </AppText>
          ) : null}
        </View>
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.actions}
          showsVerticalScrollIndicator={false}>
          {visibleActions.map((action, index) => {
            const destructive = action.style === 'destructive';
            const foreground = destructive
              ? theme.danger
              : theme.textPrimary;
            return (
              <Pressable
                key={`${action.text}-${index}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: action.disabled }}
                disabled={action.disabled}
                onPress={() => close(action)}
                style={({ pressed }) => [
                  styles.action,
                  {
                    backgroundColor: destructive
                      ? theme.name === 'dark'
                        ? '#3A2020'
                        : '#F8E8E5'
                      : theme.backgroundSunken,
                    borderColor: 'transparent',
                    opacity: action.disabled
                      ? 0.38
                      : pressed
                        ? 0.62
                        : 1,
                    transform: [{ scale: pressed ? 0.985 : 1 }],
                  },
                ]}>
                <AppText style={[styles.actionLabel, { color: foreground }]}>
                  {action.text}
                </AppText>
                <Symbol
                  name={destructive ? 'delete' : 'chevron-right'}
                  size={17}
                  color={foreground}
                />
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.xl,
  },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: 430,
    maxHeight: '88%',
    gap: spacing.lg,
    padding: spacing.xl,
    borderWidth: borders.hairline,
    borderRadius: 28,
    borderCurve: 'continuous',
  },
  closeButton: {
    position: 'absolute',
    zIndex: 1,
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  brandMark: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: radii.pill,
  },
  copy: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.title,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.sm,
  },
  action: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: borders.hairline,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
  },
  actionLabel: {
    ...typography.callout,
    flex: 1,
    fontWeight: '600',
  },
});
