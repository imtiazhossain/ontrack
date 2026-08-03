import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AppText, Symbol } from '@/components/primitives';
import { fontFamilies, type AppIconName } from '@/design-system';
import { itinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';
import { TRAVEL_CARD_SHADOW, travelPageBg } from '@/features/travel/travel-surface';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds, useAgentUiTarget } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';

export type TravelAddPhotosModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Defaults to “Add Photos”. */
  title?: string;
  /** Defaults to timeline-entry copy. */
  subtitle?: string;
  onTakePhoto: () => void;
  onChooseFromPhotos: () => void;
  /** Optional third action (e.g. remove trip cover). */
  onRemovePhoto?: () => void;
  removeLabel?: string;
};

function SparkleBadge({ color, bg }: { color: string; bg: string }) {
  const { s } = useResponsive();
  const size = Math.max(40, s(44));

  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
        },
      ]}>
      <Symbol name="smart" size={Math.max(20, s(22))} color={color} />
    </View>
  );
}

function DiamondRule({ line, diamond }: { line: string; diamond: string }) {
  const { s } = useResponsive();
  const diamondSize = Math.max(7, s(8));

  return (
    <View style={[styles.diamondRule, { gap: Math.max(8, s(10)) }]}>
      <View style={[styles.ruleLine, { backgroundColor: line }]} />
      <View
        style={[
          styles.diamond,
          {
            width: diamondSize,
            height: diamondSize,
            backgroundColor: diamond,
          },
        ]}
      />
      <View style={[styles.ruleLine, { backgroundColor: line }]} />
    </View>
  );
}

function PhotoActionRow({
  label,
  icon,
  onPress,
  variant,
  goldFrom,
  goldTo,
  primaryText,
  outlineBorder,
  outlineBg,
  titleColor,
  iconColor,
  minHeight,
  radius,
  testID,
}: {
  label: string;
  icon: AppIconName;
  onPress: () => void;
  variant: 'primary' | 'outline' | 'destructive';
  goldFrom: string;
  goldTo: string;
  primaryText: string;
  outlineBorder: string;
  outlineBg: string;
  titleColor: string;
  iconColor: string;
  minHeight: number;
  radius: number;
  testID?: string;
}) {
  const { s, spacing: rs, typography } = useResponsive();
  const labelColor = variant === 'primary' ? primaryText : titleColor;
  const trailingColor =
    variant === 'primary' ? primaryText : variant === 'destructive' ? titleColor : iconColor;
  const handlePress = () => {
    haptics.tap();
    onPress();
  };
  const agent = useAgentUiTarget(testID, { label, onPress: handlePress });

  const inner = (
    <View
      style={[
        styles.actionInner,
        {
          minHeight,
          paddingHorizontal: rs.md,
          gap: rs.sm,
          borderRadius: radius,
        },
      ]}>
      <Symbol name={icon} size={Math.max(20, s(22))} color={trailingColor} />
      <AppText
        fit
        numberOfLines={1}
        style={[
          styles.actionLabel,
          {
            color: labelColor,
            fontSize: Math.max(17, typography.callout.fontSize),
            lineHeight: Math.max(22, typography.callout.lineHeight),
          },
        ]}>
        {label}
      </AppText>
      <Symbol name="chevron-right" size="sm" color={trailingColor} />
    </View>
  );

  return (
    <Pressable
      ref={agent.ref}
      testID={testID}
      onLayout={agent.onLayout}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.actionShell,
        { borderRadius: radius, opacity: pressed ? 0.88 : 1 },
      ]}>
      {variant === 'primary' ? (
        <LinearGradient
          colors={[goldFrom, goldTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.actionFill,
            {
              borderRadius: radius,
              borderColor: goldTo,
            },
          ]}>
          {inner}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.actionFill,
            {
              borderRadius: radius,
              borderColor: outlineBorder,
              backgroundColor: outlineBg,
            },
          ]}>
          {inner}
        </View>
      )}
    </Pressable>
  );
}

