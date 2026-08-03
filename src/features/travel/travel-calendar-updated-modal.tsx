import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AppText, Symbol } from '@/components/primitives';
import { fontFamilies, radii } from '@/design-system';
import { itinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';
import { TRAVEL_CARD_SHADOW, travelPageBg } from '@/features/travel/travel-surface';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds, useAgentUiTarget } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';

export type TravelCalendarUpdatedPayload = {
  title: string;
  eventCount: number;
  startDate: string;
};

type TravelCalendarUpdatedModalProps = {
  payload: TravelCalendarUpdatedPayload | null;
  onGoToCalendar: (startDate: string) => void;
  onBackToTravel: () => void;
};

function MountainWatermark({ color }: { color: string }) {
  const { s } = useResponsive();
  const height = Math.max(64, s(76));

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.mountainWrap, { height }]}>
      <Svg width="100%" height={height} viewBox="0 0 320 76" preserveAspectRatio="xMaxYMax meet">
        <Path
          d="M120 62 C148 54 162 34 186 38 C210 42 222 22 248 28 C274 34 288 18 320 26 L320 76 L120 76 Z"
          fill={color}
          opacity={0.12}
        />
        <Path
          d="M130 66 C156 58 172 40 198 44 C224 48 240 30 268 36 C292 41 308 50 320 54"
          stroke={color}
          strokeWidth={1.1}
          fill="none"
          opacity={0.28}
        />
        <Path
          d="M140 70 C164 58 182 40 206 46 C230 52 246 34 274 42 C294 48 310 56 320 58"
          stroke={color}
          strokeWidth={0.9}
          fill="none"
          opacity={0.18}
        />
      </Svg>
    </View>
  );
}

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

/** Success dialog after Add to Calendar — cream card, gold CTAs, travel watermark. */
export function TravelCalendarUpdatedModal({
  payload,
  onGoToCalendar,
  onBackToTravel,
}: TravelCalendarUpdatedModalProps) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { s, spacing: rs, typography, layout } = useResponsive();
  const light = theme.name === 'light';
  const visible = payload != null;

  const cardBg = light ? '#FDF8F2' : chrome.fieldBg;
  const borderColor = light ? 'rgba(180, 140, 90, 0.45)' : chrome.importActionBorder;
  const goldFrom = light ? '#D4A76A' : chrome.ctaFrom;
  const goldTo = light ? '#BB8D50' : chrome.ctaTo;
  const primaryText = light ? '#2D1C13' : chrome.ctaText;
  const outlineBorder = light ? 'rgba(180, 140, 90, 0.55)' : chrome.importActionBorder;
  const mountainColor = light ? '#B8956C' : chrome.subtitle;
  const ruleColor = light ? 'rgba(180, 140, 90, 0.35)' : chrome.fieldBorder;
  const diamondColor = light ? '#C4A06A' : chrome.ctaFrom;
  const badgeBg = light ? 'rgba(212, 167, 106, 0.16)' : chrome.icons.import.bg;
  const badgeFg = light ? '#B8895A' : chrome.ctaFrom;

  const eventLabel =
    payload == null
      ? ''
      : `${payload.eventCount} ${payload.eventCount === 1 ? 'Event' : 'Events'} Added for “${payload.title}”.`;

  const buttonMinHeight = Math.max(layout.minTapTarget, s(50));
  const dismissAgent = useAgentUiTarget(
    visible ? AgentUiIds.travel.calendarUpdated.dismiss : undefined,
    { label: 'Dismiss', onPress: onBackToTravel },
  );
  const goToCalendarAgent = useAgentUiTarget(
    visible ? AgentUiIds.travel.calendarUpdated.goToCalendar : undefined,
    {
      label: 'Go to Calendar',
      onPress: () => {
        if (!payload) return;
        haptics.tap();
        onGoToCalendar(payload.startDate);
      },
    },
  );
  const backToTravelAgent = useAgentUiTarget(
    visible ? AgentUiIds.travel.calendarUpdated.backToTravel : undefined,
    {
      label: 'Back to Travel',
      onPress: () => {
        haptics.tap();
        onBackToTravel();
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
      onRequestClose={onBackToTravel}>
      {payload ? (
        <Animated.View
          accessibilityViewIsModal
          entering={FadeIn.duration(170)}
          pointerEvents="box-none"
          style={[styles.overlay, { backgroundColor: theme.overlayScrim }]}>
          <Pressable
            ref={dismissAgent.ref}
            testID={AgentUiIds.travel.calendarUpdated.dismiss}
            onLayout={dismissAgent.onLayout}
            accessibilityLabel="Dismiss"
            onPress={onBackToTravel}
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
            <MountainWatermark color={mountainColor} />

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
                Calendar Updated
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
                {eventLabel}
              </AppText>

              <View
                style={[
                  styles.buttonStack,
                  { gap: Math.max(10, rs.sm), marginTop: Math.max(4, s(4)) },
                ]}>
                <Pressable
                  ref={goToCalendarAgent.ref}
                  testID={AgentUiIds.travel.calendarUpdated.goToCalendar}
                  onLayout={goToCalendarAgent.onLayout}
                  accessibilityRole="button"
                  accessibilityLabel="Go to Calendar"
                  onPress={() => {
                    haptics.tap();
                    onGoToCalendar(payload.startDate);
                  }}
                  style={({ pressed }) => [
                    styles.buttonShell,
                    { minHeight: buttonMinHeight, opacity: pressed ? 0.88 : 1 },
                  ]}>
                  <LinearGradient
                    colors={[goldFrom, goldTo]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.buttonFill,
                      {
                        minHeight: buttonMinHeight,
                        borderColor: goldTo,
                        paddingHorizontal: rs.lg,
                      },
                    ]}>
                    <AppText
                      fit
                      numberOfLines={1}
                      style={[
                        styles.buttonLabel,
                        {
                          color: primaryText,
                          fontSize: typography.callout.fontSize,
                        },
                      ]}>
                      Go to Calendar
                    </AppText>
                  </LinearGradient>
                </Pressable>

                <Pressable
                  ref={backToTravelAgent.ref}
                  testID={AgentUiIds.travel.calendarUpdated.backToTravel}
                  onLayout={backToTravelAgent.onLayout}
                  accessibilityRole="button"
                  accessibilityLabel="Back to Travel"
                  onPress={() => {
                    haptics.tap();
                    onBackToTravel();
                  }}
                  style={({ pressed }) => [
                    styles.outlineButton,
                    {
                      minHeight: buttonMinHeight,
                      borderColor: outlineBorder,
                      backgroundColor: light ? travelPageBg(theme) : chrome.sheetBg,
                      paddingHorizontal: rs.lg,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}>
                  <AppText
                    fit
                    numberOfLines={1}
                    style={[
                      styles.buttonLabel,
                      {
                        color: chrome.title,
                        fontSize: typography.callout.fontSize,
                      },
                    ]}>
                    Back to Travel
                  </AppText>
                </Pressable>
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
  buttonStack: {
    alignSelf: 'stretch',
    width: '100%',
    alignItems: 'center',
  },
  buttonShell: {
    alignSelf: 'stretch',
    width: '100%',
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  buttonFill: {
    width: '100%',
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButton: {
    alignSelf: 'stretch',
    width: '100%',
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
    textAlign: 'center',
    alignSelf: 'center',
    flexShrink: 1,
    minWidth: 0,
    width: '100%',
  },
  mountainWrap: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: '28%',
    zIndex: 0,
  },
});
