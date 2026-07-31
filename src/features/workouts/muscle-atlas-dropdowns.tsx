import { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Symbol } from '@/components/primitives';
import { radii, shadows, spacing } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/utils/haptics';

import {
  MUSCLE_ATLAS_CATEGORIES,
  MUSCLE_ATLAS_CATEGORY_BY_ID,
  musclesInCategory,
  type MuscleAtlasCategoryId,
  type MuscleAtlasEntry,
} from './muscle-atlas';
import { formatMuscleLabel } from './format-muscle-label';

type OpenMenu = 'category' | 'muscle';

interface Anchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MenuOption {
  id: string;
  label: string;
  selected: boolean;
}

interface MuscleAtlasDropdownsProps {
  categoryId: MuscleAtlasCategoryId;
  muscle: MuscleAtlasEntry;
  onSelectCategory: (categoryId: MuscleAtlasCategoryId) => void;
  onSelectMuscle: (muscle: MuscleAtlasEntry) => void;
}

const ITEM_HEIGHT = 44;
const MENU_MAX_HEIGHT = 280;
const MENU_PADDING = spacing.xs;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function DropdownField({
  label,
  value,
  open,
  onPress,
  fieldRef,
}: {
  label: string;
  value: string;
  open: boolean;
  onPress: () => void;
  fieldRef: React.RefObject<View | null>;
}) {
  const theme = useTheme();
  const { s } = useResponsive();
  return (
    <Pressable
      ref={fieldRef}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityHint="Opens a dropdown to choose another option"
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.field,
        {
          backgroundColor: theme.backgroundElevated,
          borderColor: open ? theme.accentSoft : theme.separator,
          opacity: pressed ? 0.86 : 1,
        },
      ]}>
      <View style={styles.fieldCopy}>
        <AppText
          variant="overline"
          color="tertiary"
          fit
          style={{
            fontSize: s(9),
            lineHeight: s(11),
            letterSpacing: 0.9,
          }}>
          {label}
        </AppText>
        <AppText variant="callout" fit>
          {value}
        </AppText>
      </View>
      <Symbol
        name={open ? 'chevron.up' : 'chevron.down'}
        size="sm"
        color={theme.textTertiary}
      />
    </Pressable>
  );
}

/** Body-part then muscle selectors with anchored scrollable menus. */
export function MuscleAtlasDropdowns({
  categoryId,
  muscle,
  onSelectCategory,
  onSelectMuscle,
}: MuscleAtlasDropdownsProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const categoryRef = useRef<View>(null);
  const muscleRef = useRef<View>(null);
  const [openMenu, setOpenMenu] = useState<OpenMenu>();
  const [anchor, setAnchor] = useState<Anchor>();

  const category = MUSCLE_ATLAS_CATEGORY_BY_ID[categoryId];
  const muscles = musclesInCategory(categoryId);

  const categoryOptions: MenuOption[] = MUSCLE_ATLAS_CATEGORIES.map((item) => ({
    id: item.id,
    label: item.label,
    selected: item.id === categoryId,
  }));
  const muscleOptions: MenuOption[] = muscles.map((item) => ({
    id: item.id,
    label: formatMuscleLabel(item.name),
    selected: item.id === muscle.id,
  }));

  const options = openMenu === 'category' ? categoryOptions : muscleOptions;
  const menuTitle = openMenu === 'category' ? 'Body part' : 'Muscle';

  const contentHeight = options.length * ITEM_HEIGHT + MENU_PADDING * 2;
  const menuHeight = Math.min(MENU_MAX_HEIGHT, contentHeight);
  const menuWidth = anchor
    ? Math.max(anchor.width, 160)
    : Math.min(220, windowWidth - spacing.xl * 2);
  const minimumLeft = insets.left + spacing.md;
  const maximumLeft = Math.max(
    minimumLeft,
    windowWidth - insets.right - spacing.md - menuWidth,
  );
  const menuLeft = anchor
    ? clamp(anchor.x, minimumLeft, maximumLeft)
    : minimumLeft;
  const spaceBelow = anchor
    ? windowHeight - insets.bottom - spacing.md - (anchor.y + anchor.height)
    : 0;
  const openDown = spaceBelow >= Math.min(menuHeight, 160) + spacing.xs;
  const menuTop = anchor
    ? openDown
      ? anchor.y + anchor.height + spacing.xs
      : Math.max(insets.top + spacing.md, anchor.y - menuHeight - spacing.xs)
    : insets.top + spacing.xxxl;

  const close = () => {
    setOpenMenu(undefined);
    setAnchor(undefined);
  };

  const open = (menu: OpenMenu) => {
    haptics.select();
    if (openMenu === menu) {
      close();
      return;
    }
    const target = menu === 'category' ? categoryRef : muscleRef;
    target.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpenMenu(menu);
    });
  };

  const handleSelect = (id: string) => {
    if (openMenu === 'category') {
      if (id !== categoryId) onSelectCategory(id as MuscleAtlasCategoryId);
    } else {
      const next = muscles.find((item) => item.id === id);
      if (next && next.id !== muscle.id) onSelectMuscle(next);
    }
    close();
  };

  return (
    <>
      <View style={styles.row}>
        <View style={styles.flex}>
          <DropdownField
            label="Body part"
            value={category.label}
            open={openMenu === 'category'}
            fieldRef={categoryRef}
            onPress={() => open('category')}
          />
        </View>
        <View style={styles.flex}>
          <DropdownField
            label="Muscle"
            value={formatMuscleLabel(muscle.name)}
            open={openMenu === 'muscle'}
            fieldRef={muscleRef}
            onPress={() => open('muscle')}
          />
        </View>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={close}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        transparent
        visible={Boolean(openMenu && anchor)}>
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            onPress={close}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View
            accessibilityLabel={`${menuTitle} menu`}
            accessibilityViewIsModal
            entering={FadeInDown.duration(160)}
            style={[
              styles.menu,
              shadows.overlay,
              {
                top: menuTop,
                left: menuLeft,
                width: menuWidth,
                maxHeight: menuHeight,
                backgroundColor: theme.backgroundElevated,
                borderColor: theme.separator,
              },
            ]}>
            <ScrollView
              bounces={options.length * ITEM_HEIGHT > MENU_MAX_HEIGHT}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={
                options.length * ITEM_HEIGHT > MENU_MAX_HEIGHT
              }
              style={{ maxHeight: menuHeight - MENU_PADDING * 2 }}>
              {options.map((option) => (
                <Pressable
                  key={option.id}
                  accessibilityRole="menuitem"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected: option.selected }}
                  onPress={() => handleSelect(option.id)}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      backgroundColor:
                        option.selected || pressed
                          ? theme.accentFaint
                          : 'transparent',
                      opacity: pressed ? 0.78 : 1,
                    },
                  ]}>
                  <AppText
                    variant="callout"
                    color={option.selected ? 'accent' : 'primary'}
                    numberOfLines={1}
                    style={styles.optionLabel}>
                    {option.label}
                  </AppText>
                  {option.selected ? (
                    <Symbol name="checkmark" size="sm" color={theme.accentPrimary} />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    zIndex: 2,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  field: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fieldCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  modalRoot: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    paddingVertical: MENU_PADDING,
  },
  option: {
    minHeight: ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  optionLabel: {
    flex: 1,
    minWidth: 0,
  },
});