/**
 * Editorial Add Photos / Trip Cover picker — cream card, gold CTAs, diamond rule.
 * Replaces system alerts/action sheets for travel photo flows.
 */
export function TravelAddPhotosModal({
  visible,
  onClose,
  title = 'Add Photos',
  subtitle = 'Attach pictures to this timeline entry.',
  onTakePhoto,
  onChooseFromPhotos,
  onRemovePhoto,
  removeLabel = 'Remove Photo',
}: TravelAddPhotosModalProps) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { s, spacing: rs, typography, layout } = useResponsive();
  const light = theme.name === 'light';

  const cardBg = light ? '#FDF8F2' : chrome.fieldBg;
  const borderColor = light ? 'rgba(180, 140, 90, 0.45)' : chrome.importActionBorder;
  const goldFrom = light ? '#D4A76A' : chrome.ctaFrom;
  const goldTo = light ? '#BB8D50' : chrome.ctaTo;
  const primaryText = light ? '#2D1C13' : chrome.ctaText;
  const outlineBorder = light ? 'rgba(180, 140, 90, 0.55)' : chrome.importActionBorder;
  const ruleColor = light ? 'rgba(180, 140, 90, 0.35)' : chrome.fieldBorder;
  const diamondColor = light ? '#C4A06A' : chrome.ctaFrom;
  const badgeBg = light ? 'rgba(212, 167, 106, 0.16)' : chrome.icons.import.bg;
  const badgeFg = light ? '#B8895A' : chrome.ctaFrom;
  const closeBg = light ? 'rgba(212, 167, 106, 0.14)' : chrome.closeBg;
  const closeFg = light ? '#8A6A45' : chrome.closeIcon;
  const outlineBg = light ? travelPageBg(theme) : chrome.sheetBg;

  const buttonMinHeight = Math.max(layout.minTapTarget, s(52));
  const buttonRadius = Math.max(16, s(18));
  const closeSize = Math.max(36, s(38));

  const runAndClose = (action: () => void) => {
    // Run first so callers can read state/refs before dismiss clears them.
    // Pickers await permissions, so the modal still dismisses before the system UI.
    action();
    onClose();
  };
  const dismissAgent = useAgentUiTarget(
    visible ? AgentUiIds.travel.addPhotos.dismiss : undefined,
    { label: 'Dismiss', onPress: onClose },
  );
  const closeAgent = useAgentUiTarget(
    visible ? AgentUiIds.travel.addPhotos.close : undefined,
    {
      label: 'Close',
      onPress: () => {
        haptics.tap();
        onClose();
      },
    },
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}>
      {visible ? (
        <Animated.View
          accessibilityViewIsModal
          entering={FadeIn.duration(170)}
          pointerEvents="box-none"
          style={[styles.overlay, { backgroundColor: theme.overlayScrim }]}>
          <Pressable
            ref={dismissAgent.ref}
            testID={AgentUiIds.travel.addPhotos.dismiss}
            onLayout={dismissAgent.onLayout}
            accessibilityLabel="Dismiss"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View
            entering={FadeInDown.springify().damping(20).stiffness(220)}
            style={[
              styles.card,
              {
                backgroundColor: cardBg,
                borderColor,
                borderRadius: Math.max(22, s(26)),
                paddingHorizontal: Math.max(22, rs.lg + 2),
                paddingTop: Math.max(22, rs.lg + 2),
                paddingBottom: Math.max(18, rs.md + 2),
                gap: Math.max(14, rs.md),
                maxWidth: Math.min(340, s(320)),
                boxShadow: light ? TRAVEL_CARD_SHADOW : undefined,
              },
            ]}>
            <Pressable
              ref={closeAgent.ref}
              testID={AgentUiIds.travel.addPhotos.close}
              onLayout={closeAgent.onLayout}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
              onPress={() => {
                haptics.tap();
                onClose();
              }}
              style={({ pressed }) => [
                styles.close,
                {
                  width: closeSize,
                  height: closeSize,
                  borderRadius: closeSize / 2,
                  backgroundColor: closeBg,
                  opacity: pressed ? 0.7 : 1,
                  top: Math.max(12, rs.sm),
                  right: Math.max(12, rs.sm),
                },
              ]}>
              <Symbol name="close" size={Math.max(16, s(17))} color={closeFg} />
            </Pressable>

            <View style={[styles.content, { gap: Math.max(12, rs.sm + 2) }]}>
              <SparkleBadge color={badgeFg} bg={badgeBg} />

              <AppText
                fit
                numberOfLines={1}
                style={[
                  styles.heading,
                  {
                    color: chrome.title,
                    fontSize: Math.max(26, s(28)),
                    lineHeight: Math.max(32, s(34)),
                  },
                ]}>
                {title}
              </AppText>

              <DiamondRule line={ruleColor} diamond={diamondColor} />

              <AppText
                style={[
                  styles.message,
                  {
                    color: chrome.subtitle,
                    fontSize: Math.max(15, typography.body.fontSize),
                    lineHeight: Math.max(21, typography.body.lineHeight),
                  },
                ]}>
                {subtitle}
              </AppText>

              <View style={{ gap: Math.max(10, rs.sm), marginTop: Math.max(4, s(4)), width: '100%' }}>
                <PhotoActionRow
                  label="Take Photo"
                  icon="camera"
                  variant="primary"
                  testID={AgentUiIds.travel.addPhotos.takePhoto}
                  onPress={() => runAndClose(onTakePhoto)}
                  goldFrom={goldFrom}
                  goldTo={goldTo}
                  primaryText={primaryText}
                  outlineBorder={outlineBorder}
                  outlineBg={outlineBg}
                  titleColor={chrome.title}
                  iconColor={badgeFg}
                  minHeight={buttonMinHeight}
                  radius={buttonRadius}
                />
                <PhotoActionRow
                  label="Choose from Photos"
                  icon="photo"
                  variant="outline"
                  testID={AgentUiIds.travel.addPhotos.chooseFromPhotos}
                  onPress={() => runAndClose(onChooseFromPhotos)}
                  goldFrom={goldFrom}
                  goldTo={goldTo}
                  primaryText={primaryText}
                  outlineBorder={outlineBorder}
                  outlineBg={outlineBg}
                  titleColor={chrome.title}
                  iconColor={badgeFg}
                  minHeight={buttonMinHeight}
                  radius={buttonRadius}
                />
                {onRemovePhoto ? (
                  <PhotoActionRow
                    label={removeLabel}
                    icon="delete"
                    variant="destructive"
                    testID={AgentUiIds.travel.addPhotos.removePhoto}
                    onPress={() => runAndClose(onRemovePhoto)}
                    goldFrom={goldFrom}
                    goldTo={goldTo}
                    primaryText={primaryText}
                    outlineBorder={light ? 'rgba(160, 90, 70, 0.45)' : 'rgba(220,140,120,0.4)'}
                    outlineBg={light ? 'rgba(180, 90, 70, 0.06)' : 'rgba(180,90,70,0.12)'}
                    titleColor={light ? '#8B3E2F' : '#E0A090'}
                    iconColor={badgeFg}
                    minHeight={buttonMinHeight}
                    radius={buttonRadius}
                  />
                ) : null}
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      ) : null}
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
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: -0.4,
    flexShrink: 1,
    minWidth: 0,
    width: '100%',
  },
  message: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
    textAlign: 'center',
  },
  diamondRule: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '72%',
    maxWidth: 220,
  },
  ruleLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth * 2,
  },
  diamond: {
    transform: [{ rotate: '45deg' }],
    borderRadius: 1,
  },
  actionShell: {
    width: '100%',
    overflow: 'hidden',
  },
  actionFill: {
    width: '100%',
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  actionInner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionLabel: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
    textAlign: 'left',
  },
});
