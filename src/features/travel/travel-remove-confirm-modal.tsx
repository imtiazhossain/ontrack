import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AppText, Symbol } from '@/components/primitives';
import { TRAVEL_CARD_SHADOW } from '@/features/travel/travel-surface';
import {
  TravelDialogDiamondRule,
  TravelDialogSparkleBadge,
  travelDialogPalette,
  travelDialogTextStyles,
} from '@/features/travel/travel-dialog-chrome';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentTestId, AgentUiIds } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';

export type TravelRemoveConfirmPayload = {
  title: string;
  message: string;
  /** Defaults to “Remove Item”. */
  actionLabel?: string;
  onConfirm: () => void;
};

type TravelRemoveConfirmModalProps = {
  payload: TravelRemoveConfirmPayload | null;
  onCancel: () => void;
  disableBackdropDismiss?: boolean;
};

/** Cream travel dialog for remove / delete confirms (itinerary, trip, friends, notes, expenses). */
export function TravelRemoveConfirmModal({
  payload,
  onCancel,
  disableBackdropDismiss = false,
}: TravelRemoveConfirmModalProps) {
  const theme = useTheme();
  const palette = travelDialogPalette(theme);
  const { s, spacing: rs, typography, layout } = useResponsive();
  const visible = payload != null;

  const actionLabel = payload?.actionLabel ?? 'Remove Item';
  const buttonMinHeight = Math.max(layout.minTapTarget, s(50));
  const buttonRadius = Math.max(16, s(18));
  const closeSize = Math.max(36, s(38));

  const dismiss = () => {
    haptics.tap();
    onCancel();
  };

  const confirm = () => {
    if (!payload) return;
    haptics.tap();
    const { onConfirm } = payload;
    onCancel();
    onConfirm();
  };

  if (!visible || !payload) {
    return null;
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onCancel}>
      <Animated.View
        accessibilityViewIsModal
        entering={FadeIn.duration(170)}
        pointerEvents="box-none"
        style={[styles.overlay, { backgroundColor: theme.overlayScrim }]}>
        <AgentTestId
          testID={AgentUiIds.travel.removeConfirm.dismiss}
          label="Dismiss"
          onPress={disableBackdropDismiss ? undefined : onCancel}
          style={StyleSheet.absoluteFill}>
          <Pressable
            accessibilityLabel="Dismiss"
            onPress={disableBackdropDismiss ? undefined : onCancel}
            style={StyleSheet.absoluteFill}
          />
        </AgentTestId>

        <Animated.View
          entering={FadeInDown.springify().damping(20).stiffness(220)}
          style={[
            styles.card,
            {
              backgroundColor: palette.cardBg,
              borderColor: palette.borderColor,
              borderRadius: Math.max(22, s(26)),
              paddingHorizontal: Math.max(22, rs.lg + 2),
              paddingTop: Math.max(28, rs.lg + 6),
              paddingBottom: Math.max(18, rs.md + 2),
              gap: Math.max(14, rs.md),
              maxWidth: Math.min(340, s(320)),
              boxShadow: palette.light ? TRAVEL_CARD_SHADOW : undefined,
            },
          ]}>
          <AgentTestId
            testID={AgentUiIds.travel.removeConfirm.close}
            label="Close"
            onPress={dismiss}
            style={styles.close}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
              onPress={dismiss}
              style={({ pressed }) => [
                {
                  width: closeSize,
                  height: closeSize,
                  borderRadius: closeSize / 2,
                  borderWidth: StyleSheet.hairlineWidth * 2,
                  borderColor: palette.outlineBorder,
                  backgroundColor: palette.closeBg,
                  opacity: pressed ? 0.7 : 1,
                  top: Math.max(12, rs.sm),
                  right: Math.max(12, rs.sm),
                },
              ]}>
              <Symbol name="close" size={Math.max(16, s(17))} color={palette.closeFg} />
            </Pressable>
          </AgentTestId>

          <View style={[styles.content, { gap: Math.max(12, rs.sm + 2) }]}>
            <TravelDialogSparkleBadge color={palette.badgeFg} bg={palette.badgeBg} />

            <AppText
              fit
              numberOfLines={2}
              style={[
                travelDialogTextStyles.heading,
                {
                  color: palette.chrome.title,
                  fontSize: Math.max(24, s(26)),
                  lineHeight: Math.max(30, s(32)),
                  paddingHorizontal: closeSize * 0.35,
                },
              ]}>
              {payload.title}
            </AppText>

            <TravelDialogDiamondRule line={palette.ruleColor} diamond={palette.diamondColor} />

            <AppText
              style={[
                travelDialogTextStyles.message,
                {
                  color: palette.chrome.subtitle,
                  fontSize: Math.max(15, typography.body.fontSize),
                  lineHeight: Math.max(21, typography.body.lineHeight),
                },
              ]}>
              {payload.message}
            </AppText>

            <View
              style={[
                styles.buttonStack,
                { gap: Math.max(10, rs.sm), marginTop: Math.max(4, s(4)) },
              ]}>
              <AgentTestId
                testID={AgentUiIds.travel.removeConfirm.cancel}
                label="Cancel"
                onPress={dismiss}
                style={styles.outlineButton}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  onPress={dismiss}
                  style={({ pressed }) => [
                    {
                      minHeight: buttonMinHeight,
                      borderRadius: buttonRadius,
                      borderWidth: StyleSheet.hairlineWidth * 2,
                      borderColor: palette.outlineBorder,
                      backgroundColor: palette.outlineBg,
                      paddingHorizontal: rs.lg,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}>
                  <AppText
                    fit
                    numberOfLines={1}
                    style={[
                      travelDialogTextStyles.buttonLabel,
                      {
                        color: palette.cancelText,
                        fontSize: typography.callout.fontSize,
                        width: '100%',
                      },
                    ]}>
                    Cancel
                  </AppText>
                </Pressable>
              </AgentTestId>

              <AgentTestId
                testID={AgentUiIds.travel.removeConfirm.confirm}
                label={actionLabel}
                onPress={confirm}
                style={styles.dangerButton}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={actionLabel}
                  onPress={confirm}
                  style={({ pressed }) => [
                    {
                      minHeight: buttonMinHeight,
                      borderRadius: buttonRadius,
                      borderWidth: StyleSheet.hairlineWidth * 2,
                      backgroundColor: palette.dangerFrom,
                      borderColor: palette.dangerTo,
                      paddingHorizontal: rs.lg,
                      gap: Math.max(8, rs.sm),
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}>
                  <AppText
                    fit
                    numberOfLines={1}
                    style={[
                      travelDialogTextStyles.buttonLabel,
                      {
                        color: palette.dangerText,
                        fontSize: typography.callout.fontSize,
                        width: '100%',
                      },
                    ]}>
                    {actionLabel}
                  </AppText>
                </Pressable>
              </AgentTestId>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  close: {
    position: 'absolute',
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    zIndex: 1,
  },
  buttonStack: {
    alignSelf: 'stretch',
    width: '100%',
    alignItems: 'center',
  },
  outlineButton: {
    alignSelf: 'stretch',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButton: {
    alignSelf: 'stretch',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
