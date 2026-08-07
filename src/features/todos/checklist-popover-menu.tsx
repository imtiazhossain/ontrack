import { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutUp, ReduceMotion } from 'react-native-reanimated';

import { AppText, IconButton, Symbol } from '@/components/primitives';
import {
  fontFamilies,
  motion,
  radii,
  shadows,
  spacing,
  type AppIconName,
} from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { useAgentUiTarget } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';

export interface ChecklistPopoverItem {
  id: string;
  title: string;
  description?: string;
  icon: AppIconName;
  selected?: boolean;
  destructive?: boolean;
  dividerBefore?: boolean;
}

interface ChecklistPopoverMenuProps {
  title: string;
  accessibilityLabel: string;
  triggerIcon: AppIconName;
  items: ChecklistPopoverItem[];
  onSelect: (id: string) => void;
  testID?: string;
}

interface Anchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

const PANEL_WIDTH = 300;
const PANEL_PADDING = spacing.sm;
const PANEL_HEADER_HEIGHT = 66;
const ITEM_HEIGHT = 64;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function ChecklistPopoverMenu({
  title,
  accessibilityLabel,
  triggerIcon,
  items,
  onSelect,
  testID,
}: ChecklistPopoverMenuProps) {
  const theme = useTheme();
  const { s } = useResponsive();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [anchor, setAnchor] = useState<Anchor>();
  const [visible, setVisible] = useState(false);
  const openRef = useRef<() => void>(() => undefined);

  const panelWidth = Math.min(
    PANEL_WIDTH,
    windowWidth - insets.left - insets.right - spacing.xl * 2,
  );
  const panelHeight =
    PANEL_HEADER_HEIGHT +
    items.length * ITEM_HEIGHT +
    items.filter((item) => item.dividerBefore).length * spacing.md +
    PANEL_PADDING * 2;
  const minimumLeft = insets.left + spacing.lg;
  const maximumLeft = Math.max(
    minimumLeft,
    windowWidth - insets.right - spacing.lg - panelWidth,
  );
  const panelLeft = anchor
    ? clamp(
        anchor.x + anchor.width - panelWidth,
        minimumLeft,
        maximumLeft,
      )
    : maximumLeft;
  const spaceBelow = anchor
    ? windowHeight - insets.bottom - spacing.lg - (anchor.y + anchor.height)
    : 0;
  const panelTop = anchor
    ? spaceBelow >= panelHeight + spacing.sm
      ? anchor.y + anchor.height + spacing.sm
      : Math.max(insets.top + spacing.lg, anchor.y - panelHeight - spacing.sm)
    : insets.top + spacing.xxxl;
  const triggerRef = useRef<View | null>(null);

  const agent = useAgentUiTarget(testID, {
    label: accessibilityLabel,
    onPress: () => openRef.current(),
  });

  const open = () => {
    haptics.select();
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setVisible(true);
    });
  };
  openRef.current = open;

  const close = () => setVisible(false);

  return (
    <>
      <Pressable
        ref={triggerRef}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: visible }}
        testID={agent.testID}
        onLayout={agent.onLayout}
        hitSlop={4}
        onPress={open}
        style={({ pressed }) => [
          styles.trigger,
          {
            backgroundColor: visible
              ? theme.accentFaint
              : theme.backgroundSunken,
            borderColor: visible ? theme.accentSoft : 'transparent',
            opacity: pressed ? 0.72 : 1,
          },
        ]}>
        <Symbol name={triggerIcon} size={16} color={theme.accentPrimary} />
      </Pressable>

      <Modal
        animationType="fade"
        onRequestClose={close}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        transparent
        visible={visible}>
        <View
          style={[
            styles.modalRoot,
            {
              paddingTop: insets.top,
              paddingRight: insets.right,
              paddingBottom: insets.bottom,
              paddingLeft: insets.left,
            },
          ]}>
          <Pressable
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            onPress={close}
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: theme.overlayScrim },
            ]}
          />
          <Animated.View
            accessibilityLabel={`${title} menu`}
            accessibilityViewIsModal
            entering={FadeInDown.duration(motion.fade).reduceMotion(
              ReduceMotion.System,
            )}
            exiting={FadeOutUp.duration(motion.fade).reduceMotion(
              ReduceMotion.System,
            )}
            style={[
              styles.panel,
              shadows.overlay,
              {
                width: panelWidth,
                left: panelLeft,
                top: panelTop,
                backgroundColor: theme.backgroundElevated,
                borderColor: theme.separator,
              },
            ]}>
            <View style={styles.panelHeader}>
              <View style={styles.panelCopy}>
                <AppText variant="overline" color="accent">
                  Checklist
                </AppText>
                <AppText
                  variant="subheading"
                  style={[
                    styles.panelTitle,
                    { fontSize: s(21), lineHeight: s(25) },
                  ]}>
                  {title}
                </AppText>
              </View>
              <IconButton
                icon="close"
                size={36}
                accessibilityLabel="Close menu"
                background={theme.backgroundSunken}
                onPress={close}
              />
            </View>

            <View style={styles.items}>
              {items.map((item) => {
                const itemColor = item.destructive
                  ? theme.danger
                  : item.selected
                    ? theme.textOnAccent
                    : theme.textPrimary;

                return (
                  <View key={item.id}>
                    {item.dividerBefore ? (
                      <View
                        style={[
                          styles.divider,
                          { backgroundColor: theme.separator },
                        ]}
                      />
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={item.title}
                      accessibilityHint={item.description}
                      accessibilityState={{ selected: item.selected }}
                      onPress={() => {
                        close();
                        onSelect(item.id);
                      }}
                      style={({ pressed }) => [
                        styles.item,
                        {
                          backgroundColor:
                            item.selected || pressed
                              ? theme.accentFaint
                              : 'transparent',
                          opacity: pressed ? 0.76 : 1,
                        },
                      ]}>
                      <View
                        style={[
                          styles.itemIcon,
                          {
                            backgroundColor: item.destructive
                              ? `${theme.danger}18`
                              : item.selected
                                ? theme.accentPrimary
                                : theme.backgroundSunken,
                          },
                        ]}>
                        <Symbol name={item.icon} size={17} color={itemColor} />
                      </View>
                      <View style={styles.itemCopy}>
                        <AppText
                          variant="callout"
                          color={item.destructive ? 'danger' : 'primary'}>
                          {item.title}
                        </AppText>
                        {item.description ? (
                          <AppText
                            variant="caption"
                            color="secondary"
                            numberOfLines={1}>
                            {item.description}
                          </AppText>
                        ) : null}
                      </View>
                      {item.selected ? (
                        <View
                          style={[
                            styles.selection,
                            { backgroundColor: theme.accentPrimary },
                          ]}>
                          <Symbol
                            name="check"
                            size={12}
                            color={theme.textOnAccent}
                          />
                        </View>
                      ) : null}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.pill,
  },
  modalRoot: {
    flex: 1,
  },
  panel: {
    position: 'absolute',
    padding: PANEL_PADDING,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.xl,
    borderCurve: 'continuous',
  },
  panelHeader: {
    minHeight: PANEL_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  panelCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
    justifyContent: 'center',
  },
  panelTitle: {
    fontFamily: fontFamilies.serif,
  },
  items: {
    gap: spacing.xxs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  item: {
    minHeight: ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
  },
  itemIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  itemCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  selection: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
});
