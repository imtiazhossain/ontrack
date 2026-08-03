import { useMemo } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';

import { ProfileAvatar } from '@/features/account/profile-avatar';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/utils/haptics';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type CoTravelerAvatarPerson = {
  id: string;
  name: string;
  /** Current user — always rendered leftmost and on top. */
  isSelf?: boolean;
  /** Auth user id when known (roster / friends). */
  userId?: string;
};

/** Initials for stacked co-traveler chips (e.g. "Farhana Tasmin" → "FT"). */
export function coTravelerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

type TravelCoTravelerStackProps = {
  people: CoTravelerAvatarPerson[];
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  /** Max width for the collapsed/packed row before icons overlap. */
  maxPackedWidth?: number;
};

/**
 * Co-traveler initials for trip card headers.
 * Side-by-side when they fit; overlap only when the row would overflow.
 * All people stay visible (no +N). Tap a packed stack to fan out; tap
 * outside collapses silently without activating other controls.
 */
export function TravelCoTravelerStack({
  people,
  expanded,
  onExpandedChange,
  maxPackedWidth,
}: TravelCoTravelerStackProps) {
  const theme = useTheme();
  const { s, width: layoutWidth } = useResponsive();

  const ordered = useMemo(() => {
    const self = people.find((person) => person.isSelf);
    const others = people.filter((person) => !person.isSelf);
    const uniqueOthers: CoTravelerAvatarPerson[] = [];
    const seen = new Set<string>();
    const selfKey = self?.name.trim().toLowerCase();
    for (const person of others) {
      const key = person.name.trim().toLowerCase();
      if (!key || key === selfKey || seen.has(key) || seen.has(person.id)) continue;
      seen.add(key);
      seen.add(person.id);
      uniqueOthers.push(person);
    }
    return self ? [self, ...uniqueOthers] : uniqueOthers;
  }, [people]);

  if (ordered.length === 0) return null;

  const count = ordered.length;
  const size = Math.max(30, s(32));
  // Resting row fits above header controls; expanded may use more of the card.
  const packBudget = maxPackedWidth ?? Math.round(size * 2.5);
  const expandBudget = Math.max(packBudget, Math.round(layoutWidth * 0.55));
  const flatWidth = size * count;
  const naturalStep = Math.round(size * 0.55);
  const naturalWidth = size + Math.max(0, count - 1) * naturalStep;
  const budget = expanded ? expandBudget : packBudget;
  const needsPack = count > 1 && flatWidth > packBudget;
  const compressed = count > 1 && flatWidth > budget;
  const width = compressed ? Math.min(naturalWidth, budget) : flatWidth;
  // Flat: abut discs (tiny inset kills retina hairline). Packed: even span.
  const step =
    count <= 1
      ? 0
      : compressed
        ? (width - size) / (count - 1)
        : size - 0.5;
  const borderWidth = compressed ? 2 : 0;
  const border = theme.name === 'light' ? '#FFFEFC' : theme.backgroundElevated;
  const hitSize = Math.max(44, size);
  const canToggle = needsPack;

  const toggle = () => {
    if (!canToggle) return;
    haptics.tap();
    onExpandedChange(!expanded);
  };

  /** Outside tap: collapse only — no haptic, swallow the press. */
  const collapseSilent = () => {
    if (!expanded) return;
    onExpandedChange(false);
  };

  return (
    <View style={[styles.wrap, expanded ? styles.wrapRaised : null]}>
      {expanded ? (
        <Modal
          visible
          transparent
          animationType="none"
          statusBarTranslucent
          onRequestClose={collapseSilent}>
          <Pressable
            accessibilityLabel="Collapse co-travelers"
            accessibilityRole="button"
            onPress={collapseSilent}
            style={styles.dismissModal}
          />
        </Modal>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: canToggle ? expanded : undefined }}
        accessibilityLabel={
          !canToggle
            ? `Co-travelers, ${count}`
            : expanded
              ? 'Collapse co-travelers'
              : `Co-travelers, ${count}, expand`
        }
        disabled={!canToggle}
        hitSlop={12}
        onPress={toggle}
        style={({ pressed }) => [
          styles.stack,
          {
            width: Math.max(width, hitSize),
            height: hitSize,
            justifyContent: 'center',
            alignItems: 'flex-end',
            backgroundColor: 'transparent',
            opacity: pressed && canToggle ? 0.85 : 1,
          },
        ]}>
        <View style={{ width, height: size }}>
          {ordered.map((person, index) => (
            <View
              key={person.id}
              pointerEvents="none"
              style={[
                styles.avatar,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  borderColor: border,
                  borderWidth,
                  left: index * step,
                  zIndex: count - index,
                  overflow: 'hidden',
                },
              ]}>
              <ProfileAvatar
                displayName={person.name}
                userId={person.userId}
                isSelf={person.isSelf}
                size={size}
              />
            </View>
          ))}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    flexShrink: 0,
    alignItems: 'flex-end',
    zIndex: 4,
  },
  wrapRaised: {
    zIndex: 30,
  },
  dismissModal: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  stack: {
    position: 'relative',
    zIndex: 1,
    overflow: 'visible',
  },
  avatar: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    textAlign: 'center',
    width: '100%',
    letterSpacing: -0.3,
  },
});
