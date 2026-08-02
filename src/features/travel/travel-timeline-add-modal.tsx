import { BlurView } from 'expo-blur';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Symbol } from '@/components/primitives';
import { fontFamilies, radii } from '@/design-system';
import {
  kindBorder,
  kindChrome,
  kindIcon,
} from '@/features/travel/travel-kind-chrome';
import type { TravelItemKind } from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/utils/haptics';

type TimelineChoice = {
  kind: TravelItemKind;
  label: string;
  description: string;
};

const TIMELINE_CHOICES: TimelineChoice[] = [
  {
    kind: 'moment',
    label: 'Moment',
    description: 'Capture a memory or highlight from your trip.',
  },
  {
    kind: 'activity',
    label: 'Activity',
    description: 'Add activities, tours, or things you plan to do.',
  },
  {
    kind: 'flight',
    label: 'Flight',
    description: 'Add your flight details and travel information.',
  },
  {
    kind: 'stay',
    label: 'Stay',
    description: 'Add your hotel, hostel, or accommodation.',
  },
  {
    kind: 'rental',
    label: 'Rental',
    description: 'Add your rental car or transportation details.',
  },
];

export function TravelTimelineAddModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (kind: TravelItemKind) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { s, ms, spacing: rs } = useResponsive();
  const light = theme.name === 'light';
  const closeSize = Math.max(44, s(44));
  const iconSize = Math.max(46, s(48));
  const brandSize = Math.max(44, s(46));

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}>
      <View
        style={[
          styles.modalRoot,
          {
            paddingTop: Math.max(insets.top, rs.md),
          },
        ]}>
        <BlurView
          intensity={light ? 24 : 18}
          tint={light ? 'light' : 'dark'}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
        <Pressable
          accessibilityLabel="Close add to timeline"
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: theme.overlayScrim }]}
        />

        <View
          accessibilityViewIsModal
          style={[
            styles.card,
            {
              backgroundColor: light ? '#FFFDFC' : '#171513',
              borderColor: light ? 'rgba(95, 72, 47, 0.10)' : 'rgba(255,255,255,0.08)',
              borderTopLeftRadius: Math.max(radii.xl, s(28)),
              borderTopRightRadius: Math.max(radii.xl, s(28)),
              paddingHorizontal: rs.lg,
              boxShadow: light
                ? '0 22px 54px rgba(49, 39, 29, 0.24)'
                : '0 22px 54px rgba(0, 0, 0, 0.52)',
            },
          ]}>
          <ScrollView
            bounces={false}
            contentContainerStyle={[
              styles.content,
              {
                gap: rs.sm,
                paddingTop: rs.md,
                paddingBottom: Math.max(insets.bottom, rs.lg),
              },
            ]}
            showsVerticalScrollIndicator={false}>
            <View
              style={[
                styles.header,
                { gap: rs.xs, paddingHorizontal: closeSize + rs.md },
              ]}>
              <View
                style={[
                  styles.brandMark,
                  {
                    width: brandSize,
                    height: brandSize,
                    borderRadius: brandSize / 2,
                    borderColor: light ? '#C99645' : '#C5A06B',
                  },
                ]}>
                <Symbol
                  name="smart"
                  size={Math.max(20, s(22))}
                  color={light ? '#B27C2F' : '#D8B77F'}
                />
              </View>
              <AppText
                align="center"
                fit
                numberOfLines={1}
                style={[
                  styles.title,
                  {
                    color: light ? '#241C17' : '#F2E9DF',
                    fontSize: Math.max(30, s(32)),
                    lineHeight: Math.max(36, s(38)),
                  },
                ]}>
                Add to Timeline
              </AppText>
              <AppText
                align="center"
                fit
                numberOfLines={1}
                style={[
                  styles.subtitle,
                  {
                    color: light ? '#81766C' : '#A99D91',
                    fontSize: Math.max(14, s(15)),
                    lineHeight: Math.max(19, s(20)),
                  },
                ]}>
                Choose what you’d like to add.
              </AppText>
            </View>

            <Pressable
              accessibilityLabel="Close add to timeline"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                haptics.tap();
                onClose();
              }}
              style={({ pressed }) => [
                styles.close,
                {
                  top: rs.md,
                  right: rs.lg,
                  width: closeSize,
                  height: closeSize,
                  borderRadius: closeSize / 2,
                  backgroundColor: light ? '#F2EDE6' : '#292520',
                  opacity: pressed ? 0.68 : 1,
                },
              ]}>
              <Symbol
                name="close"
                size={Math.max(19, s(20))}
                color={light ? '#60472F' : '#D8C4AE'}
              />
            </Pressable>

            <View style={{ gap: rs.xs, paddingTop: rs.sm }}>
              {TIMELINE_CHOICES.map((choice) => {
                const colors = kindChrome(choice.kind, theme);
                return (
                  <Pressable
                    accessibilityHint={`Opens the add ${choice.label.toLowerCase()} form`}
                    accessibilityLabel={choice.label}
                    accessibilityRole="button"
                    key={choice.kind}
                    onPress={() => {
                      haptics.select();
                      onSelect(choice.kind);
                    }}
                    style={({ pressed }) => [
                      styles.choice,
                      {
                        minHeight: Math.max(72, s(76)),
                        gap: rs.md,
                        paddingHorizontal: rs.md,
                        paddingVertical: rs.sm,
                        borderColor: kindBorder(choice.kind, theme),
                        backgroundColor: pressed
                          ? colors.tint
                          : light
                            ? '#FFFEFC'
                            : '#1B1917',
                        borderRadius: Math.max(radii.lg, s(16)),
                        transform: [{ scale: pressed ? 0.99 : 1 }],
                      },
                    ]}>
                    <View
                      style={[
                        styles.choiceIcon,
                        {
                          width: iconSize,
                          height: iconSize,
                          borderRadius: iconSize / 2,
                          backgroundColor: colors.tint,
                        },
                      ]}>
                      <Symbol
                        name={kindIcon(choice.kind)}
                        size={Math.max(23, s(25))}
                        color={colors.accent}
                      />
                    </View>
                    <View style={[styles.choiceCopy, { gap: ms(3) }]}>
                      <AppText
                        fit
                        numberOfLines={1}
                        style={[
                          styles.choiceTitle,
                          {
                            color: light ? '#251D18' : '#F1E8DF',
                            fontSize: Math.max(18, s(20)),
                            lineHeight: Math.max(23, s(25)),
                          },
                        ]}>
                        {choice.label}
                      </AppText>
                      <AppText
                        numberOfLines={2}
                        style={[
                          styles.choiceDescription,
                          {
                            color: light ? '#6F6861' : '#AAA097',
                            fontSize: Math.max(12.5, s(13.5)),
                            lineHeight: Math.max(17, s(18)),
                          },
                        ]}>
                        {choice.description}
                      </AppText>
                    </View>
                    <Symbol
                      name="chevron-right"
                      size={Math.max(18, s(19))}
                      color={colors.accent}
                    />
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  card: {
    width: '100%',
    maxHeight: '88%',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
  },
  content: {
    flexGrow: 0,
  },
  header: {
    alignItems: 'center',
  },
  brandMark: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  title: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
  },
  close: {
    position: 'absolute',
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
  },
  choice: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  choiceIcon: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceCopy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  choiceTitle: {
    fontFamily: fontFamilies.serif,
    fontWeight: '500',
  },
  choiceDescription: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
  },
});
